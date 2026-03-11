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
