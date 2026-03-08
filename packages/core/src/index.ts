// Core engine
export { TraekEngine, wouldCreateCycle } from './TraekEngine.js';
export type { ConversationSnapshot } from './TraekEngine.js';

// Types
export { BasicNodeTypes, DEFAULT_TRACK_ENGINE_CONFIG } from './types.js';
export type {
	Node,
	MessageNode,
	CustomTraekNode,
	TraekNodeComponentProps,
	AddNodePayload,
	TraekEngineConfig,
	NodeStatus,
	NodeColor,
	CustomTag
} from './types.js';

// Schemas
export {
	serializedNodeSchema,
	serializedNodeFlexSchema,
	conversationSnapshotSchema,
	saveStateSchema,
	storedConversationSchema,
	conversationListItemSchema
} from './schemas.js';
export type {
	SerializedNode,
	SaveState,
	StoredConversation,
	ConversationListItem
} from './schemas.js';

// Search utilities
export { searchNodes, highlightMatch } from './search.js';

// Reactive store primitives
export { Store, ObservableSet } from './store.js';
export type { Unsubscribe, Subscriber } from './store.js';

// Layout algorithms and types (framework-agnostic)
export { computeLayout, buildLayoutInput, LAYOUT_MODE_LABELS } from './layout.js';
export type { LayoutMode, NodePosition, LayoutConfig, LayoutInput } from './layout.js';
