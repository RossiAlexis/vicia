import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

type TodoContext = "work" | "personal";
type TodoStatus = "open" | "in_progress" | "completed";
type TodoStatusFilter = TodoStatus | "all";

type Todo = {
	id: string;
	text: string;
	context: TodoContext;
	due?: string;
	createdAt: string;
	status: TodoStatus;
	completedAt?: string;
	completed?: boolean;
};

type TodoState = {
	todos: Todo[];
};

// Define our MCP agent with tools
export class ViciaAgent extends McpAgent<Env, TodoState> {
	server = new McpServer({
		name: "Vicia Todo Manager",
		version: "1.0.0",
	});

	initialState: TodoState = {
		todos: [],
	};

	private getTodoState(): TodoState {
		const state = this.state;
		return {
			todos: Array.isArray(state?.todos)
				? state.todos.map((todo) => this.normalizeTodo(todo))
				: [],
		};
	}

	private normalizeTodo(todo: Todo): Todo {
		return {
			...todo,
			status: todo.status ?? (todo.completed ? "completed" : "open"),
		};
	}

	private formatTodo(todo: Todo): string {
		const duePart = todo.due ? ` | due: ${todo.due}` : "";
		return `[${todo.status}] (${todo.context}) ${todo.text} [id: ${todo.id}]${duePart}`;
	}

	private formatTodos(todos: Todo[]): string {
		if (todos.length === 0) {
			return "No todos found.";
		}

		return todos
			.map((todo, index) => `${index + 1}. ${this.formatTodo(todo)}`)
			.join("\n");
	}

	private findTodoMatch(idOrDescription: string): Todo | { error: string } {
		const state = this.getTodoState();
		const query = idOrDescription.trim().toLowerCase();

		const exactIdMatch = state.todos.find((todo) => todo.id === idOrDescription.trim());
		if (exactIdMatch) {
			return exactIdMatch;
		}

		const exactTextMatches = state.todos.filter(
			(todo) => todo.text.toLowerCase() === query,
		);
		if (exactTextMatches.length === 1) {
			return exactTextMatches[0];
		}
		if (exactTextMatches.length > 1) {
			return {
				error: `Multiple todos exactly match that description:\n${this.formatTodos(exactTextMatches)}`,
			};
		}

		const partialTextMatches = state.todos.filter((todo) =>
			todo.text.toLowerCase().includes(query),
		);
		if (partialTextMatches.length === 1) {
			return partialTextMatches[0];
		}
		if (partialTextMatches.length > 1) {
			return {
				error: `Multiple todos match that description:\n${this.formatTodos(partialTextMatches)}`,
			};
		}

		return { error: `No todo found matching "${idOrDescription}".` };
	}

	async init() {
		this.server.registerTool(
			"add_todo",
			{
				inputSchema: {
					text: z.string().min(1),
					context: z.enum(["work", "personal"]),
					due: z.string().optional(),
				},
			},
			async ({ text, context, due }) => {
				const state = this.getTodoState();
				const normalizedText = text.trim();
				const todo: Todo = {
					id: crypto.randomUUID(),
					text: normalizedText,
					context,
					due: due?.trim() ? due.trim() : undefined,
					createdAt: new Date().toISOString(),
					status: "open",
				};

				this.setState({
					...state,
					todos: [...state.todos, todo],
				});

				return {
					content: [
						{
							type: "text",
							text: `Added todo: ${this.formatTodo(todo)}`,
						},
					],
				};
			},
		);

		this.server.registerTool(
			"complete_todo",
			{
				inputSchema: {
					id_or_description: z.string().min(1),
				},
			},
			async ({ id_or_description }) => {
				const match = this.findTodoMatch(id_or_description);
				if ("error" in match) {
					return {
						content: [{ type: "text", text: match.error }],
						isError: true,
					};
				}

				if (match.status === "completed") {
					return {
						content: [
							{
								type: "text",
								text: `Todo is already complete: ${this.formatTodo(match)}`,
							},
						],
					};
				}

				const state = this.getTodoState();
				const completedTodo: Todo = {
					...match,
					status: "completed",
					completedAt: new Date().toISOString(),
				};
				this.setState({
					...state,
					todos: state.todos.map((todo) =>
						todo.id === match.id ? completedTodo : todo,
					),
				});

				return {
					content: [
						{
							type: "text",
							text: `Completed todo: ${this.formatTodo(completedTodo)}`,
						},
					],
				};
			},
		);

		this.server.registerTool(
			"query_todos",
			{
				inputSchema: {
					filter: z
						.object({
							context: z.enum(["work", "personal"]).optional(),
							status: z
								.enum(["open", "in_progress", "completed", "all"])
								.optional(),
							due: z.string().optional(),
						})
						.optional(),
				},
			},
			async ({ filter }) => {
				const state = this.getTodoState();
				const status: TodoStatusFilter = filter?.status ?? "open";
				const filteredTodos = state.todos.filter((todo) => {
					if (filter?.context && todo.context !== filter.context) {
						return false;
					}
					if (status !== "all" && todo.status !== status) {
						return false;
					}
					if (filter?.due && todo.due !== filter.due) {
						return false;
					}
					return true;
				});

				return {
					content: [{ type: "text", text: this.formatTodos(filteredTodos) }],
				};
			},
		);

		this.server.registerTool(
			"update_status",
			{
				inputSchema: {
					id_or_description: z.string().min(1),
					status: z.enum(["open", "in_progress", "completed"]),
				},
			},
			async ({ id_or_description, status }) => {
				const match = this.findTodoMatch(id_or_description);
				if ("error" in match) {
					return {
						content: [{ type: "text", text: match.error }],
						isError: true,
					};
				}

				if (match.status === status) {
					return {
						content: [
							{
								type: "text",
								text: `Todo already has status "${status}": ${this.formatTodo(match)}`,
							},
						],
					};
				}

				const state = this.getTodoState();
				const updatedTodo: Todo = {
					...match,
					status,
					completedAt:
						status === "completed" ? new Date().toISOString() : undefined,
				};
				this.setState({
					...state,
					todos: state.todos.map((todo) =>
						todo.id === match.id ? updatedTodo : todo,
					),
				});

				return {
					content: [
						{
							type: "text",
							text: `Updated todo status: ${this.formatTodo(updatedTodo)}`,
						},
					],
				};
			},
		);

		this.server.registerTool(
			"update_context",
			{
				inputSchema: {
					id_or_description: z.string().min(1),
					new_context: z.enum(["work", "personal"]),
				},
			},
			async ({ id_or_description, new_context }) => {
				const match = this.findTodoMatch(id_or_description);
				if ("error" in match) {
					return {
						content: [{ type: "text", text: match.error }],
						isError: true,
					};
				}

				if (match.context === new_context) {
					return {
						content: [
							{
								type: "text",
								text: `Todo already has context "${new_context}": ${this.formatTodo(match)}`,
							},
						],
					};
				}

				const state = this.getTodoState();
				const updatedTodo: Todo = {
					...match,
					context: new_context,
				};
				this.setState({
					...state,
					todos: state.todos.map((todo) =>
						todo.id === match.id ? updatedTodo : todo,
					),
				});

				return {
					content: [
						{
							type: "text",
							text: `Updated todo context: ${this.formatTodo(updatedTodo)}`,
						},
					],
				};
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/mcp") {
			return ViciaAgent.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
