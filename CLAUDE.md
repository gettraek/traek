# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

This project uses a multi-agent team pattern where a team-lead agent delegates tasks to specialized sub-agents (/brand, /ux, /pm, /dev). When receiving a task via SendMessage from a team-lead, complete the full task and send results back before shutdown. Do not wait for additional prompts. For each agent, use the skill file in .claude/skills to guide the agent. All agents are started with permissions-mode acceptEdits.

## Quality Checks

After implementing any feature, always run the full lint, type-check, and test suite (`pnpm run lint && pnpm run check && pnpm run test`) before reporting completion. Fix all errors in a single pass rather than iterating.

## Project Overview

Træk is a Svelte 5 UI library for building spatial, tree-structured AI conversation interfaces. Instead of linear chat, messages are nodes on a pannable/zoomable canvas with branching support.

This is a **pnpm + Turborepo monorepo**:

- `packages/sdk` — the library, published to npm as **`traek`**
- `apps/web` (`@traek/web`) — SvelteKit demo site and API endpoints
- `apps/docs` (`@traek/docs`) — Astro Starlight documentation site
- `servers/mcp` (`@traek/mcp`) — MCP server (developer integration assistant)

## Commands

Run from the repo root (turbo fans out to all workspaces):

```bash
pnpm install             # Install all workspace dependencies
pnpm run dev             # Start web app dev server (turbo dev --filter=@traek/web)
pnpm run build           # Build all packages (turbo build)
pnpm run check           # Type-check all packages (svelte-check / tsc / astro check)
pnpm run lint            # Prettier check + ESLint
pnpm run format          # Auto-format with Prettier
pnpm run test            # Run all tests (turbo test)
pnpm run watch           # Rebuild packages on change (turbo watch build)
```

Scope a task to one workspace with `--filter`, e.g.:

```bash
pnpm --filter traek run test          # SDK unit tests (Vitest)
pnpm --filter traek exec vitest run path/to/test   # Single test file
pnpm --filter @traek/web run test:e2e # Playwright e2e tests (builds first)
pnpm --filter @traek/mcp run check    # Type-check the MCP server
```

## Testing

SDK unit tests live in `packages/sdk/src` and run with Vitest. Component tests must use logic-extraction testing (pure function/store tests) rather than jsdom/testing-library component rendering, which is incompatible with Svelte 5 runes. E2e tests live in `apps/web/e2e` and run with Playwright.

## Architecture

### SDK (`packages/sdk/src/lib/`)

- **TraekEngine** (`TraekEngine.svelte.ts`) — Core state management class. Manages the conversation tree: nodes, parent-child relationships, spatial layout (x/y coordinates), and operations like `addNode()`, `branchFrom()`, `focusOnNode()`, `moveNode()`.
- **TraekCanvas** (`TraekCanvas.svelte`) — Main exported component. Renders the interactive canvas with pan/zoom, message nodes, connection lines, and streaming input. Accepts `onSendMessage` callback and a customizable component map for node types.
- **TraekNodeWrapper** (`TraekNodeWrapper.svelte`) — Wraps individual nodes with viewport intersection detection, auto-height calculation (ResizeObserver), and thought/reasoning panel support.
- **TextNode** (`TextNode.svelte`) — Default message renderer with markdown (marked + DOMPurify), code highlighting (highlight.js), and image support.

Public API is exported from `packages/sdk/src/lib/index.ts` (components, engine, persistence, theming, i18n, node types, Zod schemas).

### Web App (`apps/web/src/routes/`)

- `/` — Landing page
- `/demo` — Interactive demo with OpenAI streaming
- `/api/chat` — Server endpoint that streams OpenAI completions (requires `OPENAI_API_KEY` env var)
- `/api/image` — Image generation endpoint

### Docs (`apps/docs/`)

Astro Starlight site; content lives in `src/content/docs/`.

### MCP Server (`servers/mcp/`)

Exposes traek component docs, guides, snippets, and page scaffolding as MCP tools/resources. Runs over stdio by default, or Streamable HTTP when `PORT` is set.

### Key Types

Nodes have `id`, `parentIds`, `role` (user/assistant/system), `type`, `status` (streaming/done/error), and `metadata` with spatial coordinates. `MessageNode` extends `Node` with `content: string`.

### TraekEngine

When working with TraekEngine, use O(1) map-based lookups (nodeMap, connectionMap) instead of Array.find/filter. All engine data structures use Maps for performance.

## Conventions

- **Svelte 5** runes syntax (`$state`, `$derived`, `$effect`)
- **Formatting**: tabs, single quotes, no trailing commas, 100 char line width
- **Theming**: CSS custom properties prefixed with `--traek-*` (dark theme default); `ThemeProvider` for programmatic themes
- **SvelteKit**: web app uses Node adapter, mdsvex preprocessor for markdown in Svelte files
- **TypeScript**: strict mode enabled
- **Validation**: Use **Zod** for all runtime validation. Define Zod schemas for external data boundaries (API responses, user input, serialized snapshots, config objects, localStorage data). Co-locate schemas with their types in the same file or a `schemas.ts` next to `types.ts`. Derive TypeScript types from Zod schemas with `z.infer<>` where practical.

## Svelte Conventions

When editing Svelte components, watch for: (1) 'children' variable naming conflicts with Svelte's reserved `children` snippet prop, (2) nested interactive elements (e.g., button inside button), (3) unused CSS selectors triggering a11y/lint warnings. Check these before running the test suite.
