import { describe, it, expect } from 'vitest';
import { serialiseNode, hasChanged } from '../serialise.js';
import type { Node } from '@traek/core';
import type { CollabSerializedNode } from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<Node> = {}): Node {
	return {
		id: 'n1',
		parentIds: [],
		role: 'user',
		type: 'text',
		status: 'done',
		createdAt: 1_000_000,
		metadata: { x: 0, y: 0 },
		...overrides
	} as Node;
}

// ─── serialiseNode ────────────────────────────────────────────────────────────

describe('serialiseNode', () => {
	it('maps basic fields correctly', () => {
		const node = makeNode({ id: 'abc', parentIds: ['p1'], role: 'assistant', type: 'text' });
		const s = serialiseNode(node);
		expect(s.id).toBe('abc');
		expect(s.parentIds).toEqual(['p1']);
		expect(s.role).toBe('assistant');
		expect(s.type).toBe('text');
	});

	it('extracts content from MessageNode', () => {
		const node = { ...makeNode(), content: 'hello world' } as Node;
		expect(serialiseNode(node).content).toBe('hello world');
	});

	it('defaults content to empty string when missing', () => {
		const node = makeNode(); // no content
		expect(serialiseNode(node).content).toBe('');
	});

	it('maps metadata x/y to metaX/metaY', () => {
		const node = makeNode({ metadata: { x: 5, y: 10 } });
		const s = serialiseNode(node);
		expect(s.metaX).toBe(5);
		expect(s.metaY).toBe(10);
	});

	it('includes metaHeight when metadata.height is set', () => {
		const node = makeNode({ metadata: { x: 0, y: 0, height: 200 } });
		expect(serialiseNode(node).metaHeight).toBe(200);
	});

	it('omits metaHeight when metadata.height is absent', () => {
		const node = makeNode({ metadata: { x: 0, y: 0 } });
		expect('metaHeight' in serialiseNode(node)).toBe(false);
	});

	it('includes metaTags when tags array is non-empty', () => {
		const node = makeNode({ metadata: { x: 0, y: 0, tags: ['a', 'b'] } });
		expect(serialiseNode(node).metaTags).toEqual(['a', 'b']);
	});

	it('omits metaTags when tags is empty', () => {
		const node = makeNode({ metadata: { x: 0, y: 0, tags: [] } });
		expect('metaTags' in serialiseNode(node)).toBe(false);
	});

	it('omits metaTags when tags is absent', () => {
		const node = makeNode({ metadata: { x: 0, y: 0 } });
		expect('metaTags' in serialiseNode(node)).toBe(false);
	});

	it('uses Date.now() when createdAt is missing', () => {
		const before = Date.now();
		const node = makeNode({ createdAt: undefined });
		const s = serialiseNode(node);
		const after = Date.now();
		expect(s.createdAt).toBeGreaterThanOrEqual(before);
		expect(s.createdAt).toBeLessThanOrEqual(after);
	});

	it('includes data when present', () => {
		const node = makeNode({ data: { foo: 'bar' } });
		expect(serialiseNode(node).data).toEqual({ foo: 'bar' });
	});

	it('omits data when absent', () => {
		const node = makeNode();
		expect('data' in serialiseNode(node)).toBe(false);
	});
});

// ─── hasChanged ───────────────────────────────────────────────────────────────

describe('hasChanged', () => {
	function base(): CollabSerializedNode {
		return {
			id: 'n1',
			parentIds: ['p1'],
			content: 'hello',
			role: 'user',
			type: 'text',
			status: 'done',
			createdAt: 1_000_000,
			metaX: 0,
			metaY: 0
		};
	}

	it('returns false for identical snapshots', () => {
		expect(hasChanged(base(), base())).toBe(false);
	});

	it('detects content change', () => {
		expect(hasChanged(base(), { ...base(), content: 'world' })).toBe(true);
	});

	it('detects role change', () => {
		expect(hasChanged(base(), { ...base(), role: 'assistant' })).toBe(true);
	});

	it('detects type change', () => {
		expect(hasChanged(base(), { ...base(), type: 'code' })).toBe(true);
	});

	it('detects status change', () => {
		expect(hasChanged(base(), { ...base(), status: 'streaming' })).toBe(true);
	});

	it('detects errorMessage change', () => {
		expect(hasChanged(base(), { ...base(), errorMessage: 'oops' })).toBe(true);
	});

	it('detects metaX change', () => {
		expect(hasChanged(base(), { ...base(), metaX: 99 })).toBe(true);
	});

	it('detects metaY change', () => {
		expect(hasChanged(base(), { ...base(), metaY: 99 })).toBe(true);
	});

	it('detects metaHeight change', () => {
		expect(hasChanged(base(), { ...base(), metaHeight: 300 })).toBe(true);
	});

	it('detects parentIds change', () => {
		expect(hasChanged(base(), { ...base(), parentIds: ['p1', 'p2'] })).toBe(true);
	});

	it('detects parentIds order change', () => {
		const a = { ...base(), parentIds: ['p1', 'p2'] };
		const b = { ...base(), parentIds: ['p2', 'p1'] };
		expect(hasChanged(a, b)).toBe(true);
	});

	it('returns false for same parentIds array (different reference)', () => {
		const a = { ...base(), parentIds: ['p1', 'p2'] };
		const b = { ...base(), parentIds: ['p1', 'p2'] };
		expect(hasChanged(a, b)).toBe(false);
	});
});
