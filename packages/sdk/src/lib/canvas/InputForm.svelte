<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { TraekEngine } from '../TraekEngine.svelte';
	import type { ActionResolver } from '../actions/ActionResolver.svelte';
	import type { ActionDefinition } from '../actions/types';
	import ActionBadges from '../actions/ActionBadges.svelte';
	import SlashCommandDropdown from '../actions/SlashCommandDropdown.svelte';

	let {
		engine,
		userInput = $bindable(),
		sendFlash = $bindable(false),
		branchCelebration,
		resolver,
		actions,
		onSubmit,
		slashDropdownRef = $bindable()
	}: {
		engine: TraekEngine;
		userInput: string;
		sendFlash?: boolean;
		branchCelebration: string | null;
		resolver: ActionResolver | null;
		actions?: ActionDefinition[];
		onSubmit: () => void;
		slashDropdownRef?: SlashCommandDropdown | null;
	} = $props();
</script>

<div class="floating-input-container" transition:fade>
	{#if branchCelebration}
		<div class="branch-celebration" transition:fade>
			<span class="celebration-icon">🌿</span>
			{branchCelebration}
		</div>
	{/if}
	<div class="context-info">
		{#if engine.activeNodeId}
			{@const ctxNode = engine.nodes.find((n) => n.id === engine.activeNodeId)}
			{@const childCount = ctxNode
				? engine.nodes.filter((n) => n.parentIds.includes(ctxNode.id) && n.type !== 'thought')
						.length
				: 0}
			<span class="dot"></span>
			{#if childCount > 0}
				Branching from selected message
			{:else}
				Replying to selected message
			{/if}
		{:else}
			<span class="dot gray"></span> Starting a new conversation
		{/if}
	</div>
	{#if resolver && actions}
		<ActionBadges
			{actions}
			suggestedIds={resolver.suggestedIds}
			selectedIds={resolver.selectedIds}
			onToggle={(id) => resolver?.toggleAction(id)}
		/>
	{/if}
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSubmit();
		}}
		class="input-wrapper"
		class:send-flash={sendFlash}
	>
		{#if resolver && actions && resolver.slashFilter !== null}
			<SlashCommandDropdown
				bind:this={slashDropdownRef}
				{actions}
				filter={resolver.slashFilter}
				onSelect={(id) => {
					if (resolver) {
						userInput = resolver.selectSlashCommand(id, userInput);
					}
				}}
				onDismiss={() => {
					if (resolver) resolver.slashFilter = null;
				}}
			/>
		{/if}
		<textarea
			bind:value={userInput}
			placeholder="Ask the expert..."
			spellcheck="false"
			rows="1"
			oninput={(e) => {
				const target = e.currentTarget;
				target.style.height = 'auto';
				target.style.height = Math.min(target.scrollHeight, 120) + 'px';
			}}
			onkeydown={(e) => {
				if (resolver?.slashFilter !== null && slashDropdownRef) {
					slashDropdownRef.handleKeydown(e);
					return;
				}
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					onSubmit();
				}
			}}
		></textarea>
		<button type="submit" disabled={!userInput.trim()} aria-label="Send message">
			<svg viewBox="0 0 24 24" width="18" height="18"
				><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg
			>
		</button>
	</form>
</div>

<style>
	@layer base;

	@layer base {
		.floating-input-container {
			position: fixed;
			bottom: 20px;
			left: 50%;
			transform: translateX(-50%);
			width: 100%;
			max-width: calc(min(600px, 100vw) - 3rem);
			z-index: 100;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 12px;
		}

		.input-wrapper {
			width: 100%;
			background: var(--traek-input-bg, rgba(30, 30, 30, 0.8));
			backdrop-filter: blur(20px);
			border: 1px solid var(--traek-input-border, #444444);
			border-radius: 16px;
			display: flex;
			padding: 8px 12px;
			box-shadow: 0 20px 40px var(--traek-input-shadow, rgba(0, 0, 0, 0.4));
		}

		.input-wrapper:focus-within {
			border-color: var(--traek-input-button-bg, #00d8ff);
		}

		textarea {
			flex: 1;
			background: transparent;
			border: none;
			color: var(--traek-input-text, #ffffff);
			padding: 12px;
			outline: none;
			font-size: 16px;
			resize: none;
			overflow-y: auto;
			max-height: 120px;
			min-height: 38px;
			font-family: inherit;
			line-height: 1.4;
		}

		button {
			background: var(--traek-input-button-bg, #00d8ff);
			color: var(--traek-input-button-text, #000000);
			border: none;
			width: 40px;
			height: 40px;
			border-radius: 10px;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: transform 0.1s;
		}

		button:hover:not(:disabled) {
			transform: scale(1.05);
		}
		button:disabled {
			opacity: 0.3;
			cursor: not-allowed;
		}

		@media (max-width: 768px) {
			button {
				width: 44px;
				height: 44px;
			}
		}

		.context-info {
			font-size: 12px;
			color: var(--traek-input-context-text, #888888);
			display: flex;
			align-items: center;
			gap: 6px;
			background: var(--traek-input-context-bg, rgba(0, 0, 0, 0.4));
			padding: 4px 12px;
			border-radius: 20px;
		}

		.dot {
			width: 8px;
			height: 8px;
			background: var(--traek-input-dot, #00d8ff);
			border-radius: 50%;
		}
		.dot.gray {
			background: var(--traek-input-dot-muted, #555555);
		}

		.branch-celebration {
			background: rgba(0, 216, 255, 0.12);
			border: 1px solid rgba(0, 216, 255, 0.3);
			color: var(--traek-input-button-bg, #00d8ff);
			padding: 8px 16px;
			border-radius: 20px;
			font-size: 13px;
			display: flex;
			align-items: center;
			gap: 8px;
			backdrop-filter: blur(10px);
		}

		.celebration-icon {
			font-size: 16px;
		}

		@keyframes send-flash {
			0% {
				border-color: var(--traek-input-button-bg, #00d8ff);
			}
			100% {
				border-color: var(--traek-input-border, #444444);
			}
		}

		.input-wrapper.send-flash {
			animation: send-flash 300ms ease-out;
		}

		textarea:focus-visible {
			outline: none;
		}

		button:focus-visible {
			outline: 2px solid var(--traek-input-button-bg, #00d8ff);
			outline-offset: 2px;
		}
	}
</style>
