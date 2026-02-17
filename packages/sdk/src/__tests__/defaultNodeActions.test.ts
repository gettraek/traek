import { describe, it, expect, vi } from 'vitest';
import {
	duplicateAction,
	deleteAction,
	createRetryAction,
	createEditAction,
	createDefaultNodeActions
} from '../lib/defaultNodeActions';
import type { Node, TraekEngine } from '../lib/TraekEngine.svelte';

function createMockNode(overrides: Partial<Node> = {}): Node {
	return {
		id: 'test-node',
		parentIds: [],
		role: 'user',
		type: 'text',
		status: 'done',
		metadata: { x: 0, y: 0, width: 300, height: 100 },
		...overrides
	} as Node;
}

function createMockEngine(overrides: Record<string, unknown> = {}): TraekEngine {
	return {
		duplicateNode: vi.fn(),
		deleteNode: vi.fn(),
		deleteNodeAndDescendants: vi.fn(),
		getDescendantCount: vi.fn().mockReturnValue(0),
		...overrides
	} as unknown as TraekEngine;
}

describe('duplicateAction', () => {
	it('should have correct id, label, and icon', () => {
		expect.assertions(3);
		expect(duplicateAction.id).toBe('duplicate');
		expect(duplicateAction.label).toBe('Duplicate');
		expect(duplicateAction.icon).toBe('solar:copy-linear');
	});

	it('should call engine.duplicateNode with node id', () => {
		expect.assertions(1);
		const node = createMockNode({ id: 'node-42' });
		const engine = createMockEngine();
		duplicateAction.handler(node, engine);
		expect(engine.duplicateNode).toHaveBeenCalledWith('node-42');
	});
});

describe('deleteAction', () => {
	it('should have correct id, label, and icon', () => {
		expect.assertions(3);
		expect(deleteAction.id).toBe('delete');
		expect(deleteAction.label).toBe('Delete');
		expect(deleteAction.icon).toBe('solar:trash-bin-minimalistic-linear');
	});

	it('should call engine.deleteNode with node id', () => {
		expect.assertions(1);
		const node = createMockNode({ id: 'node-99' });
		const engine = createMockEngine();
		deleteAction.handler(node, engine);
		expect(engine.deleteNode).toHaveBeenCalledWith('node-99');
	});

	it('should have a variants function', () => {
		expect.assertions(1);
		expect(deleteAction.variants).toBeTypeOf('function');
	});

	it('should return null from variants when descendant count is 0', () => {
		expect.assertions(1);
		const node = createMockNode();
		const engine = createMockEngine({ getDescendantCount: vi.fn().mockReturnValue(0) });
		const result = deleteAction.variants!(node, engine);
		expect(result).toBeNull();
	});

	it('should return two variants when descendant count is 1', () => {
		expect.assertions(3);
		const node = createMockNode();
		const engine = createMockEngine({ getDescendantCount: vi.fn().mockReturnValue(1) });
		const result = deleteAction.variants!(node, engine);
		expect(result).toHaveLength(2);
		expect(result![0].label).toBe('Only this node');
		expect(result![1].label).toBe('With 1 descendant');
	});

	it('should pluralize descendants label when count is greater than 1', () => {
		expect.assertions(1);
		const node = createMockNode();
		const engine = createMockEngine({ getDescendantCount: vi.fn().mockReturnValue(5) });
		const result = deleteAction.variants!(node, engine);
		expect(result![1].label).toBe('With 5 descendants');
	});

	it('should call engine.deleteNode from "Only this node" variant handler', () => {
		expect.assertions(1);
		const node = createMockNode({ id: 'node-del' });
		const engine = createMockEngine({ getDescendantCount: vi.fn().mockReturnValue(3) });
		const variants = deleteAction.variants!(node, engine);
		variants![0].handler(node, engine);
		expect(engine.deleteNode).toHaveBeenCalledWith('node-del');
	});

	it('should call engine.deleteNodeAndDescendants from "With N descendants" variant handler', () => {
		expect.assertions(1);
		const node = createMockNode({ id: 'node-del-all' });
		const engine = createMockEngine({ getDescendantCount: vi.fn().mockReturnValue(3) });
		const variants = deleteAction.variants!(node, engine);
		variants![1].handler(node, engine);
		expect(engine.deleteNodeAndDescendants).toHaveBeenCalledWith('node-del-all');
	});
});

describe('createRetryAction', () => {
	it('should return an action with correct id, label, and icon', () => {
		expect.assertions(3);
		const action = createRetryAction(vi.fn());
		expect(action.id).toBe('retry');
		expect(action.label).toBe('Retry');
		expect(action.icon).toBe('solar:refresh-linear');
	});

	it('should call the onRetry callback with node id when handler is invoked', () => {
		expect.assertions(1);
		const onRetry = vi.fn();
		const action = createRetryAction(onRetry);
		const node = createMockNode({ id: 'retry-node' });
		const engine = createMockEngine();
		action.handler(node, engine);
		expect(onRetry).toHaveBeenCalledWith('retry-node');
	});
});

describe('createEditAction', () => {
	it('should return an action with correct id, label, and icon', () => {
		expect.assertions(3);
		const action = createEditAction(vi.fn());
		expect(action.id).toBe('edit');
		expect(action.label).toBe('Edit');
		expect(action.icon).toBe('solar:pen-linear');
	});

	it('should call the onEditNode callback with node id when handler is invoked', () => {
		expect.assertions(1);
		const onEditNode = vi.fn();
		const action = createEditAction(onEditNode);
		const node = createMockNode({ id: 'edit-node' });
		const engine = createMockEngine();
		action.handler(node, engine);
		expect(onEditNode).toHaveBeenCalledWith('edit-node');
	});
});

describe('createDefaultNodeActions', () => {
	it('should always include duplicate, copy-branch, and delete actions', () => {
		expect.assertions(4);
		const actions = createDefaultNodeActions({});
		expect(actions).toHaveLength(3);
		expect(actions[0].id).toBe('duplicate');
		expect(actions[1].id).toBe('copy-branch');
		expect(actions[2].id).toBe('delete');
	});

	it('should include retry action when onRetry is provided', () => {
		expect.assertions(2);
		const actions = createDefaultNodeActions({ onRetry: vi.fn() });
		expect(actions).toHaveLength(4);
		expect(actions[3].id).toBe('retry');
	});

	it('should include edit action when onEditNode is provided', () => {
		expect.assertions(2);
		const actions = createDefaultNodeActions({ onEditNode: vi.fn() });
		expect(actions).toHaveLength(4);
		expect(actions[3].id).toBe('edit');
	});

	it('should include both retry and edit when both callbacks are provided', () => {
		expect.assertions(3);
		const actions = createDefaultNodeActions({
			onRetry: vi.fn(),
			onEditNode: vi.fn()
		});
		expect(actions).toHaveLength(5);
		expect(actions[3].id).toBe('retry');
		expect(actions[4].id).toBe('edit');
	});

	it('should maintain correct ordering: duplicate, copy-branch, delete, retry, edit', () => {
		expect.assertions(5);
		const actions = createDefaultNodeActions({
			onRetry: vi.fn(),
			onEditNode: vi.fn()
		});
		expect(actions[0].id).toBe('duplicate');
		expect(actions[1].id).toBe('copy-branch');
		expect(actions[2].id).toBe('delete');
		expect(actions[3].id).toBe('retry');
		expect(actions[4].id).toBe('edit');
	});

	it('should wire up retry callback correctly through createDefaultNodeActions', () => {
		expect.assertions(1);
		const onRetry = vi.fn();
		const actions = createDefaultNodeActions({ onRetry });
		const retryAction = actions.find((a) => a.id === 'retry')!;
		const node = createMockNode({ id: 'wired-retry' });
		const engine = createMockEngine();
		retryAction.handler(node, engine);
		expect(onRetry).toHaveBeenCalledWith('wired-retry');
	});

	it('should wire up edit callback correctly through createDefaultNodeActions', () => {
		expect.assertions(1);
		const onEditNode = vi.fn();
		const actions = createDefaultNodeActions({ onEditNode });
		const editAction = actions.find((a) => a.id === 'edit')!;
		const node = createMockNode({ id: 'wired-edit' });
		const engine = createMockEngine();
		editAction.handler(node, engine);
		expect(onEditNode).toHaveBeenCalledWith('wired-edit');
	});
});
