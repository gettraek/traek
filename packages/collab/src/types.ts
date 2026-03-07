/**
 * @traek/collab — types
 *
 * All public types for the collaboration package.
 */

// ─── User & Presence ──────────────────────────────────────────────────────────

/** Identifies a collaborator in a shared session. */
export interface CollabUser {
	/** Stable user identifier (e.g. auth UID or UUID). */
	id: string;
	/** Display name shown in cursors and presence indicators. */
	name: string;
	/** Hex color string assigned to this user, e.g. "#7c3aed". */
	color: string;
}

/**
 * Presence state broadcast by each peer via Awareness.
 * Stored keyed by Yjs clientId.
 */
export interface PresenceState {
	user: CollabUser;
	/** Canvas-space cursor position (in pixels, pre-viewport-transform). */
	cursor: { x: number; y: number } | null;
	/** The node this user currently has focused/active. */
	activeNodeId: string | null;
	/** Timestamp (ms since epoch) when this state was last updated. */
	updatedAt: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Options passed to {@link CollabProvider}. */
export interface CollabConfig {
	/** y-websocket server URL, e.g. "wss://collab.gettraek.com". */
	serverUrl: string;
	/** Room/document identifier — determines which users share state. */
	roomId: string;
	/** The current local user. */
	user: CollabUser;
	/**
	 * Extra options forwarded verbatim to the WebsocketProvider constructor.
	 * See y-websocket docs for all available keys.
	 */
	providerOptions?: Record<string, unknown>;
	/**
	 * Milliseconds of inactivity before a remote cursor fades out of view.
	 * @default 10_000
	 */
	cursorTimeoutMs?: number;
}

// ─── Status ───────────────────────────────────────────────────────────────────

export type CollabStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// ─── Events ───────────────────────────────────────────────────────────────────

export interface CollabEvents {
	/** Connection status changed. */
	statusChange: (status: CollabStatus) => void;
	/** Presence map updated (any peer joined, left, or moved). */
	presenceChange: (peers: Map<number, PresenceState>) => void;
	/** A remote node was added or updated in the shared document. */
	nodeChange: (nodeId: string) => void;
	/** A remote node was deleted from the shared document. */
	nodeDelete: (nodeId: string) => void;
}

// ─── Serialised node ─────────────────────────────────────────────────────────

/**
 * The shape stored per-node in the Yjs Y.Map.
 * Mirrors @traek/core SerializedNode but is intentionally flat and JSON-safe.
 */
export interface CollabSerializedNode {
	id: string;
	parentIds: string[];
	content: string;
	role: 'user' | 'assistant' | 'system';
	type: string;
	status?: string;
	errorMessage?: string;
	createdAt: number;
	metaX: number;
	metaY: number;
	metaHeight?: number;
	metaTags?: string[];
	/** Arbitrary JSON-serialisable extension data. */
	data?: unknown;
}
