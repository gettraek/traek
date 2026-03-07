/**
 * useCollab — Svelte 5 reactive wrapper around {@link CollabProvider}.
 *
 * Returns a reactive object whose `status` and `peers` properties update
 * automatically when the provider emits events. The provider is created once
 * and destroyed when the component calling useCollab is torn down.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useCollab } from '@traek/svelte'
 *   import { assignColor } from '@traek/collab'
 *
 *   let { engine } = $props()
 *
 *   const collab = useCollab(engine, {
 *     serverUrl: 'wss://collab.gettraek.com',
 *     roomId: 'conv-abc123',
 *     user: { id: 'u1', name: 'Alice', color: assignColor('u1') },
 *   })
 * </script>
 *
 * <CollabStatusIndicator provider={collab.provider} />
 * <CollabPresenceBubbles provider={collab.provider} />
 * <CollabCursorsOverlay provider={collab.provider} scale={viewport.scale} offset={viewport.offset} />
 * ```
 */

import { CollabProvider } from '@traek/collab';
import type { CollabConfig, CollabStatus, PresenceState } from '@traek/collab';
import type { TraekEngine as CoreTraekEngine } from '@traek/core';

// Accept either @traek/core or @traek/svelte TraekEngine — they share the same interface.
type TraekEngine = CoreTraekEngine;

export interface CollabHandle {
	/** The underlying provider instance. Pass to collab UI components. */
	readonly provider: CollabProvider;
	/** Reactive WebSocket connection status. */
	readonly status: CollabStatus;
	/** Reactive map of connected peers (excludes local user). */
	readonly peers: Map<number, PresenceState>;
	/** Update the local cursor position (call on pointermove in canvas space). */
	updateCursor(pos: { x: number; y: number } | null): void;
	/** Update the locally active node (call when engine.activeNodeId changes). */
	updateActiveNode(nodeId: string | null): void;
	/** Force a reconnect attempt (e.g. after network recovery). */
	reconnect(): void;
	/** Disconnect without destroying the provider. */
	disconnect(): void;
}

/**
 * Create a reactive collab session for the given engine and config.
 *
 * Must be called during component initialisation (inside `<script>` or a
 * Svelte 5 rune context) so that the cleanup `$effect` runs on destroy.
 */
export function useCollab(engine: TraekEngine, config: CollabConfig): CollabHandle {
	let provider = $state<CollabProvider>(new CollabProvider(engine as never, config));
	let status = $state<CollabStatus>('connecting');
	let peers = $state<Map<number, PresenceState>>(new Map());

	$effect(() => {
		// Sync initial values on mount / when provider changes
		status = provider.status;
		peers = new Map(provider.peers);

		const unsubStatus = provider.onStatusChange((s) => {
			status = s;
		});
		const unsubPresence = provider.onPresenceChange((updated) => {
			peers = new Map(updated);
		});

		return () => {
			unsubStatus();
			unsubPresence();
			provider.destroy();
		};
	});

	return {
		get provider() {
			return provider;
		},
		get status() {
			return status;
		},
		get peers() {
			return peers;
		},
		updateCursor(pos) {
			provider.updateCursor(pos);
		},
		updateActiveNode(nodeId) {
			provider.updateActiveNode(nodeId);
		},
		reconnect() {
			provider.reconnect();
		},
		disconnect() {
			provider.disconnect();
		}
	};
}
