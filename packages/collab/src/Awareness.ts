/**
 * @traek/collab — Awareness
 *
 * Manages presence state for collaborative sessions. Each client has a
 * local state (cursor position, active node, etc.) that is broadcast
 * to all connected peers via the WebSocket provider.
 *
 * Replaces y-protocols/awareness with a simpler JSON-based implementation.
 */

import { encodeAwareness } from './protocol.js';

export interface AwarenessChangeEvent {
	/** Encoded awareness message ready to send over WebSocket. Only present for local changes. */
	encodedState?: Uint8Array;
}

type AwarenessEventMap = {
	change: (event: AwarenessChangeEvent) => void;
};

export class Awareness {
	readonly clientId: number;
	private _states: Map<number, unknown> = new Map();
	private _listeners: Map<
		keyof AwarenessEventMap,
		Set<AwarenessEventMap[keyof AwarenessEventMap]>
	> = new Map();

	constructor(clientId: number) {
		this.clientId = clientId;
	}

	getLocalState(): unknown | null {
		return this._states.get(this.clientId) ?? null;
	}

	setLocalState(state: unknown | null): void {
		if (state === null) {
			this._states.delete(this.clientId);
		} else {
			this._states.set(this.clientId, state);
		}
		const encoded = encodeAwareness(this.clientId, state);
		this._emit('change', { encodedState: encoded });
	}

	getStates(): Map<number, unknown> {
		return new Map(this._states);
	}

	applyRemoteState(clientId: number, state: unknown | null): void {
		if (state === null) {
			this._states.delete(clientId);
		} else {
			this._states.set(clientId, state);
		}
		this._emit('change', {});
	}

	removeClient(clientId: number): void {
		if (!this._states.has(clientId)) return;
		this._states.delete(clientId);
		this._emit('change', {});
	}

	on<K extends keyof AwarenessEventMap>(event: K, fn: AwarenessEventMap[K]): void {
		if (!this._listeners.has(event)) this._listeners.set(event, new Set());
		this._listeners.get(event)!.add(fn);
	}

	off<K extends keyof AwarenessEventMap>(event: K, fn: AwarenessEventMap[K]): void {
		this._listeners.get(event)?.delete(fn);
	}

	destroy(): void {
		this._states.clear();
		this._listeners.clear();
	}

	private _emit<K extends keyof AwarenessEventMap>(
		event: K,
		...args: Parameters<AwarenessEventMap[K]>
	): void {
		const listeners = this._listeners.get(event);
		if (!listeners) return;
		for (const fn of listeners) {
			(fn as (...a: unknown[]) => void)(...args);
		}
	}
}
