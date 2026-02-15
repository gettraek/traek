// Main component
export { default as TraekCanvas } from './TraekCanvas.svelte';
export { default as TextNode } from './TextNode.svelte';
export { default as DefaultLoadingOverlay } from './DefaultLoadingOverlay.svelte';

// Engine and config
export {
	TraekEngine,
	DEFAULT_TRACK_ENGINE_CONFIG,
	type TraekEngineConfig,
	type MessageNode,
	type Node,
	type NodeStatus,
	type AddNodePayload,
	type TraekNodeComponentProps,
	type NodeComponentMap
} from './TraekEngine.svelte';

// Actions
export { default as ActionBadges } from './actions/ActionBadges.svelte';
export { default as SlashCommandDropdown } from './actions/SlashCommandDropdown.svelte';
export { ActionResolver } from './actions/ActionResolver.svelte';
export type { ActionDefinition, ResolveActions } from './actions/types.js';

// Node type system
export {
	NodeTypeRegistry,
	createDefaultRegistry,
	textNodeDefinition,
	thoughtNodeDefinition
} from './node-types/index.js';
export type { NodeTypeDefinition, NodeTypeAction } from './node-types/index.js';

// Persistence & Replay
export { ReplayController } from './persistence/ReplayController.svelte';
export { default as ReplayControls } from './persistence/ReplayControls.svelte';
export type { ConversationSnapshot, SerializedNode } from './persistence/types.js';
