# Changelog

All notable changes to this project will be documented in this file.

## [0.0.3] - Released 2026-02-17

### Added

- **Monorepo** — Migrated to a pnpm + Turborepo workspace: the library now lives in `packages/sdk` (published as `traek`), with the demo site in `apps/web`, an Astro Starlight docs site in `apps/docs`, and an MCP developer-assistant server in `servers/mcp`.
- **Phase 2–4 features** — Minimap with viewport indicator, full keyboard navigation (Vim-style, chords, quick-jump), fuzzy and text search, branch comparison, virtualized rendering with benchmarks, onboarding (desktop tour + mobile focus-mode tutorial), design tokens, and adaptive zoom.
- **Tags, replay, themes** — Tag system with filtering, `ReplayController` + `ReplayControls` step-through playback, and a `ThemeProvider`-based theme system (dark, light, high-contrast, custom themes).
- **Docker** — Images for the web app, docs, and MCP server plus a `docker-compose.yml`.

### Changed

- Demo-specific code and rate limiting moved out of the SDK into `apps/web`.
- Consolidated theming under `ThemeProvider` (removed the old `ThemeToggle`).

### Fixed

- Connection hover highlighting, reactive branch badge, zoom transitions, search match highlighting, mobile input cut-off, and focus-ring flash on initial canvas load.

## [0.0.2] - Released 2026-02-10

### Added

- Theme toggle with CSS-variable-based light/dark theming across all components.
- Expanded demo content with branching examples.
- Basic analytics tracking on the demo site.

### Fixed

- Re-hydration of custom components.
- Layout gap issues and favicon loading.

## [0.0.1] - Released 2026-02-10

### Added

- **TraekCanvas** — Svelte 5 component: spatial canvas with pan/zoom, message nodes, input bar, and `onSendMessage` callback.
- **TraekEngine** — Tree state: `MessageNode` tree, layout (parent on top, children in a row), `addNode` / `addNodes`, `updateNode` (streaming), `focusOnNode`, `branchFrom`, move/snap.
- **Features:** Branching conversations, streaming replies, optional thought nodes, markdown rendering (marked + DOMPurify), configurable layout (node size, gaps, zoom, grid).
- **Storybook** — Stories: default, mock reply, streaming, error state, thought steps, branched conversation, 100-node benchmark.
- **Exports:** `TraekCanvas`, `TraekEngine`, `DEFAULT_TRACK_ENGINE_CONFIG`, types (`TraekEngineConfig`, `MessageNode`, `Node`, `NodeStatus`, `AddNodePayload`).
