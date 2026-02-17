import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ActionResolver } from '../ActionResolver.svelte';
import type { ActionDefinition } from '../types';

// Mock window for node environment (ActionResolver uses window.setTimeout)
beforeEach(() => {
	if (typeof globalThis.window === 'undefined') {
		(globalThis as Record<string, unknown>).window = globalThis;
	}
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('ActionResolver edge cases', () => {
	describe('keywords with regex special characters', () => {
		const regexActions: ActionDefinition[] = [
			{
				id: 'cpp',
				label: 'C++',
				description: 'C++ programming',
				keywords: ['c++']
			},
			{
				id: 'csharp',
				label: 'C#',
				description: 'C# programming',
				keywords: ['c#']
			},
			{
				id: 'nodejs',
				label: 'Node.js',
				description: 'Node.js runtime',
				keywords: ['node.js']
			}
		];

		it('should match c++ literally without treating + as regex quantifier', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(regexActions);
			resolver.onInputChange('I want to write c++ code');
			expect(resolver.suggestedIds).toContain('cpp');
			expect(resolver.suggestedIds).not.toContain('csharp');
		});

		it('should match c# literally without treating # as special', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(regexActions);
			resolver.onInputChange('help me with c# development');
			expect(resolver.suggestedIds).toContain('csharp');
			expect(resolver.suggestedIds).not.toContain('cpp');
		});

		it('should match node.js literally without treating . as wildcard', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(regexActions);
			resolver.onInputChange('build a node.js server');
			expect(resolver.suggestedIds).toContain('nodejs');
		});

		it('should not match nodexjs when keyword is node.js (dot is literal)', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(regexActions);
			resolver.onInputChange('build a nodexjs server');
			expect(resolver.suggestedIds).not.toContain('nodejs');
		});
	});

	describe('rapid input changes cancelling debounce', () => {
		it('should only resolve the latest input after rapid changes', async () => {
			expect.assertions(2);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue(['search']);
			const resolver = new ActionResolver(
				[
					{
						id: 'search',
						label: 'Search',
						description: 'Search the web',
						keywords: ['search']
					}
				],
				resolveCallback,
				200
			);

			resolver.onInputChange('first input');
			resolver.onInputChange('second input');
			resolver.onInputChange('third input');

			await vi.advanceTimersByTimeAsync(300);

			expect(resolveCallback).toHaveBeenCalledTimes(1);
			expect(resolveCallback).toHaveBeenCalledWith('third input', expect.any(Array));
			vi.useRealTimers();
		});

		it('should not fire resolve for earlier inputs', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue([]);
			const resolver = new ActionResolver(
				[
					{
						id: 'a',
						label: 'A',
						description: 'Action A',
						keywords: ['alpha']
					}
				],
				resolveCallback,
				100
			);

			resolver.onInputChange('alpha one');
			// Change before debounce fires
			vi.advanceTimersByTime(50);
			resolver.onInputChange('alpha two');
			// Change again before debounce fires
			vi.advanceTimersByTime(50);
			resolver.onInputChange('alpha three');

			await vi.advanceTimersByTimeAsync(200);

			expect(resolveCallback).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});

	describe('rapid slash command switching', () => {
		it('should reflect only the last slash command state', () => {
			expect.assertions(2);
			const resolver = new ActionResolver([
				{
					id: 'search',
					label: 'Search',
					description: 'Search',
					slashCommand: 'search'
				},
				{
					id: 'code',
					label: 'Code',
					description: 'Code',
					slashCommand: 'code'
				}
			]);

			resolver.onInputChange('/search');
			resolver.onInputChange('/code');

			expect(resolver.slashFilter).toBe('code');
			expect(resolver.suggestedIds).toEqual([]);
		});

		it('should keep slashFilter from latest input even if prior debounce fires', async () => {
			expect.assertions(2);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue(['search']);
			const resolver = new ActionResolver(
				[
					{
						id: 'search',
						label: 'Search',
						description: 'Search',
						keywords: ['search'],
						slashCommand: 'search'
					}
				],
				resolveCallback,
				100
			);

			resolver.onInputChange('search for something');
			// Switch to slash command — slash path does not cancel prior debounce
			resolver.onInputChange('/code');

			await vi.advanceTimersByTimeAsync(200);

			// slashFilter reflects the latest slash command input
			expect(resolver.slashFilter).toBe('code');
			// Prior debounce still fires since slash path does not cancel it
			expect(resolveCallback).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});

	describe('empty actions array', () => {
		it('should initialize with no errors', () => {
			expect.assertions(4);
			const resolver = new ActionResolver([]);
			expect(resolver.suggestedIds).toEqual([]);
			expect(resolver.selectedIds).toEqual([]);
			expect(resolver.isResolving).toBe(false);
			expect(resolver.slashFilter).toBeNull();
		});

		it('should handle onInputChange gracefully with empty actions', () => {
			expect.assertions(1);
			const resolver = new ActionResolver([]);
			resolver.onInputChange('search for something');
			expect(resolver.suggestedIds).toEqual([]);
		});

		it('should handle slash commands with empty actions', () => {
			expect.assertions(1);
			const resolver = new ActionResolver([]);
			resolver.onInputChange('/search');
			expect(resolver.slashFilter).toBe('search');
		});

		it('should still invoke resolve callback with empty actions', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue([]);
			const resolver = new ActionResolver([], resolveCallback, 0);
			resolver.onInputChange('hello');
			await vi.advanceTimersByTimeAsync(10);
			expect(resolveCallback).toHaveBeenCalledWith('hello', []);
			vi.useRealTimers();
		});
	});

	describe('action with empty keywords array', () => {
		const emptyKeywordsActions: ActionDefinition[] = [
			{
				id: 'empty-kw',
				label: 'Empty Keywords',
				description: 'Action with empty keywords array',
				keywords: []
			},
			{
				id: 'normal',
				label: 'Normal',
				description: 'Normal action',
				keywords: ['hello']
			}
		];

		it('should never match an action with empty keywords array', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(emptyKeywordsActions);
			resolver.onInputChange('empty keywords hello test anything');
			expect(resolver.suggestedIds).not.toContain('empty-kw');
			expect(resolver.suggestedIds).toContain('normal');
		});

		it('should not crash when filtering against empty keywords', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(emptyKeywordsActions);
			resolver.onInputChange('some random input');
			expect(resolver.suggestedIds).toEqual([]);
		});
	});

	describe('very long input text', () => {
		it('should handle 10000+ character input without crashing', () => {
			expect.assertions(1);
			const resolver = new ActionResolver([
				{
					id: 'search',
					label: 'Search',
					description: 'Search',
					keywords: ['search']
				}
			]);
			const longInput = 'a'.repeat(10000) + ' search ' + 'b'.repeat(10000);
			resolver.onInputChange(longInput);
			expect(resolver.suggestedIds).toContain('search');
		});

		it('should handle 10000+ character input with resolve callback', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue([]);
			const resolver = new ActionResolver(
				[
					{
						id: 'a',
						label: 'A',
						description: 'A',
						keywords: ['needle']
					}
				],
				resolveCallback,
				0
			);
			const longInput = 'x'.repeat(15000);
			resolver.onInputChange(longInput);
			await vi.advanceTimersByTimeAsync(10);
			expect(resolveCallback).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});

	describe('concurrent resolve calls', () => {
		it('should only apply results from the latest resolve', async () => {
			expect.assertions(2);
			vi.useFakeTimers();

			let resolveFirst: ((value: string[]) => void) | null = null;
			let resolveSecond: ((value: string[]) => void) | null = null;
			let callCount = 0;

			const resolveCallback = vi.fn().mockImplementation(
				() =>
					new Promise<string[]>((resolve) => {
						callCount++;
						if (callCount === 1) {
							resolveFirst = resolve;
						} else {
							resolveSecond = resolve;
						}
					})
			);

			const resolver = new ActionResolver(
				[
					{
						id: 'search',
						label: 'Search',
						description: 'Search',
						keywords: ['search']
					}
				],
				resolveCallback,
				0
			);

			// First input triggers resolve
			resolver.onInputChange('first query');
			await vi.advanceTimersByTimeAsync(10);

			// Reset and second input triggers another resolve
			resolver.reset();
			resolver.onInputChange('second query');
			await vi.advanceTimersByTimeAsync(10);

			// Resolve first promise after second is in flight
			(resolveFirst as ((v: string[]) => void) | null)?.(['search']);
			await vi.advanceTimersByTimeAsync(1);

			// First result should be ignored (generation mismatch)
			expect(resolver.suggestedIds).not.toContain('search');

			// Resolve second promise
			(resolveSecond as ((v: string[]) => void) | null)?.(['search']);
			await vi.advanceTimersByTimeAsync(1);

			// Second result should be applied
			expect(resolver.suggestedIds).toContain('search');

			vi.useRealTimers();
		});
	});

	describe('destroy during active resolve', () => {
		it('should not throw when resolve completes after destroy', async () => {
			expect.assertions(2);
			vi.useFakeTimers();

			let resolvePromise: ((value: string[]) => void) | null = null;
			const resolveCallback = vi.fn().mockImplementation(
				() =>
					new Promise<string[]>((resolve) => {
						resolvePromise = resolve;
					})
			);

			const resolver = new ActionResolver(
				[
					{
						id: 'search',
						label: 'Search',
						description: 'Search',
						keywords: ['test']
					}
				],
				resolveCallback,
				0
			);

			resolver.onInputChange('test input');
			await vi.advanceTimersByTimeAsync(10);

			// Destroy while resolve is in flight — cancels debounce but
			// does not increment generation, so in-flight resolve may still complete
			resolver.destroy();

			// Resolve the promise after destroy — should not throw
			(resolvePromise as ((v: string[]) => void) | null)?.(['search']);
			await vi.advanceTimersByTimeAsync(10);

			// destroy only cancels debounce; since the resolve was already
			// in flight, it completes and sets isResolving back to false
			expect(resolver.isResolving).toBe(false);
			// Calling the resolver again after it already resolved should not throw
			expect(() => resolvePromise?.(['search'])).not.toThrow();

			vi.useRealTimers();
		});

		it('should not apply results if reset is called after destroy', async () => {
			expect.assertions(1);
			vi.useFakeTimers();

			let resolvePromise: ((value: string[]) => void) | null = null;
			const resolveCallback = vi.fn().mockImplementation(
				() =>
					new Promise<string[]>((resolve) => {
						resolvePromise = resolve;
					})
			);

			const resolver = new ActionResolver(
				[
					{
						id: 'search',
						label: 'Search',
						description: 'Search',
						keywords: ['test']
					}
				],
				resolveCallback,
				0
			);

			resolver.onInputChange('test input');
			await vi.advanceTimersByTimeAsync(10);

			// Reset increments generation, invalidating the in-flight resolve
			resolver.reset();

			// Resolve the promise after reset
			(resolvePromise as ((v: string[]) => void) | null)?.(['search']);
			await vi.advanceTimersByTimeAsync(10);

			// Results should not be applied since generation changed
			expect(resolver.suggestedIds).toEqual([]);

			vi.useRealTimers();
		});

		it('should cancel pending debounce on destroy and not fire resolve', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue(['search']);
			const resolver = new ActionResolver(
				[
					{
						id: 'search',
						label: 'Search',
						description: 'Search',
						keywords: ['search']
					}
				],
				resolveCallback,
				200
			);

			resolver.onInputChange('search for something');
			// Destroy before debounce fires
			resolver.destroy();
			await vi.advanceTimersByTimeAsync(300);

			expect(resolveCallback).not.toHaveBeenCalled();
			vi.useRealTimers();
		});
	});

	describe('input that is just a slash', () => {
		it('should set slashFilter to empty string, not null', () => {
			expect.assertions(2);
			const resolver = new ActionResolver([]);
			resolver.onInputChange('/');
			expect(resolver.slashFilter).toBe('');
			expect(resolver.slashFilter).not.toBeNull();
		});

		it('should set slashFilter to empty string with whitespace around slash', () => {
			expect.assertions(1);
			const resolver = new ActionResolver([]);
			resolver.onInputChange('  /  ');
			// After trim: "/" — no space in trimmed, starts with /
			// Wait — trimmed is "/ " which after trim is "/", but original "  /  " trims to "/"
			// Actually "  /  ".trim() === "/", and "/" has no space, starts with /
			// So slashFilter = "/".slice(1).toLowerCase() = ""
			expect(resolver.slashFilter).toBe('');
		});
	});

	describe('multiple toggles of same action', () => {
		it('should be selected after toggle on, off, on', () => {
			expect.assertions(4);
			const resolver = new ActionResolver([
				{
					id: 'search',
					label: 'Search',
					description: 'Search',
					keywords: ['search']
				}
			]);

			resolver.toggleAction('search');
			expect(resolver.selectedIds).toContain('search');

			resolver.toggleAction('search');
			expect(resolver.selectedIds).not.toContain('search');

			resolver.toggleAction('search');
			expect(resolver.selectedIds).toContain('search');
			expect(resolver.selectedIds).toHaveLength(1);
		});

		it('should handle many rapid toggles without duplicates', () => {
			expect.assertions(2);
			const resolver = new ActionResolver([
				{
					id: 'a',
					label: 'A',
					description: 'A'
				}
			]);

			// Toggle 10 times: on, off, on, off, on, off, on, off, on, off
			for (let i = 0; i < 10; i++) {
				resolver.toggleAction('a');
			}

			// Even number of toggles => not selected
			expect(resolver.selectedIds).not.toContain('a');

			// One more toggle => selected
			resolver.toggleAction('a');
			expect(resolver.selectedIds).toEqual(['a']);
		});
	});
});
