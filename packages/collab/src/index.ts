/**
 * @traek/collab
 *
 * Real-time collaboration for Træk: multi-user cursors, shared conversation
 * trees with CRDT conflict resolution, and presence indicators.
 *
 * Powered by Yjs with a custom WebSocket sync protocol. Framework-agnostic —
 * works with any TraekEngine (core, svelte, react, vue).
 *
 * @example
 * ```ts
 * import { CollabProvider, assignColor } from '@traek/collab'
 * import { TraekEngine } from '@traek/core'
 *
 * const engine = new TraekEngine()
 * const provider = new CollabProvider(engine, {
 *   serverUrl: 'wss://collab.gettraek.com',
 *   roomId: 'conv-abc123',
 *   user: { id: 'u1', name: 'Alice', color: assignColor('u1') },
 * })
 *
 * provider.onPresenceChange((peers) => {
 *   // render remote cursors from `peers`
 * })
 *
 * // on pointermove
 * provider.updateCursor({ x, y })
 *
 * // on unmount
 * provider.destroy()
 * ```
 */

export { CollabProvider } from './CollabProvider.js';
export { YjsWebSocketProvider } from './YjsWebSocketProvider.js';
export { Awareness } from './Awareness.js';

export type {
	CollabConfig,
	CollabStatus,
	CollabUser,
	PresenceState,
	CollabEvents,
	CollabSerializedNode
} from './types.js';

export type { ProviderOptions, ProviderStatus } from './YjsWebSocketProvider.js';

export {
	PRESENCE_COLORS,
	assignColor,
	buildPresenceState,
	getRemotePeers,
	getAllPeers,
	isPresenceState,
	filterStaleCursors
} from './presence.js';

export { serialiseNode, hasChanged } from './serialise.js';

export { MessageType, encodeMessage, decodeMessage } from './protocol.js';
