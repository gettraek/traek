// Main canvas component
export { default as TraekCanvas } from './components/TraekCanvas.vue';

// Composables
export { useTraekEngine, useCreateTraekEngine } from './composables/useTraekEngine.js';
export type { TraekEngineRefs } from './composables/useTraekEngine.js';

// i18n
export {
	I18N_KEY,
	provideTraekI18n,
	useTraekI18n,
	mergeTranslations,
	DEFAULT_TRANSLATIONS,
	// Built-in locale bundles
	de,
	fr,
	ja,
	zh
} from './i18n/index.js';
export type {
	TraekTranslations,
	PartialTraekTranslations,
	TraekI18nProviderOptions
} from './i18n/index.js';

// Theme
export { default as ThemeProvider } from './theme/ThemeProvider.vue';
export type { ThemeContextValue, ThemeProviderProps } from './theme/index.js';
export {
	themes,
	darkTheme,
	lightTheme,
	highContrastTheme,
	createCustomTheme,
	DEFAULT_THEME
} from './theme/themes.js';
export type { ThemeName } from './theme/themes.js';
export { TraekThemeSchema, TraekThemeColorsSchema } from './theme/tokens.js';
export type {
	TraekTheme,
	TraekThemeColors,
	TraekThemeSpacing,
	TraekThemeRadius,
	TraekThemeTypography,
	TraekThemeAnimation
} from './theme/tokens.js';
export { useTheme } from './theme/index.js';

// Toast
export { default as ToastContainer } from './toast/ToastContainer.vue';
export { toastStore, toast, toastUndo, useToasts } from './toast/index.js';
export type { ToastType, ToastData } from './toast/index.js';

// Tags
export { default as TagBadges } from './tags/TagBadges.vue';
export type { TagBadgesProps } from './tags/TagBadges.vue';
export { default as TagDropdown } from './tags/TagDropdown.vue';
export type { TagDropdownProps } from './tags/TagDropdown.vue';
export { default as TagFilter } from './tags/TagFilter.vue';
export type { TagFilterProps } from './tags/TagFilter.vue';
export { getNodeTags, getTagConfig, matchesTagFilter, PREDEFINED_TAGS } from './tags/tagUtils.js';
export type { TagConfig } from './tags/tagUtils.js';

// Search
export { default as SearchBar } from './search/SearchBar.vue';
export type { SearchBarProps } from './search/SearchBar.vue';

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
