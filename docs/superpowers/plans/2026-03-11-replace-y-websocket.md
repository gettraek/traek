# Replace y-websocket Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove y-websocket and lib0 dependencies from `@traek/collab`, replacing them with a custom `Awareness` class and `YjsWebSocketProvider` that give full control over the WebSocket protocol, reconnection, and auth.

**Architecture:** Two new modules — `Awareness.ts` (presence state management) and `YjsWebSocketProvider.ts` (WebSocket lifecycle + Yjs sync protocol). CollabProvider swaps its import and gains typed config options. A minimal binary protocol (3 message types) handles sync and awareness over one WebSocket.

**Tech Stack:** TypeScript, Yjs (kept), Vitest, WebSocket API

**Spec:** `docs/superpowers/specs/2026-03-11-replace-y-websocket-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `packages/collab/src/Awareness.ts` | Presence state store, event emitter, JSON encode/decode |
| Create | `packages/collab/src/YjsWebSocketProvider.ts` | WebSocket lifecycle, Yjs sync protocol, reconnection with backoff |
| Create | `packages/collab/src/protocol.ts` | Message framing: encode/decode the 3 binary message types |
| Create | `packages/collab/src/__tests__/Awareness.test.ts` | Unit tests for Awareness |
| Create | `packages/collab/src/__tests__/protocol.test.ts` | Unit tests for message encoding/decoding |
| Create | `packages/collab/src/__tests__/YjsWebSocketProvider.test.ts` | Unit tests for provider (mocked WebSocket) |
| Modify | `packages/collab/src/types.ts` | Update `CollabConfig` — remove `providerOptions`, add typed fields |
| Modify | `packages/collab/src/CollabProvider.ts` | Swap y-websocket import for custom provider |
| Modify | `packages/collab/src/index.ts` | Update exports, remove y-websocket reference in JSDoc |
| Modify | `packages/collab/package.json` | Remove `y-websocket` and `lib0` from dependencies |

---

## Chunk 1: Protocol and Awareness

### Task 1: Binary Protocol Encoding/Decoding

**Files:**
- Create: `packages/collab/src/protocol.ts`
- Create: `packages/collab/src/__tests__/protocol.test.ts`

- [ ] **Step 1: Write failing tests for protocol encoding**

Create `packages/collab/src/__tests__/protocol.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
	MessageType,
	encodeMessage,
	decodeMessage,
	encodeAwareness,
	decodeAwareness
} from '../protocol.js';

describe('encodeMessage / decodeMessage', () => {
	it('encodes and decodes a StateVector message', () => {
		const payload = new Uint8Array([1, 2, 3, 4]);
		const encoded = encodeMessage(MessageType.StateVector, payload);
		const decoded = decodeMessage(encoded);
		expect(decoded.type).toBe(MessageType.StateVector);
		expect(decoded.payload).toEqual(payload);
	});

	it('encodes and decodes an Update message', () => {
		const payload = new Uint8Array([10, 20, 30]);
		const encoded = encodeMessage(MessageType.Update, payload);
		const decoded = decodeMessage(encoded);
		expect(decoded.type).toBe(MessageType.Update);
		expect(decoded.payload).toEqual(payload);
	});

	it('encodes and decodes an Awareness message', () => {
		const payload = new Uint8Array([99]);
		const encoded = encodeMessage(MessageType.Awareness, payload);
		const decoded = decodeMessage(encoded);
		expect(decoded.type).toBe(MessageType.Awareness);
		expect(decoded.payload).toEqual(payload);
	});

	it('first byte is the message type', () => {
		const encoded = encodeMessage(MessageType.Update, new Uint8Array([5]));
		expect(encoded[0]).toBe(MessageType.Update);
	});

	it('throws on unknown message type during decode', () => {
		const bad = new Uint8Array([99, 1, 2]);
		expect(() => decodeMessage(bad)).toThrow();
	});

	it('handles empty payload', () => {
		const encoded = encodeMessage(MessageType.StateVector, new Uint8Array(0));
		const decoded = decodeMessage(encoded);
		expect(decoded.payload.length).toBe(0);
	});
});

describe('encodeAwareness / decodeAwareness', () => {
	it('round-trips a state with clientId', () => {
		const encoded = encodeAwareness(42, { user: 'Alice' });
		const decoded = decodeAwareness(encoded);
		expect(decoded.clientId).toBe(42);
		expect(decoded.state).toEqual({ user: 'Alice' });
	});

	it('round-trips a null state (client departure)', () => {
		const encoded = encodeAwareness(7, null);
		const decoded = decodeAwareness(encoded);
		expect(decoded.clientId).toBe(7);
		expect(decoded.state).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/collab && npx vitest run src/__tests__/protocol.test.ts`
Expected: FAIL — module `../protocol.js` not found

- [ ] **Step 3: Implement protocol module**

Create `packages/collab/src/protocol.ts`:

```ts
/**
 * @traek/collab — protocol
 *
 * Minimal binary framing for Yjs sync and awareness messages over WebSocket.
 * First byte = message type, rest = payload.
 */

export enum MessageType {
	StateVector = 0,
	Update = 1,
	Awareness = 2
}

const VALID_TYPES = new Set([
	MessageType.StateVector,
	MessageType.Update,
	MessageType.Awareness
]);

export interface DecodedMessage {
	type: MessageType;
	payload: Uint8Array;
}

export function encodeMessage(type: MessageType, payload: Uint8Array): Uint8Array {
	const msg = new Uint8Array(1 + payload.length);
	msg[0] = type;
	msg.set(payload, 1);
	return msg;
}

export function decodeMessage(data: Uint8Array): DecodedMessage {
	if (data.length === 0) throw new Error('Empty message');
	const type = data[0] as MessageType;
	if (!VALID_TYPES.has(type)) throw new Error(`Unknown message type: ${type}`);
	return { type, payload: data.subarray(1) };
}

export interface AwarenessMessage {
	clientId: number;
	state: unknown | null;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeAwareness(clientId: number, state: unknown | null): Uint8Array {
	const json: AwarenessMessage = { clientId, state };
	return encoder.encode(JSON.stringify(json));
}

export function decodeAwareness(data: Uint8Array): AwarenessMessage {
	return JSON.parse(decoder.decode(data)) as AwarenessMessage;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/collab && npx vitest run src/__tests__/protocol.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/collab/src/protocol.ts packages/collab/src/__tests__/protocol.test.ts
git commit -m "feat(collab): add binary protocol encoding for Yjs sync messages"
```

---

### Task 2: Awareness Class

**Files:**
- Create: `packages/collab/src/Awareness.ts`
- Create: `packages/collab/src/__tests__/Awareness.test.ts`

- [ ] **Step 1: Write failing tests for Awareness**

Create `packages/collab/src/__tests__/Awareness.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Awareness } from '../Awareness.js';

describe('Awareness', () => {
	it('starts with no local state', () => {
		const a = new Awareness(1);
		expect(a.getLocalState()).toBeNull();
	});

	it('setLocalState / getLocalState round-trip', () => {
		const a = new Awareness(1);
		a.setLocalState({ name: 'Alice' });
		expect(a.getLocalState()).toEqual({ name: 'Alice' });
	});

	it('setLocalState(null) clears local state', () => {
		const a = new Awareness(1);
		a.setLocalState({ name: 'Alice' });
		a.setLocalState(null);
		expect(a.getLocalState()).toBeNull();
	});

	it('getStates includes local state', () => {
		const a = new Awareness(1);
		a.setLocalState({ name: 'Alice' });
		expect(a.getStates().get(1)).toEqual({ name: 'Alice' });
	});

	it('getStates does not include null local state', () => {
		const a = new Awareness(1);
		expect(a.getStates().has(1)).toBe(false);
	});

	it('applyRemoteState adds a remote peer', () => {
		const a = new Awareness(1);
		a.applyRemoteState(2, { name: 'Bob' });
		expect(a.getStates().get(2)).toEqual({ name: 'Bob' });
	});

	it('applyRemoteState with null removes a peer', () => {
		const a = new Awareness(1);
		a.applyRemoteState(2, { name: 'Bob' });
		a.applyRemoteState(2, null);
		expect(a.getStates().has(2)).toBe(false);
	});

	it('removeClient removes a peer', () => {
		const a = new Awareness(1);
		a.applyRemoteState(2, { name: 'Bob' });
		a.removeClient(2);
		expect(a.getStates().has(2)).toBe(false);
	});

	it('emits change event on setLocalState', () => {
		const a = new Awareness(1);
		const fn = vi.fn();
		a.on('change', fn);
		a.setLocalState({ name: 'Alice' });
		expect(fn).toHaveBeenCalledOnce();
	});

	it('emits change event on applyRemoteState', () => {
		const a = new Awareness(1);
		const fn = vi.fn();
		a.on('change', fn);
		a.applyRemoteState(2, { name: 'Bob' });
		expect(fn).toHaveBeenCalledOnce();
	});

	it('emits change event on removeClient', () => {
		const a = new Awareness(1);
		a.applyRemoteState(2, { name: 'Bob' });
		const fn = vi.fn();
		a.on('change', fn);
		a.removeClient(2);
		expect(fn).toHaveBeenCalledOnce();
	});

	it('does not emit change when removing non-existent client', () => {
		const a = new Awareness(1);
		const fn = vi.fn();
		a.on('change', fn);
		a.removeClient(99);
		expect(fn).not.toHaveBeenCalled();
	});

	it('setLocalState emits with encodedState for sending', () => {
		const a = new Awareness(1);
		const fn = vi.fn();
		a.on('change', fn);
		a.setLocalState({ x: 1 });
		expect(fn).toHaveBeenCalledWith(
			expect.objectContaining({ encodedState: expect.any(Uint8Array) })
		);
	});

	it('setLocalState(null) emits with encodedState (removal)', () => {
		const a = new Awareness(1);
		a.setLocalState({ x: 1 });
		const fn = vi.fn();
		a.on('change', fn);
		a.setLocalState(null);
		expect(fn).toHaveBeenCalledWith(
			expect.objectContaining({ encodedState: expect.any(Uint8Array) })
		);
	});

	it('off removes a listener', () => {
		const a = new Awareness(1);
		const fn = vi.fn();
		a.on('change', fn);
		a.off('change', fn);
		a.setLocalState({ x: 1 });
		expect(fn).not.toHaveBeenCalled();
	});

	it('destroy clears all state and listeners', () => {
		const a = new Awareness(1);
		a.setLocalState({ x: 1 });
		a.applyRemoteState(2, { y: 2 });
		const fn = vi.fn();
		a.on('change', fn);
		a.destroy();
		expect(a.getStates().size).toBe(0);
		expect(a.getLocalState()).toBeNull();
		// listener should have been removed
		a.applyRemoteState(3, { z: 3 });
		expect(fn).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/collab && npx vitest run src/__tests__/Awareness.test.ts`
Expected: FAIL — module `../Awareness.js` not found

- [ ] **Step 3: Implement Awareness class**

Create `packages/collab/src/Awareness.ts`:

```ts
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
	private _listeners: Map<keyof AwarenessEventMap, Set<AwarenessEventMap[keyof AwarenessEventMap]>> = new Map();

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/collab && npx vitest run src/__tests__/Awareness.test.ts`
Expected: All 16 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/collab/src/Awareness.ts packages/collab/src/__tests__/Awareness.test.ts
git commit -m "feat(collab): add Awareness class replacing y-protocols awareness"
```

---

## Chunk 2: WebSocket Provider

### Task 3: YjsWebSocketProvider

**Files:**
- Create: `packages/collab/src/YjsWebSocketProvider.ts`
- Create: `packages/collab/src/__tests__/YjsWebSocketProvider.test.ts`

- [ ] **Step 1: Write failing tests for YjsWebSocketProvider**

Create `packages/collab/src/__tests__/YjsWebSocketProvider.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Y from 'yjs';
import { YjsWebSocketProvider } from '../YjsWebSocketProvider.js';
import { MessageType, encodeMessage, decodeMessage, encodeAwareness, decodeAwareness } from '../protocol.js';

// ── Mock WebSocket ──────────────────────────────────────────────────────────

class MockWebSocket {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSING = 2;
	static readonly CLOSED = 3;

	readonly CONNECTING = 0;
	readonly OPEN = 1;
	readonly CLOSING = 2;
	readonly CLOSED = 3;

	readyState = MockWebSocket.CONNECTING;
	url: string;
	binaryType = 'arraybuffer';
	sent: Uint8Array[] = [];

	onopen: ((ev: Event) => void) | null = null;
	onclose: ((ev: CloseEvent) => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onerror: ((ev: Event) => void) | null = null;

	constructor(url: string) {
		this.url = url;
	}

	send(data: ArrayBufferLike | Uint8Array): void {
		this.sent.push(new Uint8Array(data instanceof ArrayBuffer ? data : data));
	}

	close(): void {
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.(new CloseEvent('close'));
	}

	// Test helpers
	simulateOpen(): void {
		this.readyState = MockWebSocket.OPEN;
		this.onopen?.(new Event('open'));
	}

	simulateMessage(data: Uint8Array): void {
		this.onmessage?.(new MessageEvent('message', { data: data.buffer }));
	}

	simulateError(): void {
		this.onerror?.(new Event('error'));
	}
}

let mockWs: MockWebSocket;

beforeEach(() => {
	vi.stubGlobal('WebSocket', class extends MockWebSocket {
		constructor(url: string) {
			super(url);
			mockWs = this;
		}
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('YjsWebSocketProvider', () => {
	it('connects to serverUrl/roomId on creation', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		expect(mockWs.url).toBe('ws://localhost:1234/room-1');
		provider.destroy();
	});

	it('emits "connecting" status initially', () => {
		const doc = new Y.Doc();
		const fn = vi.fn();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		provider.on('status', fn);
		// Status should have been set during construction
		expect(provider.status).toBe('connecting');
		provider.destroy();
	});

	it('emits "connected" when WebSocket opens', () => {
		const doc = new Y.Doc();
		const fn = vi.fn();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		provider.on('status', fn);
		mockWs.simulateOpen();
		expect(fn).toHaveBeenCalledWith('connected');
		expect(provider.status).toBe('connected');
		provider.destroy();
	});

	it('sends state vector after connecting', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		expect(mockWs.sent.length).toBeGreaterThanOrEqual(1);
		const decoded = decodeMessage(mockWs.sent[0]);
		expect(decoded.type).toBe(MessageType.StateVector);
		provider.destroy();
	});

	it('applies incoming Update messages to the doc', () => {
		const doc1 = new Y.Doc();
		const doc2 = new Y.Doc();
		// Make doc2 have some content
		doc2.getMap('test').set('key', 'value');
		const update = Y.encodeStateAsUpdate(doc2);

		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc1);
		mockWs.simulateOpen();
		mockWs.simulateMessage(encodeMessage(MessageType.Update, update));

		expect(doc1.getMap('test').get('key')).toBe('value');
		provider.destroy();
	});

	it('responds to incoming StateVector with an Update', () => {
		const doc = new Y.Doc();
		doc.getMap('test').set('key', 'local');

		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		const sentBefore = mockWs.sent.length;

		// Server sends its state vector
		const remoteSv = Y.encodeStateVector(new Y.Doc());
		mockWs.simulateMessage(encodeMessage(MessageType.StateVector, remoteSv));

		// Client should respond with an update
		expect(mockWs.sent.length).toBeGreaterThan(sentBefore);
		const lastSent = decodeMessage(mockWs.sent[mockWs.sent.length - 1]);
		expect(lastSent.type).toBe(MessageType.Update);
		provider.destroy();
	});

	it('forwards local doc updates to the WebSocket', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		const sentBefore = mockWs.sent.length;

		doc.getMap('test').set('key', 'new');

		expect(mockWs.sent.length).toBeGreaterThan(sentBefore);
		const lastSent = decodeMessage(mockWs.sent[mockWs.sent.length - 1]);
		expect(lastSent.type).toBe(MessageType.Update);
		provider.destroy();
	});

	it('emits "disconnected" on WebSocket close', () => {
		const doc = new Y.Doc();
		const fn = vi.fn();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		provider.on('status', fn);
		mockWs.simulateOpen();
		fn.mockClear();
		mockWs.close();
		expect(fn).toHaveBeenCalledWith('disconnected');
		provider.destroy();
	});

	it('emits "error" on WebSocket error', () => {
		const doc = new Y.Doc();
		const fn = vi.fn();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		provider.on('status', fn);
		mockWs.simulateError();
		expect(fn).toHaveBeenCalledWith('error');
		provider.destroy();
	});

	it('disconnect() closes the WebSocket and stops reconnection', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		provider.disconnect();
		expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
		provider.destroy();
	});

	it('connect() re-opens after disconnect()', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		provider.disconnect();
		const oldWs = mockWs;
		provider.connect();
		expect(mockWs).not.toBe(oldWs);
		provider.destroy();
	});

	it('exposes awareness instance', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		expect(provider.awareness).toBeDefined();
		expect(typeof provider.awareness.setLocalState).toBe('function');
		provider.destroy();
	});

	it('sends awareness updates through the WebSocket', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		const sentBefore = mockWs.sent.length;

		provider.awareness.setLocalState({ name: 'Alice' });

		const awarenessMsgs = mockWs.sent.slice(sentBefore).filter(
			(m) => decodeMessage(m).type === MessageType.Awareness
		);
		expect(awarenessMsgs.length).toBe(1);
		provider.destroy();
	});

	it('clears remote peers from awareness on WebSocket close', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();

		// Simulate two remote peers via awareness
		const peer1 = encodeAwareness(10, { name: 'Bob' });
		const peer2 = encodeAwareness(20, { name: 'Carol' });
		mockWs.simulateMessage(encodeMessage(MessageType.Awareness, peer1));
		mockWs.simulateMessage(encodeMessage(MessageType.Awareness, peer2));
		expect(provider.awareness.getStates().has(10)).toBe(true);
		expect(provider.awareness.getStates().has(20)).toBe(true);

		// WebSocket closes — peers should be cleaned up
		mockWs.close();
		expect(provider.awareness.getStates().has(10)).toBe(false);
		expect(provider.awareness.getStates().has(20)).toBe(false);
		provider.destroy();
	});

	it('destroy() stops forwarding doc updates', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();
		provider.destroy();

		const sentBefore = mockWs.sent.length;
		doc.getMap('test').set('key', 'after-destroy');
		expect(mockWs.sent.length).toBe(sentBefore);
	});

	it('applies incoming awareness messages', () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc);
		mockWs.simulateOpen();

		// Simulate remote awareness
		const awarenessPayload = encodeAwareness(99, { name: 'Bob' });
		mockWs.simulateMessage(encodeMessage(MessageType.Awareness, awarenessPayload));

		expect(provider.awareness.getStates().get(99)).toEqual({ name: 'Bob' });
		provider.destroy();
	});

	it('appends connectionParams as query string', async () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc, {
			buildConnectionParams: () => ({ token: 'abc', org: 'x' })
		});
		expect(mockWs.url).toBe('ws://localhost:1234/room-1?token=abc&org=x');
		provider.destroy();
	});

	it('supports async buildConnectionParams', async () => {
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc, {
			buildConnectionParams: async () => ({ token: 'async-tok' })
		});
		// Wait for async connect
		await vi.waitFor(() => {
			expect(mockWs.url).toBe('ws://localhost:1234/room-1?token=async-tok');
		});
		provider.destroy();
	});
});

describe('reconnection', () => {
	it('attempts reconnect after unexpected close', async () => {
		vi.useFakeTimers();
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc, {
			initialBackoff: 100,
			maxBackoff: 1000
		});
		mockWs.simulateOpen();
		const firstWs = mockWs;
		mockWs.close(); // unexpected close

		// Advance past the first backoff
		await vi.advanceTimersByTimeAsync(200);
		expect(mockWs).not.toBe(firstWs);
		provider.destroy();
		vi.useRealTimers();
	});

	it('does not reconnect after explicit disconnect()', async () => {
		vi.useFakeTimers();
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc, {
			initialBackoff: 50
		});
		mockWs.simulateOpen();
		const firstWs = mockWs;
		provider.disconnect();

		await vi.advanceTimersByTimeAsync(200);
		// Should still be the same (closed) WebSocket — no reconnection
		expect(mockWs).toBe(firstWs);
		provider.destroy();
		vi.useRealTimers();
	});

	it('escalates backoff on repeated failures', async () => {
		vi.useFakeTimers();
		// Deterministic jitter: always use max jitter (factor = 1.0)
		vi.spyOn(Math, 'random').mockReturnValue(0.5);
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc, {
			initialBackoff: 100,
			maxBackoff: 5000
		});
		// First close — should schedule with ~100ms backoff
		mockWs.close();
		const ws1 = mockWs;
		// At 50ms — not yet reconnected
		await vi.advanceTimersByTimeAsync(50);
		expect(mockWs).toBe(ws1);
		// At 100ms — reconnected (jitter = 100 * (0.5 + 0.5) = 100)
		await vi.advanceTimersByTimeAsync(50);
		expect(mockWs).not.toBe(ws1);

		// Second close — should schedule with ~200ms backoff
		const ws2 = mockWs;
		mockWs.close();
		await vi.advanceTimersByTimeAsync(150);
		expect(mockWs).toBe(ws2); // not yet
		await vi.advanceTimersByTimeAsync(100);
		expect(mockWs).not.toBe(ws2); // now reconnected

		provider.destroy();
		vi.useRealTimers();
	});

	it('resets backoff after successful connection', async () => {
		vi.useFakeTimers();
		const doc = new Y.Doc();
		const provider = new YjsWebSocketProvider('ws://localhost:1234', 'room-1', doc, {
			initialBackoff: 100,
			maxBackoff: 5000
		});
		// First connection succeeds
		mockWs.simulateOpen();
		// Then drops
		mockWs.close();
		// Reconnects
		await vi.advanceTimersByTimeAsync(200);
		// New connection succeeds — backoff should reset
		mockWs.simulateOpen();
		// Drop again
		mockWs.close();
		const wsAfterSecondDrop = mockWs;
		// Should reconnect quickly (initial backoff, not escalated)
		await vi.advanceTimersByTimeAsync(200);
		expect(mockWs).not.toBe(wsAfterSecondDrop);
		provider.destroy();
		vi.useRealTimers();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/collab && npx vitest run src/__tests__/YjsWebSocketProvider.test.ts`
Expected: FAIL — module `../YjsWebSocketProvider.js` not found

- [ ] **Step 3: Implement YjsWebSocketProvider**

Create `packages/collab/src/YjsWebSocketProvider.ts`:

```ts
/**
 * @traek/collab — YjsWebSocketProvider
 *
 * Custom WebSocket provider for Yjs document sync. Replaces y-websocket
 * with full control over the connection lifecycle, protocol, and reconnection.
 */

import * as Y from 'yjs';
import { Awareness } from './Awareness.js';
import {
	MessageType,
	encodeMessage,
	decodeMessage,
	decodeAwareness
} from './protocol.js';

export type ProviderStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ProviderOptions {
	buildConnectionParams?: () => Record<string, string> | Promise<Record<string, string>>;
	initialBackoff?: number;
	maxBackoff?: number;
}

type StatusListener = (status: ProviderStatus) => void;

export class YjsWebSocketProvider {
	readonly awareness: Awareness;
	status: ProviderStatus = 'connecting';

	private readonly _serverUrl: string;
	private readonly _roomId: string;
	private readonly _doc: Y.Doc;
	private readonly _options: Required<ProviderOptions>;

	private _ws: WebSocket | null = null;
	private _intentionalDisconnect = false;
	private _currentBackoff: number;
	private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private _statusListeners: Set<StatusListener> = new Set();
	private _updateHandler: (update: Uint8Array, origin: unknown) => void;
	private _awarenessHandler: (event: { encodedState?: Uint8Array }) => void;
	private _destroyed = false;
	/** Track remote clientIds seen via awareness, so we can clean up on disconnect. */
	private _remotePeers: Set<number> = new Set();

	constructor(serverUrl: string, roomId: string, doc: Y.Doc, options?: ProviderOptions) {
		this._serverUrl = serverUrl;
		this._roomId = roomId;
		this._doc = doc;
		this._options = {
			buildConnectionParams: options?.buildConnectionParams ?? (() => ({})),
			initialBackoff: options?.initialBackoff ?? 100,
			maxBackoff: options?.maxBackoff ?? 30_000
		};
		this._currentBackoff = this._options.initialBackoff;

		this.awareness = new Awareness(doc.clientID);

		// Forward local doc updates to the WebSocket
		this._updateHandler = (update: Uint8Array, origin: unknown) => {
			if (origin === this) return; // skip updates we applied ourselves
			this._send(encodeMessage(MessageType.Update, update));
		};
		this._doc.on('update', this._updateHandler);

		// Forward local awareness changes to the WebSocket
		this._awarenessHandler = (event) => {
			if (event.encodedState) {
				this._send(encodeMessage(MessageType.Awareness, event.encodedState));
			}
		};
		this.awareness.on('change', this._awarenessHandler);

		this._connect();
	}

	on(event: 'status', fn: StatusListener): void {
		this._statusListeners.add(fn);
	}

	off(event: 'status', fn: StatusListener): void {
		this._statusListeners.delete(fn);
	}

	connect(): void {
		this._intentionalDisconnect = false;
		this._currentBackoff = this._options.initialBackoff;
		this._connect();
	}

	disconnect(): void {
		this._intentionalDisconnect = true;
		this._clearReconnectTimer();
		this._ws?.close();
	}

	destroy(): void {
		this._destroyed = true;
		this.disconnect();
		this._doc.off('update', this._updateHandler);
		this.awareness.off('change', this._awarenessHandler);
		this.awareness.destroy();
		this._statusListeners.clear();
	}

	private async _connect(): Promise<void> {
		if (this._destroyed) return;
		if (this._ws?.readyState === WebSocket.OPEN || this._ws?.readyState === WebSocket.CONNECTING) {
			return;
		}

		this._setStatus('connecting');

		let url = `${this._serverUrl}/${this._roomId}`;
		const params = await this._options.buildConnectionParams();
		const qs = new URLSearchParams(params).toString();
		if (qs) url += `?${qs}`;

		const ws = new WebSocket(url);
		ws.binaryType = 'arraybuffer';
		this._ws = ws;

		ws.onopen = () => {
			this._setStatus('connected');
			this._currentBackoff = this._options.initialBackoff;
			// Send our state vector so the server can respond with missing updates
			const sv = Y.encodeStateVector(this._doc);
			this._send(encodeMessage(MessageType.StateVector, sv));
		};

		ws.onmessage = (ev: MessageEvent) => {
			const data = new Uint8Array(ev.data as ArrayBuffer);
			this._handleMessage(data);
		};

		ws.onclose = () => {
			// Clean up awareness for all remote peers connected via this socket
			for (const peerId of this._remotePeers) {
				this.awareness.removeClient(peerId);
			}
			this._remotePeers.clear();

			this._setStatus('disconnected');
			if (!this._intentionalDisconnect && !this._destroyed) {
				this._scheduleReconnect();
			}
		};

		ws.onerror = () => {
			this._setStatus('error');
		};
	}

	private _handleMessage(data: Uint8Array): void {
		const { type, payload } = decodeMessage(data);
		switch (type) {
			case MessageType.StateVector: {
				// Remote sent their state vector — respond with our update
				const update = Y.encodeStateAsUpdate(this._doc, payload);
				this._send(encodeMessage(MessageType.Update, update));
				break;
			}
			case MessageType.Update: {
				Y.applyUpdate(this._doc, payload, this);
				break;
			}
			case MessageType.Awareness: {
				const { clientId, state } = decodeAwareness(payload);
				if (state !== null) {
					this._remotePeers.add(clientId);
				} else {
					this._remotePeers.delete(clientId);
				}
				this.awareness.applyRemoteState(clientId, state);
				break;
			}
		}
	}

	private _send(data: Uint8Array): void {
		if (this._ws?.readyState === WebSocket.OPEN) {
			this._ws.send(data);
		}
	}

	private _scheduleReconnect(): void {
		this._clearReconnectTimer();
		const jitter = this._currentBackoff * (0.5 + Math.random() * 0.5);
		this._reconnectTimer = setTimeout(() => {
			this._connect();
		}, jitter);
		this._currentBackoff = Math.min(this._currentBackoff * 2, this._options.maxBackoff);
	}

	private _clearReconnectTimer(): void {
		if (this._reconnectTimer !== null) {
			clearTimeout(this._reconnectTimer);
			this._reconnectTimer = null;
		}
	}

	private _setStatus(status: ProviderStatus): void {
		this.status = status;
		for (const fn of this._statusListeners) fn(status);
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/collab && npx vitest run src/__tests__/YjsWebSocketProvider.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/collab/src/YjsWebSocketProvider.ts packages/collab/src/__tests__/YjsWebSocketProvider.test.ts
git commit -m "feat(collab): add YjsWebSocketProvider replacing y-websocket"
```

---

## Chunk 3: Integration — Swap Dependencies

### Task 4: Update types.ts — Replace providerOptions with typed config

**Files:**
- Modify: `packages/collab/src/types.ts:36-53`

- [ ] **Step 1: Update CollabConfig in types.ts**

Replace the `CollabConfig` interface. Remove `providerOptions`, add `buildConnectionParams`, `initialBackoff`, `maxBackoff`:

```ts
/** Options passed to {@link CollabProvider}. */
export interface CollabConfig {
	/** WebSocket server URL, e.g. "wss://collab.gettraek.com". */
	serverUrl: string;
	/** Room/document identifier — determines which users share state. */
	roomId: string;
	/** The current local user. */
	user: CollabUser;
	/**
	 * Called before each connection attempt. Returned key-value pairs are
	 * appended as URL query parameters (e.g. `?token=abc`).
	 */
	buildConnectionParams?: () => Record<string, string> | Promise<Record<string, string>>;
	/** Initial reconnect delay in ms. @default 100 */
	initialBackoff?: number;
	/** Maximum reconnect delay in ms. @default 30_000 */
	maxBackoff?: number;
	/**
	 * Milliseconds of inactivity before a remote cursor fades out of view.
	 * @default 10_000
	 */
	cursorTimeoutMs?: number;
}
```

- [ ] **Step 2: Run type check**

Run: `cd packages/collab && npx tsc --noEmit`
Expected: Errors in `CollabProvider.ts` (still imports y-websocket). This is expected — we fix it in the next task.

- [ ] **Step 3: Commit**

```bash
git add packages/collab/src/types.ts
git commit -m "refactor(collab): replace providerOptions with typed config fields"
```

---

### Task 5: Swap CollabProvider to use custom provider

**Files:**
- Modify: `packages/collab/src/CollabProvider.ts`

- [ ] **Step 1: Rewrite CollabProvider imports and constructor**

Replace the full file content. Key changes:
- Import `YjsWebSocketProvider` instead of `WebsocketProvider` from y-websocket
- Change `this.provider` type to `YjsWebSocketProvider`
- Pass typed config to provider constructor
- Simplify `_setupStatusListeners` to single `on('status')` handler
- Use `provider.destroy()` in `destroy()`

```ts
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

// ─── CollabProvider ───────────────────────────────────────────────────────────

/**
 * Manages real-time collaboration for a single Traek conversation.
 *
 * - Connects to a WebSocket server using a custom Yjs sync protocol
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
		this.provider = new YjsWebSocketProvider(
			config.serverUrl,
			config.roomId,
			this.doc,
			{
				buildConnectionParams: config.buildConnectionParams,
				initialBackoff: config.initialBackoff,
				maxBackoff: config.maxBackoff
			}
		);

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

	updateCursor(pos: { x: number; y: number } | null): void {
		const current = this.provider.awareness.getLocalState() as PresenceState | null;
		this.provider.awareness.setLocalState(
			buildPresenceState(this.user, {
				cursor: pos,
				activeNodeId: current?.activeNodeId ?? null
			})
		);
	}

	updateActiveNode(nodeId: string | null): void {
		const current = this.provider.awareness.getLocalState() as PresenceState | null;
		this.provider.awareness.setLocalState(
			buildPresenceState(this.user, {
				cursor: current?.cursor ?? null,
				activeNodeId: nodeId
			})
		);
	}

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

	getSharedNodeIds(): string[] {
		return Array.from(this.yNodes.keys());
	}

	getSharedNode(id: string): CollabSerializedNode | undefined {
		return this.yNodes.get(id);
	}

	// ─── Connection control ──────────────────────────────────────────────────

	reconnect(): void {
		this.provider.connect();
	}

	disconnect(): void {
		this.provider.disconnect();
	}

	// ─── Destroy ─────────────────────────────────────────────────────────────

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
		this.provider.on('status', (status) => {
			const next = status as CollabStatus;
			this.status = next;
			for (const fn of this._statusListeners) fn(next);
		});
	}

	// ─── Private: awareness ──────────────────────────────────────────────────

	private _setupAwarenessListener(): void {
		this.provider.awareness.on('change', () => {
			this._refreshPeers();
		});
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
			if (event.transaction.local) return;
			this._applying = true;
			try {
				for (const [key, change] of event.changes.keys) {
					if (change.action === 'delete') {
						this._applyRemoteDelete(key);
					} else {
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
		this._engineUnsubscribe = this.engine.subscribe(() => {
			if (this._applying) return;
			this._syncEngineDiffToYjs();
		});
	}

	private _syncEngineDiffToYjs(): void {
		const engineNodes = this.engine.nodes;
		const engineIds = new Set(engineNodes.map((n) => n.id));
		const yjsIds = new Set(this.yNodes.keys());

		this.doc.transact(() => {
			for (const node of engineNodes) {
				const serialised = serialiseNode(node);
				const existing = this.yNodes.get(node.id);
				if (!existing || hasChanged(existing, serialised)) {
					this.yNodes.set(node.id, serialised);
				}
			}
			for (const yjsId of yjsIds) {
				if (!engineIds.has(yjsId)) {
					this.yNodes.delete(yjsId);
				}
			}
		});
	}
}
```

- [ ] **Step 2: Run type check**

Run: `cd packages/collab && npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 3: Run all existing tests**

Run: `cd packages/collab && npx vitest run`
Expected: All tests PASS (presence.test.ts, serialise.test.ts, protocol.test.ts, Awareness.test.ts, YjsWebSocketProvider.test.ts)

- [ ] **Step 4: Commit**

```bash
git add packages/collab/src/CollabProvider.ts
git commit -m "refactor(collab): swap y-websocket for custom YjsWebSocketProvider"
```

---

### Task 6: Update index.ts and remove dependencies

**Files:**
- Modify: `packages/collab/src/index.ts`
- Modify: `packages/collab/package.json`

- [ ] **Step 1: Update index.ts exports and JSDoc**

Replace the module JSDoc to remove y-websocket references. Add exports for new modules:

```ts
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
```

- [ ] **Step 2: Remove y-websocket and lib0 from package.json**

In `packages/collab/package.json`, remove `"lib0": "^0.2.100"` and `"y-websocket": "^2.1.0"` from `dependencies`. The dependencies block should become:

```json
"dependencies": {
    "@traek/core": "workspace:*",
    "yjs": "^13.6.27"
}
```

- [ ] **Step 3: Install to update lockfile**

Run: `cd /Users/nico/Repos/traek && pnpm install`
Expected: Lockfile updated, y-websocket and lib0 removed from packages/collab resolution

- [ ] **Step 4: Run type check and all tests**

Run: `cd packages/collab && npx tsc --noEmit && npx vitest run`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add packages/collab/src/index.ts packages/collab/package.json pnpm-lock.yaml
git commit -m "feat(collab): remove y-websocket and lib0 dependencies"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full lint + type check + tests from package**

Run: `cd packages/collab && pnpm run lint && pnpm run check && pnpm run test`
Expected: All pass

- [ ] **Step 2: Verify y-websocket is gone**

Run: `grep -r "y-websocket" packages/collab/src/`
Expected: No matches

Run: `grep -r "lib0" packages/collab/src/`
Expected: No matches

- [ ] **Step 3: Verify no runtime dependency on y-websocket**

Run: `cd packages/collab && node -e "const pkg = require('./package.json'); console.log(Object.keys(pkg.dependencies))"`
Expected: `['@traek/core', 'yjs']`

- [ ] **Step 4: Commit if any fixes were needed, otherwise done**
