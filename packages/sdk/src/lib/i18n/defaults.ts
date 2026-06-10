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
		messageAriaLabel: 'Message input',
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
		matchCounter: (current: number, total: number) => `${current}/${total}`,
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
		close: 'Close',
		leaveInput: 'Leave input'
	},
	keyboardNavigator: {
		navigatedToParent: (label: string) => `Navigated to parent: ${label}`,
		alreadyAtRoot: 'Already at root',
		noChildren: 'No children',
		navigatedToChild: (label: string) => `Navigated to child: ${label}`,
		navigatedToPreviousSibling: (label: string) => `Navigated to previous sibling: ${label}`,
		noPreviousSibling: 'No previous sibling',
		navigatedToNextSibling: (label: string) => `Navigated to next sibling: ${label}`,
		noNextSibling: 'No next sibling',
		activatedNode: (label: string) => `Activated node: ${label}`,
		noChildrenToCollapse: 'Node has no children to collapse',
		collapsedNode: 'Collapsed node',
		expandedNode: 'Expanded node',
		navigatedToRoot: 'Navigated to root',
		navigatedToDeepestLeaf: (label: string) => `Navigated to deepest leaf: ${label}`,
		alreadyAtLeaf: 'Already at leaf node',
		showingHelp: 'Showing keyboard shortcuts',
		hidingHelp: 'Hiding keyboard shortcuts',
		chordStarted: (key: string) => `Chord started: ${key}`,
		unknownChord: 'Unknown chord sequence',
		noChildrenAvailable: 'No children available',
		onlyNChildrenAvailable: (count: number) => `Only ${count} children available`,
		jumpedToChild: (index: number, label: string) => `Jumped to child ${index}: ${label}`,
		fuzzySearchOpened: 'Fuzzy search opened',
		fuzzySearchClosed: 'Fuzzy search closed',
		navigatedTo: (label: string) => `Navigated to: ${label}`,
		unknownNode: 'Unknown node'
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
		navAriaLabel: 'Conversation path',
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
		reset: 'Skip to start',
		stepBack: 'Step back',
		pause: 'Pause',
		play: 'Play',
		stepForward: 'Step forward',
		replayMode: 'Replay Mode',
		playbackSpeed: 'Playback speed',
		scrubberAriaLabel: 'Replay position'
	},
	focusMode: {
		noFurtherReplies: 'No further replies',
		atBeginning: 'You are at the beginning',
		noPreviousAlternative: 'No previous alternative',
		noNextAlternative: 'No further alternative',
		navigationAriaLabel: 'Focus Mode Navigation',
		noContent: 'No content',
		emptyState: 'No messages yet. Swipe down or type below to start.',
		viewFullMessageTitle: 'Click to view the full message',
		replyingTo: 'Replying to:',
		messageFallback: 'Message',
		inputPlaceholder: 'Type a message...'
	},
	childSelector: {
		title: 'Which continuation?',
		description: (count: number) => `There are ${count} replies. Choose one:`,
		userLabel: 'User',
		assistantLabel: 'Assistant',
		messageFallback: 'Message',
		cancel: 'Cancel'
	},
	positionIndicator: {
		positionAriaLabel: (
			level: number,
			totalLevels: number,
			sibling: number,
			totalSiblings: number
		) => `Position: level ${level} of ${totalLevels}, sibling ${sibling} of ${totalSiblings}`,
		levelLabel: 'Level',
		positionLabel: 'Position',
		childrenLabel: 'Children',
		siblingDotsAriaLabel: 'Sibling position',
		siblingDotAriaLabel: (index: number, total: number) => `${index} of ${total}`,
		siblingPositionAriaLabel: (index: number, total: number) => `Position ${index} of ${total}`,
		childCountTitle: (count: number) => `${count} ${count === 1 ? 'child' : 'children'}`,
		tooltipLevelLabel: (level: number, total: number) => `Level ${level}/${total}:`,
		tooltipLevelText: (level: number) => `You are at conversation level ${level}`,
		tooltipAlternativeLabel: (index: number, total: number) => `Alternative ${index}/${total}:`,
		tooltipAlternativeText: 'Swipe left/right for other replies',
		tooltipChildrenLabel: (count: number) => `${count} continuation${count === 1 ? '' : 's'}:`,
		tooltipChildrenText: 'Swipe up'
	},
	homeButton: {
		backToStart: 'Back to start',
		backToStartTitle: 'Back to start (Home key)'
	},
	swipeAffordances: {
		swipeUpHint: 'Swipe up for more',
		swipeDownHint: 'Swipe down to go back'
	},
	chatList: {
		deleteConfirm: (title: string) => `Delete "${title}"?`,
		untitledFallback: 'this conversation',
		justNow: 'Just now',
		minutesAgo: (count: number) => `${count}m ago`,
		hoursAgo: (count: number) => `${count}h ago`,
		daysAgo: (count: number) => `${count}d ago`,
		emptyState: 'No conversations yet.',
		emptyStateHint: 'Start your first chat!',
		today: 'Today',
		yesterday: 'Yesterday',
		last7Days: 'Last 7 days',
		older: 'Older',
		nodeCount: (count: number) => `${count} node${count === 1 ? '' : 's'}`,
		rename: 'Rename',
		delete: 'Delete'
	},
	saveIndicator: {
		saving: 'Saving...',
		saved: 'Saved',
		saveFailed: 'Save failed'
	},
	tags: {
		manageTags: 'Manage tags',
		tagsTitle: 'Tags',
		addTags: 'Add Tags',
		customTagPlaceholder: 'Custom tag...',
		add: 'Add',
		filterByTags: 'Filter by Tags',
		clearFilters: 'Clear filters',
		removeTag: 'Click to remove tag'
	},
	theme: {
		dark: 'Dark',
		light: 'Light',
		highContrast: 'High Contrast',
		togglePicker: 'Toggle theme picker',
		themeTitle: 'Theme',
		selectTheme: (name: string) => `Select ${name} theme`,
		accentColor: 'Accent Color'
	},
	compare: {
		title: 'Compare Branches',
		close: 'Close comparison',
		branchA: 'Branch A',
		branchB: 'Branch B',
		branchOption: (index: number, role: string) => `Branch ${index} (${role})`,
		nodeCount: (count: number) => `${count} node${count !== 1 ? 's' : ''}`,
		onlyInA: 'Only in A',
		onlyInB: 'Only in B'
	},
	nodeWrapper: {
		userLabel: 'User',
		assistantLabel: 'Assistant',
		outdatedLabel: 'Outdated',
		outdatedTitle: 'This reply was based on a previous version of the message above.',
		outdatedAriaLabel: 'Outdated: this reply was based on a previous version of the message above.',
		processing: 'Processing…',
		errorLabel: 'Error',
		errorFallback: 'An error occurred',
		retry: 'Retry',
		dismiss: 'Dismiss',
		hiddenCount: (count: number) => `${count} hidden`,
		branchesCount: (count: number) => `${count} branches`,
		thinkingCompleted: 'Thinking completed',
		thoughtProcess: 'Thought process',
		expandSubtree: 'Expand subtree',
		collapseSubtree: 'Collapse subtree'
	},
	minimap: {
		overviewAriaLabel: 'Minimap overview',
		expand: 'Expand minimap',
		collapse: 'Collapse minimap'
	},
	nodeRenderer: {
		missingComponent: (type: string) => `Missing component for ${type} node.`
	},
	headerBar: {
		backLabel: 'Chats'
	},
	ghostPreview: {
		userRoleLabel: 'user'
	},
	actions: {
		badgesGroupLabel: 'Message actions',
		slashCommandsLabel: 'Slash commands'
	}
};
