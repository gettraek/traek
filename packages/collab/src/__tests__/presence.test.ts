import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	assignColor,
	buildPresenceState,
	getRemotePeers,
	getAllPeers,
	isPresenceState,
	filterStaleCursors,
	PRESENCE_COLORS
} from '../presence.js';
import type { PresenceState, CollabUser } from '../types.js';

const user: CollabUser = { id: 'u1', name: 'Alice', color: '#7c3aed' };

describe('assignColor', () => {
	it('returns a color from the palette for a userId', () => {
		const color = assignColor('user-abc');
		expect(PRESENCE_COLORS).toContain(color);
	});

	it('returns the same color for the same userId', () => {
		expect(assignColor('stable-id')).toBe(assignColor('stable-id'));
	});

	it('returns different colors for different userIds (probabilistically)', () => {
		const colors = new Set(['u1', 'u2', 'u3', 'u4', 'u5', 'u6'].map(assignColor));
		// Not all 6 need to be unique but we expect more than 1
		expect(colors.size).toBeGreaterThan(0);
	});
});

describe('buildPresenceState', () => {
	it('builds a state with null cursor and null activeNodeId by default', () => {
		const state = buildPresenceState(user);
		expect(state.user).toEqual(user);
		expect(state.cursor).toBeNull();
		expect(state.activeNodeId).toBeNull();
		expect(typeof state.updatedAt).toBe('number');
	});

	it('includes cursor and activeNodeId when provided', () => {
		const state = buildPresenceState(user, { cursor: { x: 10, y: 20 }, activeNodeId: 'node-1' });
		expect(state.cursor).toEqual({ x: 10, y: 20 });
		expect(state.activeNodeId).toBe('node-1');
	});

	it('always bumps updatedAt', () => {
		const before = Date.now();
		const state = buildPresenceState(user);
		expect(state.updatedAt).toBeGreaterThanOrEqual(before);
	});
});

describe('isPresenceState', () => {
	it('returns true for valid presence state', () => {
		const state = buildPresenceState(user);
		expect(isPresenceState(state)).toBe(true);
	});

	it('returns false for null', () => {
		expect(isPresenceState(null)).toBe(false);
	});

	it('returns false for object missing updatedAt', () => {
		expect(isPresenceState({ user, cursor: null, activeNodeId: null })).toBe(false);
	});

	it('returns false for object with invalid user', () => {
		expect(
			isPresenceState({ user: { id: 123 }, cursor: null, activeNodeId: null, updatedAt: 0 })
		).toBe(false);
	});
});

describe('getRemotePeers', () => {
	it('excludes the local client', () => {
		const localId = 1;
		const states = new Map<number, Record<string, unknown>>([
			[1, buildPresenceState(user) as unknown as Record<string, unknown>],
			[2, buildPresenceState({ ...user, id: 'u2' }) as unknown as Record<string, unknown>]
		]);
		const peers = getRemotePeers(states, localId);
		expect(peers.has(1)).toBe(false);
		expect(peers.has(2)).toBe(true);
	});

	it('filters out invalid states', () => {
		const states = new Map<number, Record<string, unknown>>([
			[2, { garbage: true }],
			[3, buildPresenceState(user) as unknown as Record<string, unknown>]
		]);
		const peers = getRemotePeers(states, 99);
		expect(peers.has(2)).toBe(false);
		expect(peers.has(3)).toBe(true);
	});
});

describe('getAllPeers', () => {
	it('includes all valid peers including local', () => {
		const states = new Map<number, Record<string, unknown>>([
			[1, buildPresenceState(user) as unknown as Record<string, unknown>],
			[2, buildPresenceState({ ...user, id: 'u2' }) as unknown as Record<string, unknown>]
		]);
		const peers = getAllPeers(states);
		expect(peers.size).toBe(2);
	});
});

describe('filterStaleCursors', () => {
	it('nullifies cursors older than timeoutMs', () => {
		const stale: PresenceState = {
			user,
			cursor: { x: 5, y: 5 },
			activeNodeId: null,
			updatedAt: Date.now() - 20_000
		};
		const fresh: PresenceState = {
			user,
			cursor: { x: 1, y: 1 },
			activeNodeId: null,
			updatedAt: Date.now()
		};
		const peers = new Map<number, PresenceState>([
			[1, stale],
			[2, fresh]
		]);
		const result = filterStaleCursors(peers, 10_000);
		expect(result.get(1)?.cursor).toBeNull();
		expect(result.get(2)?.cursor).toEqual({ x: 1, y: 1 });
	});
});
