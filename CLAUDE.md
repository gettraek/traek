# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Conventions

- **Svelte 5** runes syntax (`$state`, `$derived`, `$effect`)
- **Formatting**: tabs, single quotes, no trailing commas, 100 char line width
- **Theming**: CSS custom properties prefixed with `--traek-*` on `:root` (dark theme default)
- **SvelteKit**: uses Node adapter, mdsvex preprocessor for markdown in Svelte files
- **TypeScript**: strict mode enabled
- **Validation**: Use **Zod** for all runtime validation. Define Zod schemas for external data boundaries (API responses, user input, serialized snapshots, config objects, localStorage data). Co-locate schemas with their types in the same file or a `schemas.ts` next to `types.ts`. Derive TypeScript types from Zod schemas with `z.infer<>` where practical.
