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

const testActions: ActionDefinition[] = [
	{
		id: 'search',
		label: 'Search',
		description: 'Search the web',
		keywords: ['search', 'find', 'look up'],
		slashCommand: 'search'
	},
	{
		id: 'code',
		label: 'Code',
		description: 'Write code',
		keywords: ['code', 'program', 'develop'],
		slashCommand: 'code'
	},
	{
		id: 'image',
		label: 'Image',
		description: 'Generate an image',
		keywords: ['image', 'picture', 'draw'],
		slashCommand: 'image'
	}
];

describe('ActionResolver', () => {
	describe('constructor', () => {
		it('should initialize with empty state', () => {
			expect.assertions(4);
			const resolver = new ActionResolver(testActions);
			expect(resolver.suggestedIds).toEqual([]);
			expect(resolver.selectedIds).toEqual([]);
			expect(resolver.isResolving).toBe(false);
			expect(resolver.slashFilter).toBeNull();
		});
	});

	describe('onInputChange', () => {
		it('should match keywords', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('I want to search for something');
			expect(resolver.suggestedIds).toContain('search');
		});

		it('should match multiple keyword hits', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('search for code');
			expect(resolver.suggestedIds).toContain('search');
			expect(resolver.suggestedIds).toContain('code');
		});

		it('should be case insensitive for keywords', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('SEARCH for something');
			expect(resolver.suggestedIds).toContain('search');
		});

		it('should detect slash commands', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('/search');
			expect(resolver.slashFilter).toBe('search');
			expect(resolver.suggestedIds).toEqual([]);
		});

		it('should detect slash command prefix', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('/se');
			expect(resolver.slashFilter).toBe('se');
		});

		it('should clear slash filter when input has space', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('/search query');
			expect(resolver.slashFilter).toBeNull();
		});

		it('should clear suggestions on empty input', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('search something');
			resolver.onInputChange('');
			expect(resolver.suggestedIds).toEqual([]);
		});

		it('should clear suggestions on whitespace-only input', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('search');
			resolver.onInputChange('   ');
			expect(resolver.suggestedIds).toEqual([]);
		});

		it('should return no matches for unrelated input', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('hello world');
			expect(resolver.suggestedIds).toEqual([]);
		});

		it('should trigger stage-2 resolve with callback', () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue(['search']);
			const resolver = new ActionResolver(testActions, resolveCallback, 100);
			resolver.onInputChange('find something');
			vi.advanceTimersByTime(150);
			expect(resolveCallback).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});

		it('should use cached results for same input', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue(['search']);
			const resolver = new ActionResolver(testActions, resolveCallback, 100);

			resolver.onInputChange('find something');
			// Use async to flush the promise chain after debounce fires
			await vi.advanceTimersByTimeAsync(150);

			// Same input again should use cache
			resolver.onInputChange('find something');
			await vi.advanceTimersByTimeAsync(150);

			// Callback only called once (cached second time)
			expect(resolveCallback).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});

		it('should handle slash command with just slash', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('/');
			expect(resolver.slashFilter).toBe('');
		});
	});

	describe('toggleAction', () => {
		it('should add action to selectedIds', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.toggleAction('search');
			expect(resolver.selectedIds).toContain('search');
		});

		it('should remove action from selectedIds on second toggle', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.toggleAction('search');
			resolver.toggleAction('search');
			expect(resolver.selectedIds).not.toContain('search');
		});

		it('should allow multiple selected actions', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(testActions);
			resolver.toggleAction('search');
			resolver.toggleAction('code');
			expect(resolver.selectedIds).toContain('search');
			expect(resolver.selectedIds).toContain('code');
		});

		it('should only remove the toggled action', () => {
			expect.assertions(2);
			const resolver = new ActionResolver(testActions);
			resolver.toggleAction('search');
			resolver.toggleAction('code');
			resolver.toggleAction('search');
			expect(resolver.selectedIds).not.toContain('search');
			expect(resolver.selectedIds).toContain('code');
		});
	});

	describe('selectSlashCommand', () => {
		it('should add action to selectedIds', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.selectSlashCommand('search', '/search hello');
			expect(resolver.selectedIds).toContain('search');
		});

		it('should return cleaned input without slash prefix', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			const result = resolver.selectSlashCommand('search', '/search hello world');
			expect(result).toBe('hello world');
		});

		it('should return empty string when input is just slash command', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			const result = resolver.selectSlashCommand('search', '/search');
			expect(result).toBe('');
		});

		it('should clear slashFilter', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('/search');
			resolver.selectSlashCommand('search', '/search');
			expect(resolver.slashFilter).toBeNull();
		});

		it('should not add duplicate if already selected', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			resolver.toggleAction('search');
			resolver.selectSlashCommand('search', '/search hello');
			expect(resolver.selectedIds.filter((id) => id === 'search')).toHaveLength(1);
		});

		it('should handle input with no slash prefix', () => {
			expect.assertions(1);
			const resolver = new ActionResolver(testActions);
			const result = resolver.selectSlashCommand('search', 'no slash');
			expect(result).toBe('');
		});
	});

	describe('reset', () => {
		it('should clear all state', () => {
			expect.assertions(4);
			const resolver = new ActionResolver(testActions);
			resolver.onInputChange('search');
			resolver.toggleAction('code');
			resolver.reset();
			expect(resolver.suggestedIds).toEqual([]);
			expect(resolver.selectedIds).toEqual([]);
			expect(resolver.isResolving).toBe(false);
			expect(resolver.slashFilter).toBeNull();
		});

		it('should cancel pending debounce', () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue([]);
			const resolver = new ActionResolver(testActions, resolveCallback, 100);
			resolver.onInputChange('find something');
			resolver.reset();
			vi.advanceTimersByTime(200);
			expect(resolveCallback).not.toHaveBeenCalled();
			vi.useRealTimers();
		});

		it('should invalidate in-flight resolves via generation counter', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			let resolvePromise: ((value: string[]) => void) | null = null;
			const resolveCallback = vi.fn().mockImplementation(
				() =>
					new Promise<string[]>((resolve) => {
						resolvePromise = resolve;
					})
			);
			const resolver = new ActionResolver(testActions, resolveCallback, 0);
			resolver.onInputChange('test input');
			vi.advanceTimersByTime(10);
			// Reset while resolve is in flight
			resolver.reset();
			// Resolve the promise after reset
			(resolvePromise as ((value: string[]) => void) | null)?.(['search']);
			await vi.advanceTimersByTimeAsync(10);
			// Should not apply results since generation changed
			expect(resolver.suggestedIds).toEqual([]);
			vi.useRealTimers();
		});
	});

	describe('destroy', () => {
		it('should cancel pending debounce timer', () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue([]);
			const resolver = new ActionResolver(testActions, resolveCallback, 100);
			resolver.onInputChange('find something');
			resolver.destroy();
			vi.advanceTimersByTime(200);
			expect(resolveCallback).not.toHaveBeenCalled();
			vi.useRealTimers();
		});
	});

	describe('stage-2 async resolution', () => {
		it('should merge keyword and semantic results', async () => {
			expect.assertions(2);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockResolvedValue(['image']);
			const resolver = new ActionResolver(testActions, resolveCallback, 0);
			resolver.onInputChange('search for pictures');
			await vi.advanceTimersByTimeAsync(10);
			expect(resolver.suggestedIds).toContain('search');
			expect(resolver.suggestedIds).toContain('image');
			vi.useRealTimers();
		});

		it('should handle resolve callback errors gracefully', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			const resolveCallback = vi.fn().mockRejectedValue(new Error('fail'));
			const resolver = new ActionResolver(testActions, resolveCallback, 0);
			resolver.onInputChange('search for something');
			await vi.advanceTimersByTimeAsync(10);
			// Keyword matches should still be present
			expect(resolver.suggestedIds).toContain('search');
			vi.useRealTimers();
		});

		it('should set isResolving during async resolve', async () => {
			expect.assertions(1);
			vi.useFakeTimers();
			let resolvePromise: ((value: string[]) => void) | null = null;
			const resolveCallback = vi.fn().mockImplementation(
				() =>
					new Promise<string[]>((resolve) => {
						resolvePromise = resolve;
					})
			);
			const resolver = new ActionResolver(testActions, resolveCallback, 0);
			resolver.onInputChange('test');
			await vi.advanceTimersByTimeAsync(10);
			expect(resolver.isResolving).toBe(true);
			(resolvePromise as ((value: string[]) => void) | null)?.([]);
			vi.useRealTimers();
		});
	});
});
