import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KeyboardNavigator } from '../KeyboardNavigator.svelte';
import { TraekEngine } from '../../TraekEngine.svelte';

describe('KeyboardNavigator', () => {
	let engine: TraekEngine;
	let navigator: KeyboardNavigator;
	let announcements: string[];

	beforeEach(() => {
		engine = new TraekEngine();
		announcements = [];
		navigator = new KeyboardNavigator(engine, (msg) => announcements.push(msg));
	});

	describe('initialization', () => {
		it('should initialize with null focusedNodeId', () => {
			expect(navigator.focusedNodeId).toBeNull();
		});

		it('should initialize with showHelp false', () => {
			expect(navigator.showHelp).toBe(false);
		});
	});

	describe('navigateToParent', () => {
		it('should navigate to parent node', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'user', { parentIds: [parent.id] });
			navigator.focusedNodeId = child.id;

			navigator.navigateToParent();

			expect(navigator.focusedNodeId).toBe(parent.id);
			expect(navigator.lastDirection).toBe('parent');
			expect(announcements.length).toBeGreaterThan(0);
		});

		it('should announce when already at root', () => {
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			navigator.focusedNodeId = root.id;

			navigator.navigateToParent();

			expect(navigator.focusedNodeId).toBe(root.id);
			expect(announcements).toContain('Already at root');
		});
	});

	describe('navigateToChild', () => {
		it('should navigate to first child', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child1 = engine.addNode('Child 1', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = parent.id;

			navigator.navigateToChild();

			expect(navigator.focusedNodeId).toBe(child1.id);
			expect(navigator.lastDirection).toBe('child');
		});

		it('should announce when node has no children', () => {
			const leaf = engine.addNode('Leaf', 'user', { parentIds: [] });
			navigator.focusedNodeId = leaf.id;

			navigator.navigateToChild();

			expect(navigator.focusedNodeId).toBe(leaf.id);
			expect(announcements).toContain('No children');
		});

		it('should skip thought nodes', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			engine.addNode('Thought', 'assistant', { parentIds: [parent.id], type: 'thought' });
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = parent.id;

			navigator.navigateToChild();

			expect(navigator.focusedNodeId).toBe(child.id);
		});
	});

	describe('navigateToPreviousSibling', () => {
		it('should navigate to previous sibling', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child1 = engine.addNode('Child 1', 'assistant', { parentIds: [parent.id] });
			const child2 = engine.addNode('Child 2', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = child2.id;

			navigator.navigateToPreviousSibling();

			expect(navigator.focusedNodeId).toBe(child1.id);
			expect(navigator.lastDirection).toBe('sibling');
		});

		it('should announce when no previous sibling exists', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child1 = engine.addNode('Child 1', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = child1.id;

			navigator.navigateToPreviousSibling();

			expect(navigator.focusedNodeId).toBe(child1.id);
			expect(announcements).toContain('No previous sibling');
		});
	});

	describe('navigateToNextSibling', () => {
		it('should navigate to next sibling', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child1 = engine.addNode('Child 1', 'assistant', { parentIds: [parent.id] });
			const child2 = engine.addNode('Child 2', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = child1.id;

			navigator.navigateToNextSibling();

			expect(navigator.focusedNodeId).toBe(child2.id);
			expect(navigator.lastDirection).toBe('sibling');
		});

		it('should announce when no next sibling exists', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child2 = engine.addNode('Child 2', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = child2.id;

			navigator.navigateToNextSibling();

			expect(navigator.focusedNodeId).toBe(child2.id);
			expect(announcements).toContain('No next sibling');
		});
	});

	describe('activateFocusedNode', () => {
		it('should set engine activeNodeId to focusedNodeId', () => {
			const node = engine.addNode('Node', 'user', { parentIds: [] });
			navigator.focusedNodeId = node.id;
			engine.activeNodeId = null;

			navigator.activateFocusedNode();

			expect(engine.activeNodeId).toBe(node.id);
			expect(announcements.length).toBeGreaterThan(0);
		});
	});

	describe('toggleCollapse', () => {
		it('should toggle collapse state when node has children', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = parent.id;

			navigator.toggleCollapse();

			expect(engine.isCollapsed(parent.id)).toBe(true);
			expect(announcements).toContain('Collapsed node');

			navigator.toggleCollapse();

			expect(engine.isCollapsed(parent.id)).toBe(false);
			expect(announcements).toContain('Expanded node');
		});

		it('should announce when node has no children', () => {
			const leaf = engine.addNode('Leaf', 'user', { parentIds: [] });
			navigator.focusedNodeId = leaf.id;

			navigator.toggleCollapse();

			expect(announcements).toContain('Node has no children to collapse');
		});
	});

	describe('navigateToRoot', () => {
		it('should navigate to root node', () => {
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'user', { parentIds: [root.id] });
			navigator.focusedNodeId = child.id;

			navigator.navigateToRoot();

			expect(navigator.focusedNodeId).toBe(root.id);
			expect(navigator.lastDirection).toBe('root');
			expect(announcements).toContain('Navigated to root');
		});
	});

	describe('navigateToDeepestLeaf', () => {
		it('should navigate to deepest leaf node', () => {
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			const grandchild = engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			navigator.focusedNodeId = root.id;

			navigator.navigateToDeepestLeaf();

			expect(navigator.focusedNodeId).toBe(grandchild.id);
			expect(navigator.lastDirection).toBe('leaf');
		});

		it('should announce when already at leaf', () => {
			const leaf = engine.addNode('Leaf', 'user', { parentIds: [] });
			navigator.focusedNodeId = leaf.id;

			navigator.navigateToDeepestLeaf();

			expect(navigator.focusedNodeId).toBe(leaf.id);
			expect(announcements).toContain('Already at leaf node');
		});
	});

	describe('toggleHelp', () => {
		it('should toggle showHelp state', () => {
			expect(navigator.showHelp).toBe(false);

			navigator.toggleHelp();

			expect(navigator.showHelp).toBe(true);
			expect(announcements).toContain('Showing keyboard shortcuts');

			navigator.toggleHelp();

			expect(navigator.showHelp).toBe(false);
			expect(announcements).toContain('Hiding keyboard shortcuts');
		});
	});

	describe('handleKeyDown', () => {
		it('should handle ArrowUp to navigate to parent', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'user', { parentIds: [parent.id] });
			navigator.focusedNodeId = child.id;

			const event = {
				key: 'ArrowUp',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(navigator.focusedNodeId).toBe(parent.id);
		});

		it('should handle ArrowDown to navigate to child', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = parent.id;

			const event = {
				key: 'ArrowDown',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(navigator.focusedNodeId).toBe(child.id);
		});

		it('should handle Enter to activate node', () => {
			const node = engine.addNode('Node', 'user', { parentIds: [] });
			navigator.focusedNodeId = node.id;
			engine.activeNodeId = null;

			const event = {
				key: 'Enter',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(engine.activeNodeId).toBe(node.id);
		});

		it('should handle Space to toggle collapse', () => {
			const parent = engine.addNode('Parent', 'user', { parentIds: [] });
			engine.addNode('Child', 'assistant', { parentIds: [parent.id] });
			navigator.focusedNodeId = parent.id;

			const event = {
				key: ' ',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(engine.isCollapsed(parent.id)).toBe(true);
		});

		it('should handle Home to navigate to root', () => {
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'user', { parentIds: [root.id] });
			navigator.focusedNodeId = child.id;

			const event = {
				key: 'Home',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(navigator.focusedNodeId).toBe(root.id);
		});

		it('should handle End to navigate to deepest leaf', () => {
			const root = engine.addNode('Root', 'user', { parentIds: [] });
			const child = engine.addNode('Child', 'assistant', { parentIds: [root.id] });
			const grandchild = engine.addNode('Grandchild', 'user', { parentIds: [child.id] });
			navigator.focusedNodeId = root.id;

			const event = {
				key: 'End',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(navigator.focusedNodeId).toBe(grandchild.id);
		});

		it('should handle ? to toggle help', () => {
			const event = {
				key: '?',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(true);
			expect(event.preventDefault).toHaveBeenCalled();
			expect(navigator.showHelp).toBe(true);
		});

		it('should not handle keys when typing in input', () => {
			const event = {
				key: 'ArrowUp',
				preventDefault: vi.fn(),
				target: { tagName: 'INPUT', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(false);
		});

		it('should not handle keys when typing in textarea', () => {
			const event = {
				key: 'ArrowUp',
				preventDefault: vi.fn(),
				target: { tagName: 'TEXTAREA', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(false);
		});

		it('should return false for unhandled keys', () => {
			const event = {
				key: 'a',
				preventDefault: vi.fn(),
				target: { tagName: 'DIV', isContentEditable: false }
			} as unknown as KeyboardEvent;

			const handled = navigator.handleKeyDown(event);

			expect(handled).toBe(false);
		});
	});
});
