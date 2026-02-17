# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

This project uses a multi-agent team pattern where a team-lead agent delegates tasks to specialized sub-agents (/brand, /ux, /pm, /dev). When receiving a task via SendMessage from a team-lead, complete the full task and send results back before shutdown. Do not wait for additional prompts. For each agent, use the skill file in .claude/skills to guide the agent. All agents are started with permissions-mode acceptEdits.

## Quality Checks

After implementing any feature, always run the full lint, type-check, and test suite (`pnpm run lint && pnpm run check && pnpm run test`) before reporting completion. Fix all errors in a single pass rather than iterating.

## Project Overview

Træk (`traek`) is a Svelte 5 UI library for building spatial, tree-structured AI conversation interfaces. Instead of linear chat, messages are nodes on a pannable/zoomable canvas with branching support.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Build library (vite build + svelte-kit sync + publint)
npm run check            # Type-check with svelte-check
npm run lint             # ESLint + Prettier check
npm run format           # Auto-format with Prettier
npm run test:unit        # Run unit tests (Vitest)
npm run test:e2e         # Run Playwright e2e tests (needs build first)
npm run test             # Run all tests
npm run storybook        # Launch Storybook on :6006
```

Vitest is configured with 3 test projects: client-side (jsdom), server-side (node), and storybook. Run a single test with `npx vitest run path/to/test`.

## Testing

This is a Svelte 5 project using TypeScript. Component tests must use logic-extraction testing (pure function/store tests) rather than jsdom/testing-library component rendering, which is incompatible with Svelte 5 runes.

## Architecture

### Library (`src/lib/`)

- **TraekEngine** (`TraekEngine.svelte.ts`) — Core state management class. Manages the conversation tree: nodes, parent-child relationships, spatial layout (x/y coordinates), and operations like `addNode()`, `branchFrom()`, `focusOnNode()`, `moveNode()`.
- **TraekCanvas** (`TraekCanvas.svelte`) — Main exported component. Renders the interactive canvas with pan/zoom, message nodes, connection lines, and streaming input. Accepts `onSendMessage` callback and a customizable component map for node types.
- **TraekNodeWrapper** (`TraekNodeWrapper.svelte`) — Wraps individual nodes with viewport intersection detection, auto-height calculation (ResizeObserver), and thought/reasoning panel support.
- **TextNode** (`TextNode.svelte`) — Default message renderer with markdown (marked + DOMPurify), code highlighting (highlight.js), and image support.

Exports from `src/lib/index.ts`: `TraekCanvas`, `TextNode`, `DefaultLoadingOverlay`, `TraekEngine`, `DEFAULT_TRACK_ENGINE_CONFIG`, and associated types.

### Demo App (`src/routes/`)

- `/` — Landing page
- `/demo` — Interactive demo with OpenAI streaming
- `/api/chat` — Server endpoint that streams OpenAI completions (requires `OPENAI_API_KEY` env var)
- `/api/image` — Image generation endpoint

### Key Types

Nodes have `id`, `parentId`, `role` (user/assistant/system), `type` (TEXT/CODE/THOUGHT), `status` (streaming/done/error), and `metadata` with spatial coordinates. `MessageNode` extends `Node` with `content: string`.

### TraekEngine

When working with TraekEngine, use O(1) map-based lookups (nodeMap, connectionMap) instead of Array.find/filter. All engine data structures use Maps for performance.

## Conventions

- **Svelte 5** runes syntax (`$state`, `$derived`, `$effect`)
- **Formatting**: tabs, single quotes, no trailing commas, 100 char line width
- **Theming**: CSS custom properties prefixed with `--traek-*` on `:root` (dark theme default)
- **SvelteKit**: uses Node adapter, mdsvex preprocessor for markdown in Svelte files
- **TypeScript**: strict mode enabled
- **Validation**: Use **Zod** for all runtime validation. Define Zod schemas for external data boundaries (API responses, user input, serialized snapshots, config objects, localStorage data). Co-locate schemas with their types in the same file or a `schemas.ts` next to `types.ts`. Derive TypeScript types from Zod schemas with `z.infer<>` where practical.

## Svelte Conventions

When editing Svelte components, watch for: (1) 'children' variable naming conflicts with Svelte's reserved `children` snippet prop, (2) nested interactive elements (e.g., button inside button), (3) unused CSS selectors triggering a11y/lint warnings. Check these before running the test suite.
