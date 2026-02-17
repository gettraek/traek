import type { ActionDefinition, ResolveActions } from './types';

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
	private resolveCallback: ResolveActions | null;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private cache = new Map<string, string[]>();
	private debounceTimer = 0;
	private debounceMs: number;
	private generation = 0;

	constructor(
		actions: ActionDefinition[],
		resolveCallback?: ResolveActions | null,
		debounceMs = 300
	) {
		this.actions = actions;
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
				this.runResolve(trimmed, cacheKey, keywordMatches);
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
	}

	/** Clean up timers. */
	destroy(): void {
		this.cancelDebounce();
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
		this.isResolving = true;
		try {
			const result = await this.resolveCallback(input, this.actions);
			if (gen !== this.generation) return;
			this.cache.set(cacheKey, result);
			this.mergeSuggestions(keywordMatches, result);
		} catch {
			// Silently fail — keyword matches remain
		} finally {
			if (gen === this.generation) {
				this.isResolving = false;
			}
		}
	}

	private mergeSuggestions(keyword: string[], semantic: string[]): void {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const merged = [...new Set([...keyword, ...semantic])];
		this.suggestedIds = merged;
	}
}
