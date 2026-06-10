import { z } from 'zod';
import type { ActionDefinition, ResolveActions } from './types';

/** Stage-2 callbacks must return an array of action-id strings. */
const resolveResultSchema = z.array(z.string());

/** Maximum number of cached stage-2 results (oldest evicted first). */
const MAX_CACHE_ENTRIES = 200;

/** Hard timeout for stage-2 callbacks so `isResolving` cannot hang forever. */
const RESOLVE_TIMEOUT_MS = 10_000;

/**
 * Two-stage action resolver with debounce and caching.
 *
 * Stage 1: Instant keyword matching against `ActionDefinition.keywords`.
 * Stage 2: Async callback (e.g. LLM) for semantic matching, debounced and cached.
 */
export class ActionResolver {
	/** IDs suggested by keyword or semantic matching. */
	suggestedIds = $state<string[]>([]);
	/** IDs the user has explicitly toggled on. */
	selectedIds = $state<string[]>([]);
	/** Whether a stage-2 resolve is in flight. */
	isResolving = $state(false);
	/** Current slash-command filter (text after `/` with no space). `null` when inactive. */
	slashFilter = $state<string | null>(null);

	private actions: ActionDefinition[];
	private knownActionIds: Set<string>;
	private resolveCallback: ResolveActions | null;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private cache = new Map<string, string[]>();
	private debounceTimer = 0;
	private debounceMs: number;
	private generation = 0;
	/** Monotonic token: only the newest in-flight resolve may apply its results. */
	private resolveToken = 0;

	constructor(
		actions: ActionDefinition[],
		resolveCallback?: ResolveActions | null,
		debounceMs = 300
	) {
		this.actions = actions;
		this.knownActionIds = new Set(actions.map((a) => a.id));
		this.resolveCallback = resolveCallback ?? null;
		this.debounceMs = debounceMs;
	}

	/**
	 * Call whenever the user input changes.
	 * Runs stage-1 keyword matching synchronously and
	 * schedules stage-2 semantic matching (debounced).
	 */
	onInputChange(input: string): void {
		const trimmed = input.trim();

		// Slash-command detection: starts with `/` and has no space
		if (trimmed.startsWith('/') && !trimmed.includes(' ')) {
			this.slashFilter = trimmed.slice(1).toLowerCase();
			this.cancelDebounce();
			return;
		}
		this.slashFilter = null;

		if (!trimmed) {
			this.suggestedIds = [];
			this.cancelDebounce();
			return;
		}

		// Stage 1: keyword match
		const lower = trimmed.toLowerCase();
		const keywordMatches = this.actions
			.filter((a) => a.keywords?.some((kw) => lower.includes(kw.toLowerCase())))
			.map((a) => a.id);
		this.suggestedIds = keywordMatches;

		// Stage 2: async callback (debounced + cached)
		if (this.resolveCallback) {
			this.cancelDebounce();
			const cacheKey = lower;
			const cached = this.cache.get(cacheKey);
			if (cached) {
				this.mergeSuggestions(keywordMatches, cached);
				return;
			}
			this.debounceTimer = window.setTimeout(() => {
				void this.runResolve(trimmed, cacheKey, keywordMatches);
			}, this.debounceMs);
		}
	}

	/** Toggle an action's selected state. */
	toggleAction(id: string): void {
		if (this.selectedIds.includes(id)) {
			this.selectedIds = this.selectedIds.filter((s) => s !== id);
		} else {
			this.selectedIds = [...this.selectedIds, id];
		}
	}

	/**
	 * Select an action via slash command.
	 * Returns the cleaned input (slash prefix removed).
	 */
	selectSlashCommand(id: string, currentInput: string): string {
		if (!this.selectedIds.includes(id)) {
			this.selectedIds = [...this.selectedIds, id];
		}
		this.slashFilter = null;
		// Remove the slash command from the input
		const match = currentInput.match(/^\/\S*\s*/);
		return match ? currentInput.slice(match[0].length) : '';
	}

	/** Reset all state (call after sending a message). */
	reset(): void {
		this.suggestedIds = [];
		this.selectedIds = [];
		this.isResolving = false;
		this.slashFilter = null;
		this.cancelDebounce();
		this.generation += 1;
		this.resolveToken += 1;
	}

	/** Clean up timers and invalidate any in-flight resolve. */
	destroy(): void {
		this.cancelDebounce();
		this.resolveToken += 1;
		this.isResolving = false;
	}

	private cancelDebounce(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = 0;
		}
	}

	private async runResolve(
		input: string,
		cacheKey: string,
		keywordMatches: string[]
	): Promise<void> {
		if (!this.resolveCallback) return;
		const gen = this.generation;
		const token = ++this.resolveToken;
		this.isResolving = true;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		try {
			const result = await Promise.race([
				this.resolveCallback(input, this.actions),
				new Promise<never>((_, reject) => {
					timeoutId = setTimeout(
						() => reject(new Error('Action resolve timed out')),
						RESOLVE_TIMEOUT_MS
					);
				})
			]);
			// Stale: a newer request started or reset() was called while awaiting
			if (gen !== this.generation || token !== this.resolveToken) return;

			// Validate at the boundary and drop unknown action ids
			const parsed = resolveResultSchema.safeParse(result);
			if (!parsed.success) {
				console.warn('[ActionResolver] resolve callback returned invalid result:', parsed.error);
				return;
			}
			const validIds = parsed.data.filter((id) => this.knownActionIds.has(id));

			this.setCache(cacheKey, validIds);
			this.mergeSuggestions(keywordMatches, validIds);
		} catch {
			// Silently fail (error or timeout) — keyword matches remain
		} finally {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			if (gen === this.generation && token === this.resolveToken) {
				this.isResolving = false;
			}
		}
	}

	private setCache(key: string, ids: string[]): void {
		if (!this.cache.has(key) && this.cache.size >= MAX_CACHE_ENTRIES) {
			const oldest = this.cache.keys().next().value;
			if (oldest !== undefined) this.cache.delete(oldest);
		}
		this.cache.set(key, ids);
	}

	private mergeSuggestions(keyword: string[], semantic: string[]): void {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const merged = [...new Set([...keyword, ...semantic])];
		this.suggestedIds = merged;
	}
}
