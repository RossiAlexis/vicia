import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";

type TodoContext = "work" | "personal";

type Todo = {
	id: string;
	text: string;
	context: TodoContext;
	due?: string;
	createdAt: string;
	completed: boolean;
	completedAt?: string;
};

type TodoState = {
	todos: Todo[];
};

// Define our MCP agent with tools
export class ViciaAgent extends McpAgent {
	server = new McpServer({
		name: "Vicia Todo Manager",
		version: "1.0.0",
	});

	initialState: TodoState = {
		todos: [],
	};

	private getTodoState(): TodoState {
		const state = this.state as Partial<TodoState> | undefined;
		return {
			todos: Array.isArray(state?.todos) ? state.todos : [],
		};
	}

	private formatTodo(todo: Todo): string {
		const status = todo.completed ? "done" : "open";
		const duePart = todo.due ? ` | due: ${todo.due}` : "";
		return `[${status}] (${todo.context}) ${todo.text} [id: ${todo.id}]${duePart}`;
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
					completed: false,
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
			"list_todos",
			{
				inputSchema: {
					context: z.enum(["work", "personal"]).optional(),
					include_completed: z.boolean().optional(),
				},
			},
			async ({ context, include_completed }) => {
				const state = this.getTodoState();
				const filteredTodos = state.todos.filter((todo) => {
					if (!include_completed && todo.completed) {
						return false;
					}
					if (context && todo.context !== context) {
						return false;
					}
					return true;
				});

				if (filteredTodos.length === 0) {
					return {
						content: [{ type: "text", text: "No todos found." }],
					};
				}

				const body = filteredTodos
					.map((todo, index) => `${index + 1}. ${this.formatTodo(todo)}`)
					.join("\n");

				return {
					content: [{ type: "text", text: body }],
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
