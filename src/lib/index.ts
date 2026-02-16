// Main component
export { default as TraekCanvas } from './TraekCanvas.svelte';
export { default as TextNode } from './TextNode.svelte';
export { default as DefaultLoadingOverlay } from './DefaultLoadingOverlay.svelte';

// Engine and config
export {
	TraekEngine,
	DEFAULT_TRACK_ENGINE_CONFIG,
	wouldCreateCycle,
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
export type { ActionVariant } from './node-types/types.js';

// Default node actions
export {
	duplicateAction,
	deleteAction,
	createRetryAction,
	createEditAction,
	createDefaultNodeActions
} from './defaultNodeActions.js';
export type { DefaultNodeActionCallbacks } from './defaultNodeActions.js';

// Persistence & Replay
export { ReplayController } from './persistence/ReplayController.svelte';
export { default as ReplayControls } from './persistence/ReplayControls.svelte';
export type { ConversationSnapshot, SerializedNode } from './persistence/types.js';

// Toast system
export { default as ToastContainer } from './toast/ToastContainer.svelte';
export { default as ToastComponent } from './toast/Toast.svelte';
export {
	toastStore,
	toast,
	toastUndo,
	type ToastType,
	type Toast as ToastData
} from './toast/toastStore.svelte';

// Mobile / Focus Mode
export { default as FocusMode } from './mobile/FocusMode.svelte';
export { default as PositionIndicator } from './mobile/PositionIndicator.svelte';
export { focusModeConfigSchema, DEFAULT_FOCUS_MODE_CONFIG } from './mobile/focusModeTypes.js';
export type { FocusModeConfig, SwipeDirection } from './mobile/focusModeTypes.js';

// Schemas (Zod)
export { serializedNodeSchema, conversationSnapshotSchema } from './persistence/schemas.js';
export { traekEngineConfigSchema, addNodePayloadSchema } from './schemas.js';
export { actionDefinitionSchema } from './actions/schemas.js';
export { nodeTypeActionSchema, nodeTypeDefinitionSchema } from './node-types/schemas.js';
