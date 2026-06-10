import type { TraekEngine } from '../TraekEngine.svelte';
import type { TraekTranslations } from '../i18n/types';
import { DEFAULT_TRANSLATIONS } from '../i18n/defaults';

/**
 * KeyboardNavigator - State machine for desktop keyboard navigation
 * Manages keyboard focus separate from active node selection
 */
export class KeyboardNavigator {
	/** Currently keyboard-focused node (visual focus ring), separate from activeNodeId */
	focusedNodeId = $state<string | null>(null);
	/** Whether help overlay is shown */
	showHelp = $state(false);
	/** Whether fuzzy search overlay is shown */
	showFuzzySearch = $state(false);
	/** Last keyboard navigation direction for announcements */
	lastDirection = $state<'parent' | 'child' | 'sibling' | 'root' | 'leaf' | null>(null);
	/** Chord state: stores first key of chord sequence */
	#chordState: { key: string; timestamp: number } | null = null;
	/** Chord timeout (500ms) */
	#chordTimeout = 500;

	#engine: TraekEngine;
	#onAnnounce?: (message: string) => void;
	#t: TraekTranslations['keyboardNavigator'];

	constructor(
		engine: TraekEngine,
		onAnnounce?: (message: string) => void,
		translations?: TraekTranslations
	) {
		this.#engine = engine;
		this.#onAnnounce = onAnnounce;
		this.#t = (translations ?? DEFAULT_TRANSLATIONS).keyboardNavigator;

		// Initialize focused node from engine's active node
		$effect(() => {
			if (this.#engine.activeNodeId && !this.focusedNodeId) {
				this.focusedNodeId = this.#engine.activeNodeId;
			}
		});
	}

	/**
	 * Handle keyboard events for navigation
	 * Returns true if event was handled
	 */
	handleKeyDown(e: KeyboardEvent): boolean {
		// Never handle while typing in input fields — '/' and all other keys must
		// reach the field (e.g. slash commands in the chat textarea, search inputs).
		const target = e.target as HTMLElement;
		const isInputField =
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
		if (isInputField) {
			return false;
		}

		// Don't swallow browser/OS shortcuts (Ctrl+F, Cmd+arrow, Alt+arrow, ...)
		if (e.ctrlKey || e.metaKey || e.altKey) {
			return false;
		}

		// Quick-Jump: Numbers 1-9 to jump to nth child
		if (/^[1-9]$/.test(e.key)) {
			e.preventDefault();
			this.jumpToNthChild(parseInt(e.key, 10));
			return true;
		}

		// Fuzzy Search: "/" opens fuzzy finder
		if (e.key === '/') {
			e.preventDefault();
			this.openFuzzySearch();
			return true;
		}

		// Handle chord sequences
		if (this.#chordState) {
			const secondKey = e.key.toLowerCase();
			const firstKey = this.#chordState.key;
			const elapsed = Date.now() - this.#chordState.timestamp;

			if (elapsed > this.#chordTimeout) {
				// Chord timeout expired, reset
				this.#chordState = null;
			} else {
				// Valid chord window
				e.preventDefault();
				this.#chordState = null;

				if (firstKey === 'g' && secondKey === 'g') {
					this.navigateToRoot();
					return true;
				}
				if (firstKey === 'g' && secondKey === 'e') {
					this.navigateToDeepestLeaf();
					return true;
				}

				// Unknown chord
				this.#announce(this.#t.unknownChord);
				return true;
			}
		}

		// Check if this is a chord starter
		if (e.key.toLowerCase() === 'g') {
			e.preventDefault();
			this.#chordState = { key: 'g', timestamp: Date.now() };
			this.#announce(this.#t.chordStarted('g'));
			return true;
		}

		switch (e.key) {
			case 'ArrowUp':
				e.preventDefault();
				this.navigateToParent();
				return true;

			case 'ArrowDown':
				e.preventDefault();
				this.navigateToChild();
				return true;

			case 'ArrowLeft':
				e.preventDefault();
				this.navigateToPreviousSibling();
				return true;

			case 'ArrowRight':
				e.preventDefault();
				this.navigateToNextSibling();
				return true;

			case 'Enter':
				e.preventDefault();
				this.activateFocusedNode();
				return true;

			case ' ':
				e.preventDefault();
				this.toggleCollapse();
				return true;

			case 'Home':
				e.preventDefault();
				this.navigateToRoot();
				return true;

			case 'End':
				e.preventDefault();
				this.navigateToDeepestLeaf();
				return true;

			case '?':
				e.preventDefault();
				this.toggleHelp();
				return true;

			default:
				return false;
		}
	}

	/** Navigate to parent node (Arrow Up) */
	navigateToParent(): void {
		if (!this.focusedNodeId) {
			this.focusOnFirstAvailableNode();
			return;
		}

		const parent = this.#engine.getParent(this.focusedNodeId);
		if (parent) {
			this.focusedNodeId = parent.id;
			this.lastDirection = 'parent';
			this.#announce(this.#t.navigatedToParent(this.#getNodeLabel(parent.id)));
		} else {
			this.#announce(this.#t.alreadyAtRoot);
		}
	}

	/** Navigate to first child node (Arrow Down) */
	navigateToChild(): void {
		if (!this.focusedNodeId) {
			this.focusOnFirstAvailableNode();
			return;
		}

		const children = this.#engine
			.getChildren(this.focusedNodeId)
			.filter((c) => c.type !== 'thought');
		if (children.length === 0) {
			this.#announce(this.#t.noChildren);
			return;
		}

		const firstChild = children[0];
		if (firstChild) {
			this.focusedNodeId = firstChild.id;
			this.lastDirection = 'child';
			this.#announce(this.#t.navigatedToChild(this.#getNodeLabel(firstChild.id)));
		}
	}

	/** Navigate to previous sibling (Arrow Left) */
	navigateToPreviousSibling(): void {
		if (!this.focusedNodeId) {
			this.focusOnFirstAvailableNode();
			return;
		}

		const siblings = this.#engine.getSiblings(this.focusedNodeId);
		const currentIndex = siblings.findIndex((s) => s.id === this.focusedNodeId);

		if (currentIndex > 0) {
			const prevSibling = siblings[currentIndex - 1];
			if (prevSibling) {
				this.focusedNodeId = prevSibling.id;
				this.lastDirection = 'sibling';
				this.#announce(this.#t.navigatedToPreviousSibling(this.#getNodeLabel(prevSibling.id)));
			}
		} else {
			this.#announce(this.#t.noPreviousSibling);
		}
	}

	/** Navigate to next sibling (Arrow Right) */
	navigateToNextSibling(): void {
		if (!this.focusedNodeId) {
			this.focusOnFirstAvailableNode();
			return;
		}

		const siblings = this.#engine.getSiblings(this.focusedNodeId);
		const currentIndex = siblings.findIndex((s) => s.id === this.focusedNodeId);

		if (currentIndex < siblings.length - 1) {
			const nextSibling = siblings[currentIndex + 1];
			if (nextSibling) {
				this.focusedNodeId = nextSibling.id;
				this.lastDirection = 'sibling';
				this.#announce(this.#t.navigatedToNextSibling(this.#getNodeLabel(nextSibling.id)));
			}
		} else {
			this.#announce(this.#t.noNextSibling);
		}
	}

	/** Activate the focused node (Enter) - sets it as active */
	activateFocusedNode(): void {
		if (this.focusedNodeId) {
			this.#engine.activeNodeId = this.focusedNodeId;
			this.#announce(this.#t.activatedNode(this.#getNodeLabel(this.focusedNodeId)));
		}
	}

	/** Toggle collapse state of focused node (Space) */
	toggleCollapse(): void {
		if (!this.focusedNodeId) return;

		const children = this.#engine
			.getChildren(this.focusedNodeId)
			.filter((c) => c.type !== 'thought');
		if (children.length === 0) {
			this.#announce(this.#t.noChildrenToCollapse);
			return;
		}

		this.#engine.toggleCollapse(this.focusedNodeId);
		const isCollapsed = this.#engine.isCollapsed(this.focusedNodeId);
		this.#announce(isCollapsed ? this.#t.collapsedNode : this.#t.expandedNode);
	}

	/** Navigate to root node (Home) */
	navigateToRoot(): void {
		const roots = this.#engine.getChildren(null);
		const root = roots[0];

		if (root) {
			this.focusedNodeId = root.id;
			this.lastDirection = 'root';
			this.#announce(this.#t.navigatedToRoot);
		}
	}

	/** Navigate to deepest leaf node (End) */
	navigateToDeepestLeaf(): void {
		if (!this.focusedNodeId) {
			this.focusOnFirstAvailableNode();
			return;
		}

		// Start from focused node and traverse to deepest leaf
		const leaf = this.#engine.getActiveLeaf(this.focusedNodeId);
		if (leaf && leaf.id !== this.focusedNodeId) {
			this.focusedNodeId = leaf.id;
			this.lastDirection = 'leaf';
			this.#announce(this.#t.navigatedToDeepestLeaf(this.#getNodeLabel(leaf.id)));
		} else {
			this.#announce(this.#t.alreadyAtLeaf);
		}
	}

	/** Toggle help overlay (?) */
	toggleHelp(): void {
		this.showHelp = !this.showHelp;
		this.#announce(this.showHelp ? this.#t.showingHelp : this.#t.hidingHelp);
	}

	/** Jump to nth child (1-9) */
	jumpToNthChild(n: number): void {
		if (!this.focusedNodeId) {
			this.focusOnFirstAvailableNode();
			return;
		}

		const children = this.#engine
			.getChildren(this.focusedNodeId)
			.filter((c) => c.type !== 'thought');

		if (children.length === 0) {
			this.#announce(this.#t.noChildrenAvailable);
			return;
		}

		if (n > children.length) {
			this.#announce(this.#t.onlyNChildrenAvailable(children.length));
			return;
		}

		const targetChild = children[n - 1];
		if (targetChild) {
			this.focusedNodeId = targetChild.id;
			this.lastDirection = 'child';
			this.#announce(this.#t.jumpedToChild(n, this.#getNodeLabel(targetChild.id)));
		}
	}

	/** Open fuzzy search overlay (/) */
	openFuzzySearch(): void {
		this.showFuzzySearch = true;
		this.#announce(this.#t.fuzzySearchOpened);
	}

	/** Close fuzzy search overlay */
	closeFuzzySearch(): void {
		this.showFuzzySearch = false;
		this.#announce(this.#t.fuzzySearchClosed);
	}

	/** Navigate to a node from fuzzy search */
	navigateToNodeById(nodeId: string): void {
		if (this.#engine.getNode(nodeId)) {
			this.focusedNodeId = nodeId;
			this.lastDirection = null;
			this.#announce(this.#t.navigatedTo(this.#getNodeLabel(nodeId)));
		}
	}

	/** Focus on first available node (fallback) */
	private focusOnFirstAvailableNode(): void {
		if (this.#engine.activeNodeId) {
			this.focusedNodeId = this.#engine.activeNodeId;
		} else {
			const roots = this.#engine.getChildren(null);
			const root = roots[0];
			if (root) {
				this.focusedNodeId = root.id;
			}
		}
	}

	/** Get accessible label for a node */
	#getNodeLabel(nodeId: string): string {
		const node = this.#engine.getNode(nodeId);
		if (!node) return this.#t.unknownNode;

		// For message nodes, use truncated content
		const messageNode = node as { content?: string };
		if (messageNode.content) {
			const content = messageNode.content.slice(0, 50);
			return content.length < messageNode.content.length ? `${content}...` : content;
		}

		return `${node.role} ${node.type}`;
	}

	/** Announce message to screen reader */
	#announce(message: string): void {
		this.#onAnnounce?.(message);
	}

	/** Cleanup */
	destroy(): void {
		// Currently no cleanup needed
	}
}
