import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ActionDefinition, ResolveActions } from '../actions/types.js';

// Test the action resolver logic directly (without React hooks)
// We test the pure logic extracted from the hook

function createActionResolver(
	actions: ActionDefinition[],
	resolveCallback?: ResolveActions | null,
	debounceMs = 0
) {
	let state = {
		suggestedIds: [] as string[],
		selectedIds: [] as string[],
		isResolving: false,
		slashFilter: null as string | null
	};

	const cache = new Map<string, string[]>();
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let generation = 0;

	function cancelDebounce() {
		if (debounceTimer !== null) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
	}

	function mergeSuggestions(keyword: string[], semantic: string[]) {
		state = { ...state, suggestedIds: [...new Set([...keyword, ...semantic])] };
	}

	async function runResolve(input: string, cacheKey: string, keywordMatches: string[]) {
		if (!resolveCallback) return;
		const gen = generation;
		state = { ...state, isResolving: true };
		try {
			const result = await resolveCallback(input, actions);
			if (gen !== generation) return;
			cache.set(cacheKey, result);
			mergeSuggestions(keywordMatches, result);
		} catch {
			// noop
		} finally {
			if (gen === generation) state = { ...state, isResolving: false };
		}
	}

	function onInputChange(input: string) {
		const trimmed = input.trim();

		if (trimmed.startsWith('/') && !trimmed.includes(' ')) {
			state = { ...state, slashFilter: trimmed.slice(1).toLowerCase() };
			return;
		}

		state = { ...state, slashFilter: null };

		if (!trimmed) {
			state = { ...state, suggestedIds: [] };
			cancelDebounce();
			return;
		}

		const lower = trimmed.toLowerCase();
		const keywordMatches = actions
			.filter((a) => a.keywords?.some((kw) => lower.includes(kw.toLowerCase())))
			.map((a) => a.id);

		state = { ...state, suggestedIds: keywordMatches };

		if (resolveCallback) {
			cancelDebounce();
			const cacheKey = lower;
			const cached = cache.get(cacheKey);
			if (cached) {
				mergeSuggestions(keywordMatches, cached);
				return;
			}
			debounceTimer = setTimeout(() => {
				runResolve(trimmed, cacheKey, keywordMatches);
			}, debounceMs);
		}
	}

	function toggleAction(id: string) {
		state = {
			...state,
			selectedIds: state.selectedIds.includes(id)
				? state.selectedIds.filter((s) => s !== id)
				: [...state.selectedIds, id]
		};
	}

	function reset() {
		cancelDebounce();
		generation++;
		state = { suggestedIds: [], selectedIds: [], isResolving: false, slashFilter: null };
	}

	return {
		getState: () => state,
		onInputChange,
		toggleAction,
		reset
	};
}

const sampleActions: ActionDefinition[] = [
	{
		id: 'summarize',
		label: 'Summarize',
		description: 'Summarize text',
		keywords: ['summary', 'tldr', 'summarize']
	},
	{
		id: 'translate',
		label: 'Translate',
		description: 'Translate text',
		keywords: ['translate', 'language']
	},
	{
		id: 'code',
		label: 'Write code',
		description: 'Generate code',
		keywords: ['code', 'function', 'script'],
		slashCommand: 'code'
	}
];

describe('ActionResolver logic', () => {
	it('returns no suggestions for empty input', () => {
		const r = createActionResolver(sampleActions);
		r.onInputChange('');
		expect(r.getState().suggestedIds).toHaveLength(0);
	});

	it('matches keywords in stage 1', () => {
		const r = createActionResolver(sampleActions);
		r.onInputChange('can you summarize this?');
		expect(r.getState().suggestedIds).toContain('summarize');
		expect(r.getState().suggestedIds).not.toContain('translate');
	});

	it('detects slash command', () => {
		const r = createActionResolver(sampleActions);
		r.onInputChange('/code');
		expect(r.getState().slashFilter).toBe('code');
		expect(r.getState().suggestedIds).toHaveLength(0);
	});

	it('clears slash filter when space added', () => {
		const r = createActionResolver(sampleActions);
		r.onInputChange('/code write a function');
		expect(r.getState().slashFilter).toBeNull();
	});

	it('toggleAction adds and removes', () => {
		const r = createActionResolver(sampleActions);
		r.toggleAction('summarize');
		expect(r.getState().selectedIds).toContain('summarize');
		r.toggleAction('summarize');
		expect(r.getState().selectedIds).not.toContain('summarize');
	});

	it('reset clears all state', () => {
		const r = createActionResolver(sampleActions);
		r.onInputChange('translate this');
		r.toggleAction('translate');
		r.reset();
		const s = r.getState();
		expect(s.suggestedIds).toHaveLength(0);
		expect(s.selectedIds).toHaveLength(0);
		expect(s.slashFilter).toBeNull();
	});

	it('calls resolveCallback and merges results', async () => {
		const cb: ResolveActions = vi.fn().mockResolvedValue(['translate']);
		const r = createActionResolver(sampleActions, cb, 0);
		r.onInputChange('can you help me');

		// Wait for debounce + async resolve
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(cb).toHaveBeenCalledWith('can you help me', sampleActions);
		expect(r.getState().suggestedIds).toContain('translate');
	});

	it('uses cache on repeated input', async () => {
		const cb: ResolveActions = vi.fn().mockResolvedValue(['code']);
		const r = createActionResolver(sampleActions, cb, 0);

		r.onInputChange('write something');
		await new Promise((resolve) => setTimeout(resolve, 50));

		r.onInputChange('');
		r.onInputChange('write something'); // Should hit cache
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(cb).toHaveBeenCalledTimes(1); // Only called once due to cache
	});
});
