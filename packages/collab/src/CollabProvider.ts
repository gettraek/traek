/**
 * @traek/collab — CollabProvider
 *
 * The main entry point for real-time collaboration. Wraps a Yjs document,
 * manages a WebSocket connection, and bidirectionally syncs state with a
 * @traek/core TraekEngine instance.
 *
 * Usage:
 * ```ts
 * const provider = new CollabProvider(engine, {
 *   serverUrl: 'wss://collab.gettraek.com',
 *   roomId: 'conv-abc123',
 *   user: { id: 'u1', name: 'Alice', color: '#7c3aed' },
 * })
 *
 * // update local cursor position (call on pointermove)
 * provider.updateCursor({ x: 500, y: 200 })
 *
 * // clean up
 * provider.destroy()
 * ```
 */

import * as Y from 'yjs';
import { YjsWebSocketProvider } from './YjsWebSocketProvider.js';
import type { TraekEngine } from '@traek/core';
import type { Node, MessageNode } from '@traek/core';
import type {
	CollabConfig,
	CollabStatus,
	CollabSerializedNode,
	PresenceState,
	CollabUser
} from './types.js';
import {
	buildPresenceState,
	getRemotePeers,
	filterStaleCursors,
	isPresenceState
} from './presence.js';
import { serialiseNode, hasChanged } from './serialise.js';

// ─── Internal constants ───────────────────────────────────────────────────────

const Y_NODES_KEY = 'nodes';
/** Name of the shared Y.Map that stores all nodes. */

// ─── CollabProvider ───────────────────────────────────────────────────────────

/**
 * Manages real-time collaboration for a single Traek conversation.
 *
 * - Connects to a custom YjsWebSocketProvider
 * - Keeps the shared Yjs document in sync with a local TraekEngine
 * - Broadcasts presence (cursor + active node) via Awareness
 * - Emits typed events for status, presence, and node changes
 */
export class CollabProvider {
	// ─── Public state ───────────────────────────────────────────────────────

	/** Current WebSocket connection status. */
	status: CollabStatus = 'connecting';

	/**
	 * All currently connected peers, keyed by Yjs clientId.
	 * Updated on every awareness change and stale-cursor sweep.
	 */
	peers: Map<number, PresenceState> = new Map();

	// ─── Internal Yjs state ─────────────────────────────────────────────────

	readonly doc: Y.Doc;
	readonly provider: YjsWebSocketProvider;
	/** Flat map of nodeId → serialised node data. */
	private readonly yNodes: Y.Map<CollabSerializedNode>;

	private readonly engine: TraekEngine;
	private readonly config: Required<Pick<CollabConfig, 'cursorTimeoutMs'>> & CollabConfig;
	private readonly user: CollabUser;

	// ─── Sync guard ─────────────────────────────────────────────────────────

	/**
	 * Set to `true` while applying remote Yjs changes to the engine so that
	 * the engine subscriber does not re-echo them back into Yjs.
	 */
	private _applying = false;

	// ─── Event listeners ────────────────────────────────────────────────────

	private _statusListeners: Array<(status: CollabStatus) => void> = [];
	private _presenceListeners: Array<(peers: Map<number, PresenceState>) => void> = [];
	private _nodeChangeListeners: Array<(nodeId: string) => void> = [];
	private _nodeDeleteListeners: Array<(nodeId: string) => void> = [];

	// ─── Cleanup refs ────────────────────────────────────────────────────────

	private _engineUnsubscribe: (() => void) | null = null;
	private _staleTimer: ReturnType<typeof setInterval> | null = null;

	// ─── Constructor ────────────────────────────────────────────────────────

	constructor(engine: TraekEngine, config: CollabConfig) {
		this.engine = engine;
		this.config = { cursorTimeoutMs: 10_000, ...config };
		this.user = config.user;

		// ── Yjs document ───────────────────────────────────────────────────
		this.doc = new Y.Doc();
		this.yNodes = this.doc.getMap<CollabSerializedNode>(Y_NODES_KEY);

		// ── WebSocket provider ─────────────────────────────────────────────
		this.provider = new YjsWebSocketProvider(config.serverUrl, config.roomId, this.doc, {
			buildConnectionParams: config.buildConnectionParams,
			initialBackoff: config.initialBackoff,
			maxBackoff: config.maxBackoff
		});

		// ── Broadcast local presence ───────────────────────────────────────
		this.provider.awareness.setLocalState(buildPresenceState(this.user));

		// ── Listeners ──────────────────────────────────────────────────────
		this._setupStatusListener();
		this._setupAwarenessListener();
		this._setupYjsObserver();
		this._setupEngineSubscription();

		// ── Sweep stale cursors every 5 s ──────────────────────────────────
		this._staleTimer = setInterval(() => this._sweepStaleCursors(), 5_000);
	}

	// ─── Presence API ────────────────────────────────────────────────────────

	/**
	 * Update the local cursor position (call on pointermove).
	 * Coordinates should be in canvas space (before viewport transform).
	 */
	updateCursor(pos: { x: number; y: number } | null): void {
		const current = this.provider.awareness.getLocalState() as PresenceState | null;
		this.provider.awareness.setLocalState(
			buildPresenceState(this.user, {
				cursor: pos,
				activeNodeId: current?.activeNodeId ?? null
			})
		);
	}

	/**
	 * Update the locally active node (call when `engine.activeNodeId` changes).
	 */
	updateActiveNode(nodeId: string | null): void {
		const current = this.provider.awareness.getLocalState() as PresenceState | null;
		this.provider.awareness.setLocalState(
			buildPresenceState(this.user, {
				cursor: current?.cursor ?? null,
				activeNodeId: nodeId
			})
		);
	}

	/**
	 * Get the current presence state for the local user.
	 */
	getLocalPresence(): PresenceState | null {
		const state = this.provider.awareness.getLocalState();
		return isPresenceState(state) ? (state as PresenceState) : null;
	}

	// ─── Event subscription ──────────────────────────────────────────────────

	onStatusChange(fn: (status: CollabStatus) => void): () => void {
		this._statusListeners.push(fn);
		return () => {
			this._statusListeners = this._statusListeners.filter((l) => l !== fn);
		};
	}

	onPresenceChange(fn: (peers: Map<number, PresenceState>) => void): () => void {
		this._presenceListeners.push(fn);
		return () => {
			this._presenceListeners = this._presenceListeners.filter((l) => l !== fn);
		};
	}

	onNodeChange(fn: (nodeId: string) => void): () => void {
		this._nodeChangeListeners.push(fn);
		return () => {
			this._nodeChangeListeners = this._nodeChangeListeners.filter((l) => l !== fn);
		};
	}

	onNodeDelete(fn: (nodeId: string) => void): () => void {
		this._nodeDeleteListeners.push(fn);
		return () => {
			this._nodeDeleteListeners = this._nodeDeleteListeners.filter((l) => l !== fn);
		};
	}

	// ─── Snapshot helpers ────────────────────────────────────────────────────

	/**
	 * Returns the current set of node IDs in the shared document.
	 */
	getSharedNodeIds(): string[] {
		return Array.from(this.yNodes.keys());
	}

	/**
	 * Returns the raw serialised node from the shared document, if present.
	 */
	getSharedNode(id: string): CollabSerializedNode | undefined {
		return this.yNodes.get(id);
	}

	// ─── Connection control ──────────────────────────────────────────────────

	/**
	 * Force a WebSocket reconnection attempt.
	 * Useful when the app regains network access or the user explicitly retries.
	 */
	reconnect(): void {
		this.provider.connect();
	}

	/**
	 * Disconnect from the server without destroying the provider.
	 * Call {@link reconnect} to re-establish the connection.
	 */
	disconnect(): void {
		this.provider.disconnect();
	}

	// ─── Destroy ─────────────────────────────────────────────────────────────

	/**
	 * Disconnect from the WebSocket server and clean up all subscriptions.
	 * Call this when the component owning the provider unmounts.
	 */
	destroy(): void {
		if (this._staleTimer !== null) clearInterval(this._staleTimer);
		this._engineUnsubscribe?.();
		this.provider.awareness.setLocalState(null);
		this.provider.destroy();
		this.doc.destroy();
		this._statusListeners = [];
		this._presenceListeners = [];
		this._nodeChangeListeners = [];
		this._nodeDeleteListeners = [];
	}

	// ─── Private: status ─────────────────────────────────────────────────────

	private _setupStatusListener(): void {
		this.provider.on('status', (status: CollabStatus) => {
			this.status = status;
			for (const fn of this._statusListeners) fn(status);
		});
	}

	// ─── Private: awareness ──────────────────────────────────────────────────

	private _setupAwarenessListener(): void {
		this.provider.awareness.on('change', () => {
			this._refreshPeers();
		});
		// Initial peers snapshot
		this._refreshPeers();
	}

	private _refreshPeers(): void {
		const raw = this.provider.awareness.getStates() as Map<number, Record<string, unknown>>;
		const remote = getRemotePeers(raw, this.doc.clientID);
		const filtered = filterStaleCursors(remote, this.config.cursorTimeoutMs);
		this.peers = filtered;
		for (const fn of this._presenceListeners) fn(filtered);
	}

	private _sweepStaleCursors(): void {
		this._refreshPeers();
	}

	// ─── Private: Yjs → engine ───────────────────────────────────────────────

	private _setupYjsObserver(): void {
		this.yNodes.observe((event) => {
			if (event.transaction.local) return; // skip own changes

			this._applying = true;
			try {
				for (const [key, change] of event.changes.keys) {
					if (change.action === 'delete') {
						this._applyRemoteDelete(key);
					} else {
						// add or update
						const data = this.yNodes.get(key);
						if (data) this._applyRemoteNode(data);
					}
				}
			} finally {
				this._applying = false;
			}
		});
	}

	private _applyRemoteNode(data: CollabSerializedNode): void {
		const existing = this.engine.getNode(data.id);
		if (existing) {
			// Update
			this.engine.updateNode(data.id, {
				parentIds: data.parentIds,
				content: data.content,
				role: data.role,
				type: data.type,
				status: data.status as Node['status'],
				errorMessage: data.errorMessage,
				createdAt: data.createdAt,
				metadata: {
					x: data.metaX,
					y: data.metaY,
					...(data.metaHeight !== undefined && { height: data.metaHeight }),
					...(data.metaTags && { tags: data.metaTags })
				},
				data: data.data
			} as Partial<MessageNode>);
			for (const fn of this._nodeChangeListeners) fn(data.id);
		} else {
			// Add — use addNodes for proper layout
			this.engine.addNodes([
				{
					id: data.id,
					parentIds: data.parentIds,
					content: data.content,
					role: data.role,
					type: data.type,
					status: data.status as Node['status'],
					errorMessage: data.errorMessage,
					createdAt: data.createdAt,
					metadata: {
						x: data.metaX,
						y: data.metaY,
						...(data.metaHeight !== undefined && { height: data.metaHeight }),
						...(data.metaTags && { tags: data.metaTags })
					},
					data: data.data
				}
			]);
			for (const fn of this._nodeChangeListeners) fn(data.id);
		}
	}

	private _applyRemoteDelete(nodeId: string): void {
		if (this.engine.getNode(nodeId)) {
			this.engine.deleteNode(nodeId);
			for (const fn of this._nodeDeleteListeners) fn(nodeId);
		}
	}

	// ─── Private: engine → Yjs ───────────────────────────────────────────────

	private _setupEngineSubscription(): void {
		// Subscribe to all engine changes and mirror to Yjs
		this._engineUnsubscribe = this.engine.subscribe(() => {
			if (this._applying) return;
			this._syncEngineDiffToYjs();
		});
	}

	/**
	 * Computes a diff between the current engine state and the shared Yjs
	 * document, then applies it transactionally.
	 *
	 * On first sync this seeds the Yjs document from the engine. On subsequent
	 * syncs only the changed nodes are written.
	 */
	private _syncEngineDiffToYjs(): void {
		const engineNodes = this.engine.nodes;
		const engineIds = new Set(engineNodes.map((n) => n.id));
		const yjsIds = new Set(this.yNodes.keys());

		this.doc.transact(() => {
			// ── Add / update nodes present in engine ──────────────────────
			for (const node of engineNodes) {
				const serialised = serialiseNode(node);
				const existing = this.yNodes.get(node.id);
				if (!existing || hasChanged(existing, serialised)) {
					this.yNodes.set(node.id, serialised);
				}
			}

			// ── Remove nodes deleted from engine ──────────────────────────
			for (const yjsId of yjsIds) {
				if (!engineIds.has(yjsId)) {
					this.yNodes.delete(yjsId);
				}
			}
		});
	}
}
