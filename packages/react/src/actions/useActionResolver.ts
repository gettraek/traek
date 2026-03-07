import { useCallback, useRef, useState } from 'react';
import type { ActionDefinition, ResolveActions } from './types.js';

export interface ActionResolverState {
	/** IDs suggested by keyword or semantic matching. */
	suggestedIds: string[];
	/** IDs the user has explicitly toggled on. */
	selectedIds: string[];
	/** Whether a stage-2 resolve is in flight. */
	isResolving: boolean;
	/** Current slash-command filter (text after `/` with no space). `null` when inactive. */
	slashFilter: string | null;
}

export interface ActionResolverActions {
	onInputChange: (input: string) => void;
	toggleAction: (id: string) => void;
	selectSlashCommand: (id: string, currentInput: string) => string;
	reset: () => void;
}

/**
 * Two-stage action resolver hook with debounce and caching.
 *
 * Stage 1: Instant keyword matching against `ActionDefinition.keywords`.
 * Stage 2: Async callback (e.g. LLM) for semantic matching, debounced and cached.
 *
 * @example
 * ```tsx
 * const [resolverState, resolverActions] = useActionResolver(actions, resolveCallback)
 * resolverActions.onInputChange(inputValue)
 * ```
 */
export function useActionResolver(
	actions: ActionDefinition[],
	resolveCallback?: ResolveActions | null,
	debounceMs = 300
): [ActionResolverState, ActionResolverActions] {
	const [state, setState] = useState<ActionResolverState>({
		suggestedIds: [],
		selectedIds: [],
		isResolving: false,
		slashFilter: null
	});

	const cache = useRef(new Map<string, string[]>());
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const generation = useRef(0);
	const actionsRef = useRef(actions);
	actionsRef.current = actions;
	const resolveCallbackRef = useRef(resolveCallback);
	resolveCallbackRef.current = resolveCallback;

	const cancelDebounce = useCallback(() => {
		if (debounceTimer.current !== null) {
			clearTimeout(debounceTimer.current);
			debounceTimer.current = null;
		}
	}, []);

	const mergeSuggestions = useCallback((keyword: string[], semantic: string[]) => {
		const merged = [...new Set([...keyword, ...semantic])];
		setState((prev) => ({ ...prev, suggestedIds: merged }));
	}, []);

	const runResolve = useCallback(
		async (input: string, cacheKey: string, keywordMatches: string[]) => {
			const cb = resolveCallbackRef.current;
			if (!cb) return;
			const gen = generation.current;
			setState((prev) => ({ ...prev, isResolving: true }));
			try {
				const result = await cb(input, actionsRef.current);
				if (gen !== generation.current) return;
				cache.current.set(cacheKey, result);
				mergeSuggestions(keywordMatches, result);
			} catch {
				// Silently fail — keyword matches remain
			} finally {
				if (gen === generation.current) {
					setState((prev) => ({ ...prev, isResolving: false }));
				}
			}
		},
		[mergeSuggestions]
	);

	const onInputChange = useCallback(
		(input: string) => {
			const trimmed = input.trim();

			// Slash-command detection
			if (trimmed.startsWith('/') && !trimmed.includes(' ')) {
				setState((prev) => ({
					...prev,
					slashFilter: trimmed.slice(1).toLowerCase()
				}));
				return;
			}

			setState((prev) => ({ ...prev, slashFilter: null }));

			if (!trimmed) {
				setState((prev) => ({ ...prev, suggestedIds: [] }));
				cancelDebounce();
				return;
			}

			const lower = trimmed.toLowerCase();
			const keywordMatches = actionsRef.current
				.filter((a) => a.keywords?.some((kw) => lower.includes(kw.toLowerCase())))
				.map((a) => a.id);

			setState((prev) => ({ ...prev, suggestedIds: keywordMatches }));

			if (resolveCallbackRef.current) {
				cancelDebounce();
				const cacheKey = lower;
				const cached = cache.current.get(cacheKey);
				if (cached) {
					mergeSuggestions(keywordMatches, cached);
					return;
				}
				debounceTimer.current = setTimeout(() => {
					runResolve(trimmed, cacheKey, keywordMatches);
				}, debounceMs);
			}
		},
		[cancelDebounce, mergeSuggestions, runResolve, debounceMs]
	);

	const toggleAction = useCallback((id: string) => {
		setState((prev) => ({
			...prev,
			selectedIds: prev.selectedIds.includes(id)
				? prev.selectedIds.filter((s) => s !== id)
				: [...prev.selectedIds, id]
		}));
	}, []);

	const selectSlashCommand = useCallback((id: string, currentInput: string): string => {
		setState((prev) => ({
			...prev,
			selectedIds: prev.selectedIds.includes(id) ? prev.selectedIds : [...prev.selectedIds, id],
			slashFilter: null
		}));
		const match = currentInput.match(/^\/\S*\s*/);
		return match ? currentInput.slice(match[0].length) : '';
	}, []);

	const reset = useCallback(() => {
		cancelDebounce();
		generation.current += 1;
		setState({ suggestedIds: [], selectedIds: [], isResolving: false, slashFilter: null });
	}, [cancelDebounce]);

	return [state, { onInputChange, toggleAction, selectSlashCommand, reset }];
}
