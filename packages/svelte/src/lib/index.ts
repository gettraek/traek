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
	type NodeComponentMap,
	type LayoutMode
} from './TraekEngine.svelte';

// Layout system
export { default as LayoutPicker } from './layout/LayoutPicker.svelte';
export { LAYOUT_MODE_LABELS } from './layout/types';

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

// Multimodal node types (TRK-103)
export {
	imageNodeDefinition,
	fileNodeDefinition,
	codeNodeDefinition,
	embedNodeDefinition,
	multimodalNodeDefinitions
} from './node-types/multimodal/definitions';
export {
	imageNodeDataSchema,
	fileNodeDataSchema,
	codeNodeDataSchema,
	embedNodeDataSchema,
	getFileIcon,
	formatFileSize,
	detectEmbedType,
	COMMON_LANGUAGES
} from './node-types/multimodal/types';
export type {
	ImageEntry,
	ImageNodeData,
	FileEntry,
	FileNodeData,
	CodeNodeData,
	EmbedType,
	EmbedPreview,
	EmbedNodeData
} from './node-types/multimodal/types';
export { default as ImageNode } from './node-types/multimodal/ImageNode.svelte';
export { default as FileNode } from './node-types/multimodal/FileNode.svelte';
export { default as CodeNode } from './node-types/multimodal/CodeNode.svelte';
export { default as EmbedNode } from './node-types/multimodal/EmbedNode.svelte';
export { default as LightboxModal } from './node-types/multimodal/Lightbox.svelte';

// Default node actions
export {
	duplicateAction,
	deleteAction,
	copyBranchAction,
	createDuplicateAction,
	createDeleteAction,
	createCopyBranchAction,
	createRetryAction,
	createEditAction,
	createCompareAction,
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

// Version History (TRK-72)
export { VersionHistoryManager } from './versions/VersionHistoryManager';
export { AutoSnapshotTimer } from './versions/AutoSnapshotTimer';
export { MemoryAdapter as VersionMemoryAdapter } from './versions/adapters/MemoryAdapter';
export { LocalStorageAdapter as VersionLocalStorageAdapter } from './versions/adapters/LocalStorageAdapter';
export { IndexedDBVersionAdapter } from './versions/adapters/IndexedDBAdapter';
export { snapshotDiff } from './versions/snapshotDiff';
export { versionEntrySchema } from './versions/types';
export type {
	VersionEntry,
	SnapshotDiff,
	SnapshotNodeChange,
	StorageAdapter as VersionStorageAdapter,
	VersionHistoryOptions
} from './versions/types';

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

// Utilities
export { markdownToHtml, safeMarkdownToHtml } from './utils';

// Error boundary
export { default as NodeErrorBoundary } from './canvas/NodeErrorBoundary.svelte';

// Loading states
export { default as CanvasSkeleton } from './canvas/CanvasSkeleton.svelte';
export { default as NodeSkeleton } from './canvas/NodeSkeleton.svelte';
export { default as ProgressBar } from './canvas/ProgressBar.svelte';

// Icon System
export { default as Icon } from './icons/Icon.svelte';
export { ICONS, type IconName, type IconDef, type IconElement } from './icons/icons.js';
export { default as IconNodeText } from './icons/IconNodeText.svelte';
export { default as IconNodeCode } from './icons/IconNodeCode.svelte';
export { default as IconNodeThought } from './icons/IconNodeThought.svelte';
export { default as IconNodeImage } from './icons/IconNodeImage.svelte';

// Theme System
export { default as ThemeProvider, useTheme, applyThemeToRoot } from './theme/ThemeProvider.svelte';
export { default as ThemePicker } from './theme/ThemePicker.svelte';
export { default as ThemeToggle } from './theme/ThemeToggle.svelte';
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
export {
	toLinear,
	relativeLuminance,
	contrastRatio,
	parseColor,
	colorContrastRatio,
	meetsWCAG_AA,
	meetsWCAG_AAA,
	validateThemeContrast,
	CONTRAST_PAIRS
} from './theme/wcag';
export type { ContrastPair, ContrastResult, ThemeAuditResult } from './theme/wcag';

// i18n
export {
	DEFAULT_TRANSLATIONS,
	setTraekI18n,
	getTraekI18n,
	mergeTranslations,
	TraekI18nProvider,
	de,
	fr,
	ja,
	zh
} from './i18n/index';
export type { TraekTranslations, PartialTraekTranslations } from './i18n/index';

// Collaboration UI (requires @traek/collab peer dependency)
export { default as CollabCursorsOverlay } from './collab/CollabCursorsOverlay.svelte';
export { default as CollabPresenceBubbles } from './collab/CollabPresenceBubbles.svelte';
export { default as CollabStatusIndicator } from './collab/CollabStatusIndicator.svelte';
export { default as CollabNodePresence } from './collab/CollabNodePresence.svelte';
export { default as CollabConflictBanner } from './collab/CollabConflictBanner.svelte';
export { useCollab, useFollowMode } from './collab/useCollab.svelte.js';
export type { CollabHandle, FollowModeHandle, FollowTarget } from './collab/useCollab.svelte.js';

// Resilience & offline support
export { default as ConnectionStatus } from './resilience/ConnectionStatus.svelte';
export { offlineQueue, type QueuedMessage } from './resilience/offlineQueue.svelte';
export {
	StreamReconnector,
	computeBackoffDelay,
	type StreamReconnectorOptions,
	type StreamFactory,
	type StreamChunkHandler,
	type StreamDoneHandler,
	type StreamErrorHandler,
	type StreamReconnectingHandler,
	type StreamHandlers
} from './resilience/StreamReconnector.svelte';

// Analytics & Insights Dashboard
export { default as InsightsDashboard } from './analytics/InsightsDashboard.svelte';

// Node organization features (TRK-71)
export { default as TagBookmarkSidebar } from './sidebar/TagBookmarkSidebar.svelte';
export { default as BookmarkJumpOverlay } from './keyboard/BookmarkJumpOverlay.svelte';
export { default as BulkActionToolbar } from './canvas/BulkActionToolbar.svelte';
export { default as ColorPicker } from './canvas/ColorPicker.svelte';
export { default as BookmarkBadge } from './canvas/BookmarkBadge.svelte';
export { default as TagCreator } from './tags/TagCreator.svelte';
export type { NodeColor, CustomTag } from './TraekEngine.svelte';
export { listBuiltinTags, type Tag } from './tags/tagUtils';

// Export & Sharing (TRK-77)
export { default as SharePreviewCard } from './export/SharePreviewCard.svelte';
export { default as TraekEmbed } from './export/TraekEmbed.svelte';
export { default as QrHandoff } from './export/QrHandoff.svelte';
export {
	snapshotToPDFHtml,
	printConversation,
	snapshotToSlack,
	snapshotToSlackJSON,
	snapshotToDiscord,
	snapshotToDiscordJSON,
	countBranchPoints,
	getConversationPreview
} from './export/exportExtended';
