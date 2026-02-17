/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	HINT_DELAY_MS,
	HINT_DURATION_MS,
	createHintState,
	startHintTimer,
	cancelHintTimers,
	calculateAffordanceVisibility
} from '../hintLogic';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('hintLogic', () => {
	describe('hint state', () => {
		it('should create initial state with showHint false', () => {
			expect.assertions(3);
			const state = createHintState();

			expect(state.showHint).toBe(false);
			expect(state.hintTimer).toBeNull();
			expect(state.hideTimer).toBeNull();
		});
	});

	describe('hint timers', () => {
		it('should show hint after delay', () => {
			expect.assertions(1);
			let state = createHintState();
			const onShow = vi.fn();
			const onHide = vi.fn();

			state = startHintTimer(state, onShow, onHide);

			// Fast-forward to just before delay
			vi.advanceTimersByTime(HINT_DELAY_MS - 100);
			expect(onShow).not.toHaveBeenCalled();
		});

		it('should call onShow after HINT_DELAY_MS', () => {
			expect.assertions(1);
			let state = createHintState();
			const onShow = vi.fn();
			const onHide = vi.fn();

			state = startHintTimer(state, onShow, onHide);

			vi.advanceTimersByTime(HINT_DELAY_MS);

			expect(onShow).toHaveBeenCalledTimes(1);
		});

		it('should call onHide after delay + duration', () => {
			expect.assertions(2);
			let state = createHintState();
			const onShow = vi.fn();
			const onHide = vi.fn();

			state = startHintTimer(state, onShow, onHide);

			// Show hint
			vi.advanceTimersByTime(HINT_DELAY_MS);
			expect(onShow).toHaveBeenCalledTimes(1);

			// Hide hint
			vi.advanceTimersByTime(HINT_DURATION_MS);
			expect(onHide).toHaveBeenCalledTimes(1);
		});

		it('should not call onHide before duration', () => {
			expect.assertions(1);
			let state = createHintState();
			const onShow = vi.fn();
			const onHide = vi.fn();

			state = startHintTimer(state, onShow, onHide);

			// Show hint + partial duration
			vi.advanceTimersByTime(HINT_DELAY_MS + HINT_DURATION_MS - 100);

			expect(onHide).not.toHaveBeenCalled();
		});

		it('should cancel timers when requested', () => {
			expect.assertions(3);
			let state = createHintState();
			const onShow = vi.fn();
			const onHide = vi.fn();

			state = startHintTimer(state, onShow, onHide);
			state = cancelHintTimers(state);

			// Advance time past both delays
			vi.advanceTimersByTime(HINT_DELAY_MS + HINT_DURATION_MS);

			// Neither callback should be called
			expect(onShow).not.toHaveBeenCalled();
			expect(onHide).not.toHaveBeenCalled();
			expect(state.showHint).toBe(false);
		});

		it('should clear existing timers when starting new ones', () => {
			expect.assertions(2);
			let state = createHintState();
			const onShow = vi.fn();
			const onHide = vi.fn();

			// Start first timer
			state = startHintTimer(state, onShow, onHide);

			// Advance partway
			vi.advanceTimersByTime(1000);

			// Start new timer (should cancel old one)
			state = startHintTimer(state, onShow, onHide);

			// Advance to where old timer would have fired
			vi.advanceTimersByTime(1000);
			expect(onShow).not.toHaveBeenCalled();

			// Advance to where new timer fires
			vi.advanceTimersByTime(HINT_DELAY_MS - 1000);
			expect(onShow).toHaveBeenCalledTimes(1);
		});
	});

	describe('affordance visibility', () => {
		it('should show all affordances when all conditions true', () => {
			expect.assertions(4);
			const visibility = calculateAffordanceVisibility({
				hasChildren: true,
				hasParent: true,
				hasPrevSibling: true,
				hasNextSibling: true
			});

			expect(visibility.canSwipeUp).toBe(true);
			expect(visibility.canSwipeDown).toBe(true);
			expect(visibility.canSwipeLeft).toBe(true);
			expect(visibility.canSwipeRight).toBe(true);
		});

		it('should hide all affordances when all conditions false', () => {
			expect.assertions(4);
			const visibility = calculateAffordanceVisibility({
				hasChildren: false,
				hasParent: false,
				hasPrevSibling: false,
				hasNextSibling: false
			});

			expect(visibility.canSwipeUp).toBe(false);
			expect(visibility.canSwipeDown).toBe(false);
			expect(visibility.canSwipeLeft).toBe(false);
			expect(visibility.canSwipeRight).toBe(false);
		});

		it('should show only up affordance when only hasChildren', () => {
			expect.assertions(4);
			const visibility = calculateAffordanceVisibility({
				hasChildren: true,
				hasParent: false,
				hasPrevSibling: false,
				hasNextSibling: false
			});

			expect(visibility.canSwipeUp).toBe(true);
			expect(visibility.canSwipeDown).toBe(false);
			expect(visibility.canSwipeLeft).toBe(false);
			expect(visibility.canSwipeRight).toBe(false);
		});

		it('should show only down affordance when only hasParent', () => {
			expect.assertions(4);
			const visibility = calculateAffordanceVisibility({
				hasChildren: false,
				hasParent: true,
				hasPrevSibling: false,
				hasNextSibling: false
			});

			expect(visibility.canSwipeUp).toBe(false);
			expect(visibility.canSwipeDown).toBe(true);
			expect(visibility.canSwipeLeft).toBe(false);
			expect(visibility.canSwipeRight).toBe(false);
		});

		it('should show horizontal affordances when has siblings', () => {
			expect.assertions(4);
			const visibility = calculateAffordanceVisibility({
				hasChildren: false,
				hasParent: false,
				hasPrevSibling: true,
				hasNextSibling: true
			});

			expect(visibility.canSwipeUp).toBe(false);
			expect(visibility.canSwipeDown).toBe(false);
			expect(visibility.canSwipeLeft).toBe(true);
			expect(visibility.canSwipeRight).toBe(true);
		});
	});
});
