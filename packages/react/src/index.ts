// Main canvas component
export { TraekCanvas } from './components/TraekCanvas.js';
export type { TraekCanvasProps } from './components/TraekCanvas.js';

// Default node renderer
export { TextNode } from './components/TextNode.js';
export type { TextNodeProps } from './components/TextNode.js';

// Hooks
export { useTraekEngine, useCreateTraekEngine } from './hooks/useTraekEngine.js';

// i18n
export {
	TraekI18nProvider,
	useTraekI18n,
	mergeTranslations,
	DEFAULT_TRANSLATIONS
} from './i18n/index.js';
export type {
	TraekTranslations,
	PartialTraekTranslations,
	TraekI18nProviderProps
} from './i18n/index.js';

// Theme
export { ThemeProvider, useTheme, applyThemeToRoot } from './theme/ThemeProvider.js';
export type { ThemeProviderProps, ThemeContextValue, ThemeName } from './theme/ThemeProvider.js';

// Toast
export { ToastContainer, useToasts, toastStore, toast, toastUndo } from './toast/Toast.js';
export type { ToastType, ToastData } from './toast/Toast.js';

// Tags
export {
	TagBadges,
	TagDropdown,
	TagFilter,
	getNodeTags,
	getTagConfig,
	matchesTagFilter,
	PREDEFINED_TAGS
} from './tags/Tags.js';
export type { TagBadgesProps, TagDropdownProps, TagFilterProps, TagConfig } from './tags/Tags.js';

// Search
export { SearchBar } from './search/SearchBar.js';
export type { SearchBarProps } from './search/SearchBar.js';

// Persistence
export {
	ConversationStore,
	useConversationStore,
	useAutoSave,
	snapshotToJSON,
	snapshotToMarkdown,
	downloadFile
} from './persistence/index.js';
export type { ConversationStoreOptions, ConversationStoreState } from './persistence/index.js';

// Actions
export { useActionResolver } from './actions/index.js';
export type {
	ActionDefinition,
	ResolveActions,
	ActionResolverState,
	ActionResolverActions
} from './actions/index.js';

// Mobile
export {
	useSwipeNavigator,
	hapticTap,
	hapticBoundary,
	hapticSelect,
	hasCompletedOnboarding,
	markOnboardingComplete,
	clearOnboardingComplete,
	getNextStepIndex,
	getStepButtonText,
	isValidStepIndex,
	ONBOARDING_STEPS,
	ONBOARDING_SEEN_KEY,
	DEFAULT_FOCUS_MODE_CONFIG,
	findScrollable
} from './mobile/index.js';
export type {
	FocusModeConfig,
	SwipeDirection,
	SwipeState,
	SwipeResult,
	NavigationTarget,
	OnboardingStep
} from './mobile/index.js';

// Re-export everything from @traek/core for convenience
export {
	TraekEngine,
	wouldCreateCycle,
	BasicNodeTypes,
	DEFAULT_TRACK_ENGINE_CONFIG,
	searchNodes,
	highlightMatch,
	Store,
	ObservableSet,
	serializedNodeSchema,
	conversationSnapshotSchema,
	saveStateSchema
} from '@traek/core';
export type {
	Node,
	MessageNode,
	CustomTraekNode,
	TraekNodeComponentProps,
	AddNodePayload,
	NodeStatus,
	TraekEngineConfig,
	ConversationSnapshot,
	SerializedNode,
	SaveState,
	StoredConversation,
	ConversationListItem,
	Unsubscribe,
	Subscriber
} from '@traek/core';
