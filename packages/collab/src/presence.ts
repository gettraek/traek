/**
 * @traek/collab — presence utilities
 *
 * Helpers for managing and rendering collaborative presence state.
 */

import type { PresenceState, CollabUser } from './types.js';

// ─── Default user colors ──────────────────────────────────────────────────────

/** Palette of 12 distinct accessible colors assigned in round-robin order. */
export const PRESENCE_COLORS = [
	'#7c3aed', // violet
	'#2563eb', // blue
	'#059669', // emerald
	'#d97706', // amber
	'#dc2626', // red
	'#db2777', // pink
	'#0891b2', // cyan
	'#65a30d', // lime
	'#9333ea', // purple
	'#ea580c', // orange
	'#0d9488', // teal
	'#4f46e5' // indigo
] as const;

let _colorIndex = 0;

/**
 * Deterministically picks a color for a user.
 *
 * If a `userId` is provided the color is derived from a hash so the same
 * user always gets the same color across sessions. Otherwise falls back to
 * round-robin assignment.
 */
export function assignColor(userId?: string): string {
	if (userId) {
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
		}
		return PRESENCE_COLORS[hash % PRESENCE_COLORS.length];
	}
	return PRESENCE_COLORS[_colorIndex++ % PRESENCE_COLORS.length];
}

// ─── Awareness helpers ────────────────────────────────────────────────────────

/**
 * Build a {@link PresenceState} from a partial update.
 * Merges with a base state, always bumping `updatedAt`.
 */
export function buildPresenceState(
	user: CollabUser,
	partial: Partial<Omit<PresenceState, 'user' | 'updatedAt'>> = {}
): PresenceState {
	return {
		user,
		cursor: partial.cursor ?? null,
		activeNodeId: partial.activeNodeId ?? null,
		updatedAt: Date.now()
	};
}

/**
 * Filters the raw awareness states returned by `awareness.getStates()` to only
 * include entries that are valid {@link PresenceState} objects, excluding the
 * local client.
 */
export function getRemotePeers(
	states: Map<number, Record<string, unknown>>,
	localClientId: number
): Map<number, PresenceState> {
	const peers = new Map<number, PresenceState>();
	for (const [clientId, state] of states) {
		if (clientId === localClientId) continue;
		if (isPresenceState(state)) {
			peers.set(clientId, state);
		}
	}
	return peers;
}

/**
 * Returns all peers (including local) that pass the presence state guard.
 */
export function getAllPeers(
	states: Map<number, Record<string, unknown>>
): Map<number, PresenceState> {
	const peers = new Map<number, PresenceState>();
	for (const [clientId, state] of states) {
		if (isPresenceState(state)) {
			peers.set(clientId, state);
		}
	}
	return peers;
}

/** Type-guard: checks whether an awareness state object is a valid PresenceState. */
export function isPresenceState(state: unknown): state is PresenceState {
	if (typeof state !== 'object' || state === null) return false;
	const s = state as Record<string, unknown>;
	if (typeof s['updatedAt'] !== 'number') return false;
	if (typeof s['user'] !== 'object' || s['user'] === null) return false;
	const u = s['user'] as Record<string, unknown>;
	if (typeof u['id'] !== 'string') return false;
	if (typeof u['name'] !== 'string') return false;
	if (typeof u['color'] !== 'string') return false;
	return true;
}

/**
 * Filters out cursors that haven't been updated within `timeoutMs` milliseconds.
 * Returns a new map with stale cursors set to `null`.
 */
export function filterStaleCursors(
	peers: Map<number, PresenceState>,
	timeoutMs: number
): Map<number, PresenceState> {
	const now = Date.now();
	const result = new Map<number, PresenceState>();
	for (const [id, state] of peers) {
		if (now - state.updatedAt > timeoutMs) {
			result.set(id, { ...state, cursor: null });
		} else {
			result.set(id, state);
		}
	}
	return result;
}
