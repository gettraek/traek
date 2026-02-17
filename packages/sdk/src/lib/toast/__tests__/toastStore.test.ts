import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toastStore, toast, toastUndo } from '../toastStore.svelte';

beforeEach(() => {
	vi.useFakeTimers();
	toastStore.clear();
});

afterEach(() => {
	toastStore.clear();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('ToastStore', () => {
	describe('addToast', () => {
		it('should return a UUID string', () => {
			expect.assertions(1);
			const id = toastStore.addToast({ message: 'Hello', type: 'info', duration: 4000 });
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it('should add a toast to the toasts array', () => {
			expect.assertions(3);
			toastStore.addToast({ message: 'Test', type: 'success', duration: 3000 });
			expect(toastStore.toasts).toHaveLength(1);
			expect(toastStore.toasts[0].message).toBe('Test');
			expect(toastStore.toasts[0].type).toBe('success');
		});

		it('should create a toast with the correct structure', () => {
			expect.assertions(4);
			const id = toastStore.addToast({ message: 'Test', type: 'error', duration: 5000 });
			const t = toastStore.toasts.find((x) => x.id === id);
			expect(t).toBeDefined();
			expect(t!.id).toBe(id);
			expect(t!.message).toBe('Test');
			expect(t!.duration).toBe(5000);
		});

		it('should generate unique IDs for each toast', () => {
			expect.assertions(1);
			const id1 = toastStore.addToast({ message: 'A', type: 'info', duration: 4000 });
			const id2 = toastStore.addToast({ message: 'B', type: 'info', duration: 4000 });
			expect(id1).not.toBe(id2);
		});

		it('should evict the oldest toast when exceeding MAX_VISIBLE (3)', () => {
			expect.assertions(2);
			const id1 = toastStore.addToast({ message: 'First', type: 'info', duration: 4000 });
			toastStore.addToast({ message: 'Second', type: 'info', duration: 4000 });
			toastStore.addToast({ message: 'Third', type: 'info', duration: 4000 });
			toastStore.addToast({ message: 'Fourth', type: 'info', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(3);
			expect(toastStore.toasts.find((t) => t.id === id1)).toBeUndefined();
		});

		it('should keep the newest toasts when evicting', () => {
			expect.assertions(3);
			toastStore.addToast({ message: 'First', type: 'info', duration: 4000 });
			const id2 = toastStore.addToast({ message: 'Second', type: 'info', duration: 4000 });
			const id3 = toastStore.addToast({ message: 'Third', type: 'info', duration: 4000 });
			const id4 = toastStore.addToast({ message: 'Fourth', type: 'info', duration: 4000 });
			expect(toastStore.toasts.find((t) => t.id === id2)).toBeDefined();
			expect(toastStore.toasts.find((t) => t.id === id3)).toBeDefined();
			expect(toastStore.toasts.find((t) => t.id === id4)).toBeDefined();
		});

		it('should set up an auto-dismiss timer', () => {
			expect.assertions(2);
			toastStore.addToast({ message: 'Auto', type: 'info', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(1);
			vi.advanceTimersByTime(4000);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should auto-dismiss after the specified duration', () => {
			expect.assertions(2);
			toastStore.addToast({ message: 'Short', type: 'info', duration: 1000 });
			vi.advanceTimersByTime(999);
			expect(toastStore.toasts).toHaveLength(1);
			vi.advanceTimersByTime(1);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should preserve onUndo callback on the toast object', () => {
			expect.assertions(1);
			const onUndo = vi.fn();
			const id = toastStore.addToast({
				message: 'Undo me',
				type: 'undo',
				duration: 30000,
				onUndo
			});
			const t = toastStore.toasts.find((x) => x.id === id);
			expect(t!.onUndo).toBe(onUndo);
		});
	});

	describe('removeToast', () => {
		it('should remove a toast by ID', () => {
			expect.assertions(2);
			const id = toastStore.addToast({ message: 'Remove me', type: 'info', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(1);
			toastStore.removeToast(id);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should cancel the auto-dismiss timer on manual removal', () => {
			expect.assertions(1);
			const id = toastStore.addToast({ message: 'Manual', type: 'info', duration: 4000 });
			toastStore.removeToast(id);
			// Advance past the original duration; no error should occur
			vi.advanceTimersByTime(5000);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should not affect other toasts when removing one', () => {
			expect.assertions(2);
			const id1 = toastStore.addToast({ message: 'Keep', type: 'info', duration: 4000 });
			const id2 = toastStore.addToast({ message: 'Remove', type: 'info', duration: 4000 });
			toastStore.removeToast(id2);
			expect(toastStore.toasts).toHaveLength(1);
			expect(toastStore.toasts[0].id).toBe(id1);
		});

		it('should be a no-op for a non-existent toast ID', () => {
			expect.assertions(1);
			toastStore.addToast({ message: 'Existing', type: 'info', duration: 4000 });
			toastStore.removeToast('non-existent-id');
			expect(toastStore.toasts).toHaveLength(1);
		});

		it('should be safe to call on an already-removed toast', () => {
			expect.assertions(1);
			const id = toastStore.addToast({ message: 'Test', type: 'info', duration: 4000 });
			toastStore.removeToast(id);
			toastStore.removeToast(id);
			expect(toastStore.toasts).toHaveLength(0);
		});
	});

	describe('clear', () => {
		it('should remove all toasts', () => {
			expect.assertions(1);
			toastStore.addToast({ message: 'A', type: 'info', duration: 4000 });
			toastStore.addToast({ message: 'B', type: 'error', duration: 4000 });
			toastStore.addToast({ message: 'C', type: 'success', duration: 4000 });
			toastStore.clear();
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should cancel all pending auto-dismiss timers', () => {
			expect.assertions(1);
			toastStore.addToast({ message: 'A', type: 'info', duration: 2000 });
			toastStore.addToast({ message: 'B', type: 'info', duration: 3000 });
			toastStore.clear();
			// Advance past all durations; no timers should fire
			vi.advanceTimersByTime(5000);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should be safe to call when already empty', () => {
			expect.assertions(1);
			toastStore.clear();
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should allow adding new toasts after clearing', () => {
			expect.assertions(1);
			toastStore.addToast({ message: 'Before', type: 'info', duration: 4000 });
			toastStore.clear();
			toastStore.addToast({ message: 'After', type: 'success', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(1);
		});
	});

	describe('toast() convenience function', () => {
		it('should create an info toast by default', () => {
			expect.assertions(2);
			toast('Hello');
			expect(toastStore.toasts).toHaveLength(1);
			expect(toastStore.toasts[0].type).toBe('info');
		});

		it('should use 4000ms duration', () => {
			expect.assertions(2);
			toast('Timed');
			vi.advanceTimersByTime(3999);
			expect(toastStore.toasts).toHaveLength(1);
			vi.advanceTimersByTime(1);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should accept a custom type', () => {
			expect.assertions(1);
			toast('Error!', 'error');
			expect(toastStore.toasts[0].type).toBe('error');
		});

		it('should return the toast ID', () => {
			expect.assertions(1);
			const id = toast('Test');
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it('should set the message correctly', () => {
			expect.assertions(1);
			toast('My message');
			expect(toastStore.toasts[0].message).toBe('My message');
		});
	});

	describe('toastUndo() convenience function', () => {
		it('should create an undo-type toast', () => {
			expect.assertions(1);
			toastUndo('Deleted item', () => {});
			expect(toastStore.toasts[0].type).toBe('undo');
		});

		it('should use 30000ms duration', () => {
			expect.assertions(2);
			toastUndo('Deleted item', () => {});
			vi.advanceTimersByTime(29999);
			expect(toastStore.toasts).toHaveLength(1);
			vi.advanceTimersByTime(1);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should preserve the onUndo callback', () => {
			expect.assertions(1);
			const callback = vi.fn();
			toastUndo('Undo this', callback);
			expect(toastStore.toasts[0].onUndo).toBe(callback);
		});

		it('should allow executing the onUndo callback', () => {
			expect.assertions(1);
			const callback = vi.fn();
			toastUndo('Undo this', callback);
			toastStore.toasts[0].onUndo!();
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should return the toast ID', () => {
			expect.assertions(1);
			const id = toastUndo('Test', () => {});
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it('should set the message correctly', () => {
			expect.assertions(1);
			toastUndo('Item removed', () => {});
			expect(toastStore.toasts[0].message).toBe('Item removed');
		});
	});

	describe('edge cases', () => {
		it('should handle multiple rapid adds exceeding MAX_VISIBLE', () => {
			expect.assertions(2);
			toastStore.addToast({ message: '1', type: 'info', duration: 4000 });
			toastStore.addToast({ message: '2', type: 'info', duration: 4000 });
			toastStore.addToast({ message: '3', type: 'info', duration: 4000 });
			toastStore.addToast({ message: '4', type: 'info', duration: 4000 });
			toastStore.addToast({ message: '5', type: 'info', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(3);
			expect(toastStore.toasts.map((t) => t.message)).toEqual(['3', '4', '5']);
		});

		it('should clean up evicted toast timers', () => {
			expect.assertions(1);
			toastStore.addToast({ message: '1', type: 'info', duration: 1000 });
			toastStore.addToast({ message: '2', type: 'info', duration: 1000 });
			toastStore.addToast({ message: '3', type: 'info', duration: 1000 });
			// Adding a 4th evicts toast 1; its timer should be cleaned up
			toastStore.addToast({ message: '4', type: 'info', duration: 1000 });
			// Advance past the evicted toast's original duration
			vi.advanceTimersByTime(1000);
			// All remaining toasts should also auto-dismiss (same duration)
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should handle manual remove before auto-dismiss fires', () => {
			expect.assertions(2);
			const id = toastStore.addToast({ message: 'Remove early', type: 'info', duration: 5000 });
			vi.advanceTimersByTime(2000);
			toastStore.removeToast(id);
			expect(toastStore.toasts).toHaveLength(0);
			// Advance past original timeout; should not cause any issues
			vi.advanceTimersByTime(5000);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should independently auto-dismiss toasts with different durations', () => {
			expect.assertions(3);
			toastStore.addToast({ message: 'Short', type: 'info', duration: 1000 });
			toastStore.addToast({ message: 'Long', type: 'info', duration: 5000 });
			vi.advanceTimersByTime(1000);
			expect(toastStore.toasts).toHaveLength(1);
			expect(toastStore.toasts[0].message).toBe('Long');
			vi.advanceTimersByTime(4000);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should handle undo callback execution after removal', () => {
			expect.assertions(2);
			const callback = vi.fn();
			const id = toastUndo('Undo action', callback);
			const t = toastStore.toasts.find((x) => x.id === id);
			const savedCallback = t!.onUndo!;
			toastStore.removeToast(id);
			// Callback reference is still valid even after toast removal
			savedCallback();
			expect(callback).toHaveBeenCalledTimes(1);
			expect(toastStore.toasts).toHaveLength(0);
		});

		it('should evict oldest and add new when adding 4th toast at max capacity', () => {
			expect.assertions(4);
			const id1 = toastStore.addToast({ message: 'A', type: 'info', duration: 4000 });
			const id2 = toastStore.addToast({ message: 'B', type: 'info', duration: 4000 });
			const id3 = toastStore.addToast({ message: 'C', type: 'info', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(3);
			const id4 = toastStore.addToast({ message: 'D', type: 'info', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(3);
			expect(toastStore.toasts.find((t) => t.id === id1)).toBeUndefined();
			expect(toastStore.toasts.map((t) => t.id)).toEqual([id2, id3, id4]);
		});

		it('should handle adding toasts of every type', () => {
			expect.assertions(4);
			toastStore.addToast({ message: 'Info', type: 'info', duration: 4000 });
			toastStore.addToast({ message: 'Success', type: 'success', duration: 4000 });
			toastStore.addToast({ message: 'Error', type: 'error', duration: 4000 });
			expect(toastStore.toasts).toHaveLength(3);
			expect(toastStore.toasts[0].type).toBe('info');
			expect(toastStore.toasts[1].type).toBe('success');
			expect(toastStore.toasts[2].type).toBe('error');
		});
	});
});
