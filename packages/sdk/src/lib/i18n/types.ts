/**
 * i18n types for the Traek library.
 * Organized by component/feature area.
 */

export interface TraekTranslations {
	canvas: {
		viewportAriaLabel: string;
		emptyStateTitle: string;
		emptyStateSubtitle: string;
		regenerateResponse: string;
		branchCelebration: string;
		nodesDeleted: (count: number) => string;
	};
	input: {
		placeholder: string;
		messageAriaLabel: string;
		sendAriaLabel: string;
		branchingFromSelected: string;
		replyingToSelected: string;
		startingNewConversation: string;
	};
	zoom: {
		zoomIn: string;
		zoomOut: string;
		resetZoom: string;
		fitAllNodes: string;
	};
	search: {
		placeholder: string;
		noMatches: string;
		matchCounter: (current: number, total: number) => string;
		previousMatch: string;
		nextMatch: string;
		closeSearch: string;
	};
	keyboard: {
		title: string;
		navigationSection: string;
		navigateToParent: string;
		navigateToFirstChild: string;
		navigateToPreviousSibling: string;
		navigateToNextSibling: string;
		goToRoot: string;
		goToDeepestLeaf: string;
		actionsSection: string;
		activateFocusedNode: string;
		toggleCollapseExpand: string;
		switchFocusToInput: string;
		showHideHelp: string;
		advancedSection: string;
		goToRootChord: string;
		goToDeepestLeafChord: string;
		jumpToNthChild: string;
		openFuzzySearch: string;
		close: string;
		leaveInput: string;
	};
	keyboardNavigator: {
		navigatedToParent: (label: string) => string;
		alreadyAtRoot: string;
		noChildren: string;
		navigatedToChild: (label: string) => string;
		navigatedToPreviousSibling: (label: string) => string;
		noPreviousSibling: string;
		navigatedToNextSibling: (label: string) => string;
		noNextSibling: string;
		activatedNode: (label: string) => string;
		noChildrenToCollapse: string;
		collapsedNode: string;
		expandedNode: string;
		navigatedToRoot: string;
		navigatedToDeepestLeaf: (label: string) => string;
		alreadyAtLeaf: string;
		showingHelp: string;
		hidingHelp: string;
		chordStarted: (key: string) => string;
		unknownChord: string;
		noChildrenAvailable: string;
		onlyNChildrenAvailable: (count: number) => string;
		jumpedToChild: (index: number, label: string) => string;
		fuzzySearchOpened: string;
		fuzzySearchClosed: string;
		navigatedTo: (label: string) => string;
		unknownNode: string;
	};
	fuzzySearch: {
		placeholder: string;
		ariaLabel: string;
		noContent: string;
		noMatchingNodes: string;
		resultCount: (count: number) => string;
		navigate: string;
		select: string;
	};
	nodeActions: {
		duplicate: string;
		delete: string;
		onlyThisNode: string;
		withDescendants: (count: number) => string;
		retry: string;
		edit: string;
		copyBranch: string;
		compareBranches: string;
		branchCopied: string;
		copyFailed: string;
	};
	textNode: {
		save: string;
		cancel: string;
		scrollForMore: string;
	};
	toast: {
		undo: string;
		dismiss: string;
	};
	onboarding: {
		welcomeTitle: string;
		welcomeDescription: string;
		swipeUpTitle: string;
		swipeUpDescription: string;
		swipeDownTitle: string;
		swipeDownDescription: string;
		swipeSidewaysTitle: string;
		swipeSidewaysDescription: string;
		keyboardTitle: string;
		keyboardDescription: string;
		keyboardNavigation: string;
		keyboardToRoot: string;
		keyboardInputFocus: string;
		keyboardClose: string;
		skip: string;
		skipAriaLabel: string;
		next: string;
		letsGo: string;
		tutorialProgress: string;
	};
	tour: {
		welcomeTitle: string;
		welcomeDescription: string;
		sendMessageTitle: string;
		sendMessageDescription: string;
		createBranchTitle: string;
		createBranchDescription: string;
		keyboardNavTitle: string;
		keyboardNavDescription: string;
		searchTitle: string;
		searchDescription: string;
		compareBranchesTitle: string;
		compareBranchesDescription: string;
		readyTitle: string;
		readyDescription: string;
		skip: string;
		skipAriaLabel: string;
		back: string;
		next: string;
		letsGo: string;
		tourProgress: string;
	};
	breadcrumb: {
		navAriaLabel: string;
		showFullPath: string;
		defaultNodeText: string;
	};
	loading: {
		preparingCanvas: string;
	};
	toolbar: {
		nodeActions: string;
	};
	replay: {
		reset: string;
		stepBack: string;
		pause: string;
		play: string;
		stepForward: string;
		replayMode: string;
		playbackSpeed: string;
		scrubberAriaLabel: string;
	};
	focusMode: {
		noFurtherReplies: string;
		atBeginning: string;
		noPreviousAlternative: string;
		noNextAlternative: string;
		navigationAriaLabel: string;
		noContent: string;
		emptyState: string;
		viewFullMessageTitle: string;
		replyingTo: string;
		messageFallback: string;
		inputPlaceholder: string;
	};
	childSelector: {
		title: string;
		description: (count: number) => string;
		userLabel: string;
		assistantLabel: string;
		messageFallback: string;
		cancel: string;
	};
	positionIndicator: {
		positionAriaLabel: (
			level: number,
			totalLevels: number,
			sibling: number,
			totalSiblings: number
		) => string;
		levelLabel: string;
		positionLabel: string;
		childrenLabel: string;
		siblingDotsAriaLabel: string;
		siblingDotAriaLabel: (index: number, total: number) => string;
		siblingPositionAriaLabel: (index: number, total: number) => string;
		childCountTitle: (count: number) => string;
		tooltipLevelLabel: (level: number, total: number) => string;
		tooltipLevelText: (level: number) => string;
		tooltipAlternativeLabel: (index: number, total: number) => string;
		tooltipAlternativeText: string;
		tooltipChildrenLabel: (count: number) => string;
		tooltipChildrenText: string;
	};
	homeButton: {
		backToStart: string;
		backToStartTitle: string;
	};
	swipeAffordances: {
		swipeUpHint: string;
		swipeDownHint: string;
	};
	chatList: {
		deleteConfirm: (title: string) => string;
		untitledFallback: string;
		justNow: string;
		minutesAgo: (count: number) => string;
		hoursAgo: (count: number) => string;
		daysAgo: (count: number) => string;
		emptyState: string;
		emptyStateHint: string;
		today: string;
		yesterday: string;
		last7Days: string;
		older: string;
		nodeCount: (count: number) => string;
		rename: string;
		delete: string;
	};
	saveIndicator: {
		saving: string;
		saved: string;
		saveFailed: string;
	};
	tags: {
		manageTags: string;
		tagsTitle: string;
		addTags: string;
		customTagPlaceholder: string;
		add: string;
		filterByTags: string;
		clearFilters: string;
		removeTag: string;
		labelImportant: string;
		labelTodo: string;
		labelIdea: string;
		labelQuestion: string;
		labelResolved: string;
	};
	theme: {
		dark: string;
		light: string;
		highContrast: string;
		togglePicker: string;
		themeTitle: string;
		selectTheme: (name: string) => string;
		accentColor: string;
	};
	compare: {
		title: string;
		close: string;
		branchA: string;
		branchB: string;
		branchOption: (index: number, role: string) => string;
		nodeCount: (count: number) => string;
		onlyInA: string;
		onlyInB: string;
	};
	nodeWrapper: {
		userLabel: string;
		assistantLabel: string;
		outdatedLabel: string;
		outdatedTitle: string;
		outdatedAriaLabel: string;
		processing: string;
		errorLabel: string;
		errorFallback: string;
		retry: string;
		dismiss: string;
		hiddenCount: (count: number) => string;
		branchesCount: (count: number) => string;
		thinkingCompleted: string;
		thoughtProcess: string;
		expandSubtree: string;
		collapseSubtree: string;
	};
	minimap: {
		overviewAriaLabel: string;
		expand: string;
		collapse: string;
	};
	nodeRenderer: {
		missingComponent: (type: string) => string;
	};
	headerBar: {
		backLabel: string;
	};
	ghostPreview: {
		userRoleLabel: string;
	};
	actions: {
		badgesGroupLabel: string;
		slashCommandsLabel: string;
	};
}

/** Deep partial version allowing integrators to override only what they need. */
export type PartialTraekTranslations = DeepPartial<TraekTranslations>;

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends (...args: infer A) => infer R
		? (...args: A) => R
		: T[P] extends object
			? DeepPartial<T[P]>
			: T[P];
};
