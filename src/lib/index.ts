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
} from './TraekEngine.svelte';
