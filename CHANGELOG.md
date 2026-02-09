# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - Released 2026-02-09

### Changed

- **Package name** — Changed from `mycelium` to `@eweren/mycelium`.

## [0.0.1] - Released 2026-02-09

### Added

- **ChatCanvas** — Svelte 5 component: spatial canvas with pan/zoom, message nodes, input bar, and `onSendMessage` callback.
- **ChatEngine** — Tree state: `MessageNode` tree, layout (parent on top, children in a row), `addNode` / `addNodes`, `updateNode` (streaming), `focusOnNode`, `branchFrom`, move/snap.
- **Features:** Branching conversations, streaming replies, optional thought nodes, markdown rendering (marked + DOMPurify), configurable layout (node size, gaps, zoom, grid).
- **Storybook** — Stories: default, mock reply, streaming, error state, thought steps, branched conversation, 100-node benchmark.
- **Exports:** `ChatCanvas`, `ChatEngine`, `DEFAULT_CHAT_ENGINE_CONFIG`, types (`ChatEngineConfig`, `MessageNode`, `Node`, `NodeStatus`, `AddNodePayload`).
