import type { TraekEngine } from '../TraekEngine.svelte';

/**
 * KeyboardNavigator - State machine for desktop keyboard navigation
 * Manages keyboard focus separate from active node selection
 */
export class KeyboardNavigator {
	/** Currently keyboard-focused node (visual focus ring), separate from activeNodeId */
	focusedNodeId = $state<string | null>(null);
	/** Whether help overlay is shown */
	showHelp = $state(false);
	/** Last keyboard navigation direction for announcements */
	lastDirection = $state<'parent' | 'child' | 'sibling' | 'root' | 'leaf' | null>(null);

	#engine: TraekEngine;
	#onAnnounce?: (message: string) => void;

	constructor(engine: TraekEngine, onAnnounce?: (message: string) => void) {
		this.#engine = engine;
		this.#onAnnounce = onAnnounce;

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
		// Don't handle when typing in input fields
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
			return false;
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
			this.#announce(`Navigated to parent: ${this.#getNodeLabel(parent.id)}`);
		} else {
			this.#announce('Already at root');
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
			this.#announce('No children');
			return;
		}

		const firstChild = children[0];
		if (firstChild) {
			this.focusedNodeId = firstChild.id;
			this.lastDirection = 'child';
			this.#announce(`Navigated to child: ${this.#getNodeLabel(firstChild.id)}`);
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
				this.#announce(`Navigated to previous sibling: ${this.#getNodeLabel(prevSibling.id)}`);
			}
		} else {
			this.#announce('No previous sibling');
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
				this.#announce(`Navigated to next sibling: ${this.#getNodeLabel(nextSibling.id)}`);
			}
		} else {
			this.#announce('No next sibling');
		}
	}

	/** Activate the focused node (Enter) - sets it as active */
	activateFocusedNode(): void {
		if (this.focusedNodeId) {
			this.#engine.activeNodeId = this.focusedNodeId;
			this.#announce(`Activated node: ${this.#getNodeLabel(this.focusedNodeId)}`);
		}
	}

	/** Toggle collapse state of focused node (Space) */
	toggleCollapse(): void {
		if (!this.focusedNodeId) return;

		const children = this.#engine
			.getChildren(this.focusedNodeId)
			.filter((c) => c.type !== 'thought');
		if (children.length === 0) {
			this.#announce('Node has no children to collapse');
			return;
		}

		this.#engine.toggleCollapse(this.focusedNodeId);
		const isCollapsed = this.#engine.isCollapsed(this.focusedNodeId);
		this.#announce(isCollapsed ? 'Collapsed node' : 'Expanded node');
	}

	/** Navigate to root node (Home) */
	navigateToRoot(): void {
		const roots = this.#engine.getChildren(null);
		const root = roots[0];

		if (root) {
			this.focusedNodeId = root.id;
			this.lastDirection = 'root';
			this.#announce('Navigated to root');
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
			this.#announce(`Navigated to deepest leaf: ${this.#getNodeLabel(leaf.id)}`);
		} else {
			this.#announce('Already at leaf node');
		}
	}

	/** Toggle help overlay (?) */
	toggleHelp(): void {
		this.showHelp = !this.showHelp;
		this.#announce(this.showHelp ? 'Showing keyboard shortcuts' : 'Hiding keyboard shortcuts');
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
		if (!node) return 'Unknown node';

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
