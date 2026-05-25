# Vicia

A personal agent built on Cloudflare. Starts as a todo manager. Grows into something I actually use every day.

Vicia is named after a childhood nickname — viciadota, the Dota addict. Turns out the same obsessive energy that went into gaming is useful for learning a new stack.

This is a learning project, built in public. The real goal isn't the todo app — it's earning hands-on experience with the full Cloudflare agentic stack: Agents SDK, Durable Objects, Workflows, MCP, Browser Run, Sandboxes, and Artifacts. One phase at a time.

---

## The architectural stance

The agent is a **toolbox served over MCP**, not a chatbot.

The LLM lives in the client — Claude Desktop, Claude Code, or anything that speaks MCP. My server exposes well-defined, composable tools and manages state. That's it. No server-side LLM. No chat UI. No frontend.

Most agent tutorials start with a chat page and a server-side LLM. That's the architecture you'd eventually have to rip out anyway. This project skips that step entirely.

---

## Run your own

This agent is personal — it holds my todos, my state, my data. There's no shared endpoint.

But the whole point of building this in public is that you can fork it and run your own. See [SETUP.md](./SETUP.md) for instructions.

---

## Phases

| Phase | Goal | Status |
|-------|------|--------|
| 0 — Setup | Repo, Cloudflare account, local dev loop, deployed Worker | 🔄 In progress |
| 1 — Toolbox | MCP server with todo tools, connected to Claude Desktop | ⏳ Pending |
| 2 — Proactive | Scheduled nudges, Workflows, Agent Memory | ⏳ Pending |
| 3 — MCP done properly | OAuth, MCP portal, Code Mode | ⏳ Pending |
| 4 — Browser Run | Link enrichment, status watching, Human-in-the-Loop | ⏳ Pending |
| 5 — Sandboxes | Capability registry, internal Code Mode, sandboxed execution | ⏳ Pending |
| 6 — Artifacts | Versioned state, session forking, time-travel | ⏳ Pending |

The full plan with architecture decisions, ship criteria, and write-up prompts per phase lives in [`PLAN.md`](./PLAN.md).

---

## Stack

- **[Cloudflare Workers](https://workers.cloudflare.com/)** — the runtime
- **[Durable Objects](https://developers.cloudflare.com/durable-objects/)** — stateful agent, one per user
- **[McpAgent](https://github.com/cloudflare/agents)** — base class from the Cloudflare Agents SDK
- **SQLite (in the DO)** — todos and history
- **Claude Desktop / Claude Code** — the LLM client (not on my server)

---

## Tools (Phase 1)

| Tool | Description |
|------|-------------|
| `add_todo(text, context, due?)` | Add a todo. Context is `work` or `personal` — required, no default. |
| `complete_todo(id_or_description)` | Mark done. Fuzzy-matches by description, not just ID. |
| `query_todos(filter)` | Query by context, status (`open`, `in_progress`, `completed`, `all`), or due date. Structured input only — the LLM handles natural language. |
| `update_status(id_or_description, status)` | Move a todo between `open`, `in_progress`, and `completed`. |
| `update_context(id_or_description, new_context)` | Fix a miscategorization. |

---

## Follow along

I'm documenting this in public — one post per phase, honest about what worked and what didn't.

- Posts on [X / Twitter](https://x.com/AlexiisRossi)
- Posts on [LinkedIn](https://www.linkedin.com/in/alexisrossi-dev/)

---

## Why public?

Accountability, mostly. If I'm not using it daily by the end of Phase 1, the project is failing — and having the repo public makes that easy to see.

Also: if you're learning the same stack and want to compare notes, open an issue or reach out.

---

## License

MIT