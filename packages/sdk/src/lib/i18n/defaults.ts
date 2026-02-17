import type { TraekTranslations } from './types';

/** Default English translations for all user-facing strings in the Traek library. */
export const DEFAULT_TRANSLATIONS: TraekTranslations = {
	canvas: {
		viewportAriaLabel: 'Conversation tree',
		emptyStateTitle: 'Start a conversation',
		emptyStateSubtitle: 'Type a message below to begin',
		regenerateResponse: 'Re-generate response',
		branchCelebration: 'You created a branch! Explore different directions.',
		nodesDeleted: (count: number) => `${count} node${count > 1 ? 's' : ''} deleted`
	},
	input: {
		placeholder: 'Ask the expert...',
		sendAriaLabel: 'Send message',
		branchingFromSelected: 'Branching from selected message',
		replyingToSelected: 'Replying to selected message',
		startingNewConversation: 'Starting a new conversation'
	},
	zoom: {
		zoomIn: 'Zoom in',
		zoomOut: 'Zoom out',
		resetZoom: 'Reset zoom to 100%',
		fitAllNodes: 'Fit all nodes'
	},
	search: {
		placeholder: 'Search...',
		noMatches: 'No matches',
		previousMatch: 'Previous match (Shift+Enter)',
		nextMatch: 'Next match (Enter)',
		closeSearch: 'Close search (Escape)'
	},
	keyboard: {
		title: 'Keyboard Shortcuts',
		navigationSection: 'Navigation',
		navigateToParent: 'Navigate to parent',
		navigateToFirstChild: 'Navigate to first child',
		navigateToPreviousSibling: 'Navigate to previous sibling',
		navigateToNextSibling: 'Navigate to next sibling',
		goToRoot: 'Go to root node',
		goToDeepestLeaf: 'Go to deepest leaf',
		actionsSection: 'Actions',
		activateFocusedNode: 'Activate focused node',
		toggleCollapseExpand: 'Toggle collapse/expand',
		switchFocusToInput: 'Switch focus to input',
		showHideHelp: 'Show/hide this help',
		advancedSection: 'Advanced',
		goToRootChord: 'Go to root (chord)',
		goToDeepestLeafChord: 'Go to deepest leaf (chord)',
		jumpToNthChild: 'Jump to nth child',
		openFuzzySearch: 'Open fuzzy search',
		close: 'Close'
	},
	fuzzySearch: {
		placeholder: 'Type to search nodes...',
		ariaLabel: 'Search nodes',
		noContent: '[No content]',
		noMatchingNodes: 'No matching nodes found',
		resultCount: (count: number) => `${count} result${count !== 1 ? 's' : ''}`,
		navigate: 'Navigate',
		select: 'Select'
	},
	nodeActions: {
		duplicate: 'Duplicate',
		delete: 'Delete',
		onlyThisNode: 'Only this node',
		withDescendants: (count: number) => `With ${count} descendant${count > 1 ? 's' : ''}`,
		retry: 'Retry',
		edit: 'Edit',
		copyBranch: 'Copy Branch',
		compareBranches: 'Compare branches',
		branchCopied: 'Branch copied to clipboard',
		copyFailed: 'Failed to copy to clipboard'
	},
	textNode: {
		save: 'Save',
		cancel: 'Cancel',
		scrollForMore: 'Scroll for more \u2193'
	},
	toast: {
		undo: 'Undo',
		dismiss: 'Dismiss'
	},
	onboarding: {
		welcomeTitle: 'Welcome to Focus Mode',
		welcomeDescription: 'Navigate your conversation with natural gestures',
		swipeUpTitle: 'Swipe up',
		swipeUpDescription: 'Go deeper in the response chain',
		swipeDownTitle: 'Swipe down',
		swipeDownDescription: 'Back to the previous message',
		swipeSidewaysTitle: 'Swipe sideways',
		swipeSidewaysDescription: 'Switch between alternative responses',
		keyboardTitle: 'Keyboard shortcuts',
		keyboardDescription: 'Use these keys for fast navigation',
		keyboardNavigation: 'Navigation',
		keyboardToRoot: 'To root',
		keyboardInputFocus: 'Input focus',
		keyboardClose: 'Close',
		skip: 'Skip',
		skipAriaLabel: 'Skip tutorial',
		next: 'Next',
		letsGo: "Let's go!",
		tutorialProgress: 'Tutorial progress'
	},
	tour: {
		welcomeTitle: 'Welcome to Tr\u00E6k',
		welcomeDescription:
			'Tr\u00E6k is a spatial conversation interface. Move freely on the canvas and explore branching conversations.',
		sendMessageTitle: 'Send a message',
		sendMessageDescription:
			'Type your message here and press Enter to send. Your conversation will be displayed as a tree on the canvas.',
		createBranchTitle: 'Create a branch',
		createBranchDescription:
			'Click on a message and send a new response. You can create multiple alternative responses from the same point.',
		keyboardNavTitle: 'Keyboard navigation',
		keyboardNavDescription:
			'Use arrow keys (\u2191\u2193\u2190\u2192) to navigate, Home for root, "i" for input focus, and "?" for all shortcuts.',
		searchTitle: 'Search conversation',
		searchDescription:
			'Press Ctrl+F (or Cmd+F) to search all messages. Navigate between results with Enter.',
		compareBranchesTitle: 'Compare branches',
		compareBranchesDescription:
			'Use the Compare icon in the node toolbar to compare different response paths side by side.',
		readyTitle: "You're ready to go!",
		readyDescription: 'You can restart the tour anytime from the settings. Have fun exploring!',
		skip: 'Skip',
		skipAriaLabel: 'Skip tour',
		back: 'Back',
		next: 'Next',
		letsGo: "Let's go!",
		tourProgress: 'Tour progress'
	},
	breadcrumb: {
		showFullPath: 'Show full path',
		defaultNodeText: 'Message'
	},
	loading: {
		preparingCanvas: 'Preparing tr\u00E6k canvas\u2026'
	},
	toolbar: {
		nodeActions: 'Node actions'
	},
	replay: {
		stepBack: 'Step back',
		pause: 'Pause',
		play: 'Play',
		stepForward: 'Step forward'
	}
};
