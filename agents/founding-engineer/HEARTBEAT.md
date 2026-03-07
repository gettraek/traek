# HEARTBEAT.md -- Founding Engineer Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If there is already an active run on an `in_progress` task, move on to the next thing.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 3. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Read the issue, its ancestors, and comments to understand full context.
- Do the work. Use the `dev` skill for implementation guidance.
- Run quality checks: `pnpm run lint && pnpm run check && pnpm run test`

## 4. Update and Communicate

- Comment on progress before exiting each heartbeat.
- If blocked, PATCH status to `blocked` with a comment explaining the blocker.
- If done, PATCH status to `done` with a summary of what was done.

## 5. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.

## 6. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

---

## Engineer Responsibilities

- **Implementation**: Write clean, tested, production-quality code.
- **Quality**: Run lint, type-check, and tests before reporting completion.
- **Communication**: Keep issues updated with clear status comments.
- **Never look for unassigned work** -- only work on what is assigned to you.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
