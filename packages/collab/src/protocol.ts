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

const VALID_TYPES = new Set([MessageType.StateVector, MessageType.Update, MessageType.Awareness]);

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
