<script lang="ts">
	import type { TraekEngine } from '../TraekEngine.svelte';

	let {
		engine,
		oncreate,
		oncancel
	}: {
		engine: TraekEngine;
		oncreate?: (slug: string) => void;
		oncancel?: () => void;
	} = $props();

	let label = $state('');
	let color = $state('#3b82f6');
	let error = $state('');

	function handleCreate() {
		const trimmed = label.trim();
		if (!trimmed) {
			error = 'Label is required';
			return;
		}
		if (trimmed.length > 40) {
			error = 'Max 40 characters';
			return;
		}
		const tag = engine.createCustomTag(trimmed, color);
		oncreate?.(tag.slug);
		label = '';
		error = '';
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleCreate();
		if (e.key === 'Escape') oncancel?.();
	}
</script>

<div class="tag-creator">
	<div class="tag-creator__row">
		<input type="color" bind:value={color} class="tag-creator__color" aria-label="Tag color" />
		<input
			type="text"
			bind:value={label}
			placeholder="Tag name…"
			class="tag-creator__input"
			onkeydown={handleKeyDown}
			maxlength="40"
			aria-label="Tag name"
		/>
	</div>
	{#if error}
		<p class="tag-creator__error">{error}</p>
	{/if}
	<div class="tag-creator__actions">
		<button class="tag-creator__btn tag-creator__btn--cancel" onclick={oncancel}>Cancel</button>
		<button class="tag-creator__btn tag-creator__btn--create" onclick={handleCreate}>Create</button>
	</div>
</div>

<style>
	.tag-creator {
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tag-creator__row {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.tag-creator__color {
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		padding: 0;
		background: none;
	}

	.tag-creator__input {
		flex: 1;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 4px;
		color: inherit;
		padding: 4px 8px;
		font-size: 12px;
		outline: none;
	}

	.tag-creator__input:focus {
		border-color: rgba(255, 255, 255, 0.3);
	}

	.tag-creator__error {
		color: var(--traek-color-red, #ef4444);
		font-size: 11px;
		margin: 0;
	}

	.tag-creator__actions {
		display: flex;
		gap: 6px;
		justify-content: flex-end;
	}

	.tag-creator__btn {
		padding: 4px 10px;
		border-radius: 4px;
		border: none;
		cursor: pointer;
		font-size: 12px;
	}

	.tag-creator__btn--cancel {
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.6);
	}

	.tag-creator__btn--create {
		background: rgba(255, 255, 255, 0.12);
		color: white;
	}

	.tag-creator__btn--create:hover {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
