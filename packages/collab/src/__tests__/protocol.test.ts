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
