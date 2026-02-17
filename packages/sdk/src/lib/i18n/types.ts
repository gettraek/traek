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
		stepBack: string;
		pause: string;
		play: string;
		stepForward: string;
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
