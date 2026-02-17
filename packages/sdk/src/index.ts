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
export type { ActionDefinition, ResolveActions } from './actions/types';

// Node type system
export {
	NodeTypeRegistry,
	createDefaultRegistry,
	textNodeDefinition,
	thoughtNodeDefinition
} from './node-types/index';
export type { NodeTypeDefinition, NodeTypeAction } from './node-types/index';
export type { ActionVariant } from './node-types/types';

// Default node actions
export {
	duplicateAction,
	deleteAction,
	createRetryAction,
	createEditAction,
	createDefaultNodeActions
} from './defaultNodeActions';
export type { DefaultNodeActionCallbacks } from './defaultNodeActions';

// Persistence & Replay
export { ReplayController } from './persistence/ReplayController.svelte';
export { default as ReplayControls } from './replay/ReplayControls.svelte';
export { ConversationStore } from './persistence/ConversationStore.svelte';
export { default as SaveIndicator } from './persistence/SaveIndicator.svelte';
export { default as ChatList } from './persistence/ChatList.svelte';
export { snapshotToJSON, snapshotToMarkdown, downloadFile } from './persistence/exportUtils';
export type {
	ConversationSnapshot,
	SerializedNode,
	StoredConversation,
	ConversationListItem,
	SaveState
} from './persistence/types';

// Conversation UI
export { default as HeaderBar } from './conversation/HeaderBar.svelte';

// Tag System
export { default as TagBadges } from './tags/TagBadges.svelte';
export { default as TagDropdown } from './tags/TagDropdown.svelte';
export { default as TagFilter } from './tags/TagFilter.svelte';
export {
	PREDEFINED_TAGS,
	getNodeTags,
	getTagConfig,
	matchesTagFilter,
	type TagConfig
} from './tags/tagUtils';

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
export { default as SwipeAffordances } from './mobile/SwipeAffordances.svelte';
export { default as Toast } from './mobile/Toast.svelte';
export { default as OnboardingOverlay } from './mobile/OnboardingOverlay.svelte';
export { default as HomeButton } from './mobile/HomeButton.svelte';
export { default as KeyboardCheatsheet } from './mobile/KeyboardCheatsheet.svelte';
export { default as Breadcrumbs } from './mobile/Breadcrumbs.svelte';
export { default as ChildSelector } from './mobile/ChildSelector.svelte';
export { focusModeConfigSchema, DEFAULT_FOCUS_MODE_CONFIG } from './mobile/focusModeTypes';
export type { FocusModeConfig, SwipeDirection } from './mobile/focusModeTypes';

// Desktop Onboarding
export { default as DesktopTour } from './onboarding/DesktopTour.svelte';
export { default as TourStep } from './onboarding/TourStep.svelte';

// Schemas (Zod)
export {
	serializedNodeSchema,
	conversationSnapshotSchema,
	saveStateSchema,
	storedConversationSchema,
	conversationListItemSchema
} from './persistence/schemas';
export { traekEngineConfigSchema, addNodePayloadSchema } from './schemas';
export { actionDefinitionSchema } from './actions/schemas';
export { nodeTypeActionSchema, nodeTypeDefinitionSchema } from './node-types/schemas';

// Demo / App-specific components (used by apps/web)
export { default as GravityDotsBackground } from './GravityDotsBackground.svelte';
export { default as ExampleCustomComponent } from './ExampleCustomComponent.svelte';
export { default as ImageDemoNode } from './ImageDemoNode.svelte';
export { createHeroEngine } from './heroDemoEngine';
export { markdownToHtml } from './utils';
export { track } from './umami';

// Theme System
export { default as ThemeProvider, useTheme, applyThemeToRoot } from './theme/ThemeProvider.svelte';
export { default as ThemePicker } from './theme/ThemePicker.svelte';
export {
	darkTheme,
	lightTheme,
	highContrastTheme,
	themes,
	DEFAULT_THEME,
	createCustomTheme
} from './theme/themes';
export type { ThemeName } from './theme/themes';
export type { ThemeContext } from './theme/ThemeProvider.svelte';
export {
	TraekThemeSchema,
	TraekThemeColorsSchema,
	TraekThemeSpacingSchema,
	TraekThemeRadiusSchema,
	TraekThemeTypographySchema,
	TraekThemeAnimationSchema
} from './theme/tokens';
export type {
	TraekTheme,
	TraekThemeColors,
	TraekThemeSpacing,
	TraekThemeRadius,
	TraekThemeTypography,
	TraekThemeAnimation
} from './theme/tokens';
