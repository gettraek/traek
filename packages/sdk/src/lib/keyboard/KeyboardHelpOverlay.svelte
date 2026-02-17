<script lang="ts">
	/**
	 * KeyboardHelpOverlay - Shows all keyboard shortcuts for desktop canvas navigation
	 */

	let { onClose }: { onClose: () => void } = $props();

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === '?') {
			e.preventDefault();
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="keyboard-help-overlay" role="dialog" aria-modal="true" aria-labelledby="help-title">
	<div class="help-backdrop" onclick={handleBackdropClick}></div>
	<div class="help-content">
		<h2 id="help-title">Keyboard Shortcuts</h2>

		<div class="shortcuts-section">
			<h3>Navigation</h3>
			<div class="shortcuts-grid">
				<div class="shortcut">
					<kbd>↑</kbd>
					<span>Navigate to parent</span>
				</div>
				<div class="shortcut">
					<kbd>↓</kbd>
					<span>Navigate to first child</span>
				</div>
				<div class="shortcut">
					<kbd>←</kbd>
					<span>Navigate to previous sibling</span>
				</div>
				<div class="shortcut">
					<kbd>→</kbd>
					<span>Navigate to next sibling</span>
				</div>
				<div class="shortcut">
					<kbd>Home</kbd>
					<span>Go to root node</span>
				</div>
				<div class="shortcut">
					<kbd>End</kbd>
					<span>Go to deepest leaf</span>
				</div>
			</div>
		</div>

		<div class="shortcuts-section">
			<h3>Actions</h3>
			<div class="shortcuts-grid">
				<div class="shortcut">
					<kbd>Enter</kbd>
					<span>Activate focused node</span>
				</div>
				<div class="shortcut">
					<kbd>Space</kbd>
					<span>Toggle collapse/expand</span>
				</div>
				<div class="shortcut">
					<kbd>Tab</kbd>
					<span>Switch focus to input</span>
				</div>
				<div class="shortcut">
					<kbd>?</kbd>
					<span>Show/hide this help</span>
				</div>
			</div>
		</div>

		<div class="shortcuts-section">
			<h3>Advanced</h3>
			<div class="shortcuts-grid">
				<div class="shortcut">
					<kbd>g</kbd><kbd>g</kbd>
					<span>Go to root (chord)</span>
				</div>
				<div class="shortcut">
					<kbd>g</kbd><kbd>e</kbd>
					<span>Go to deepest leaf (chord)</span>
				</div>
				<div class="shortcut">
					<kbd>1</kbd>-<kbd>9</kbd>
					<span>Jump to nth child</span>
				</div>
				<div class="shortcut">
					<kbd>/</kbd>
					<span>Open fuzzy search</span>
				</div>
			</div>
		</div>

		<button class="close-button" onclick={onClose}>Close</button>
	</div>
</div>

<style>
	.keyboard-help-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: overlay-fade-in 200ms ease;
	}

	@keyframes overlay-fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.help-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(4px);
	}

	.help-content {
		position: relative;
		width: 90%;
		max-width: 600px;
		max-height: 80vh;
		overflow-y: auto;
		background: var(--traek-thought-panel-bg, rgba(22, 22, 22, 0.95));
		border: 1px solid var(--traek-thought-panel-border, #333333);
		border-radius: 16px;
		padding: 32px;
		color: var(--traek-node-text, #dddddd);
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		animation: help-slide-in 300ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes help-slide-in {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.help-content h2 {
		margin: 0 0 24px 0;
		font-size: 24px;
		font-weight: 600;
		color: var(--traek-thought-tag-cyan, #00d8ff);
	}

	.shortcuts-section {
		margin-bottom: 32px;
	}

	.shortcuts-section:last-of-type {
		margin-bottom: 24px;
	}

	.shortcuts-section h3 {
		margin: 0 0 16px 0;
		font-size: 14px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--traek-thought-header-accent, #888888);
	}

	.shortcuts-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	@media (max-width: 600px) {
		.shortcuts-grid {
			grid-template-columns: 1fr;
		}
	}

	.shortcut {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		background: var(--traek-thought-header-bg, rgba(255, 255, 255, 0.03));
		border-radius: 8px;
		transition: background 0.15s;
	}

	.shortcut:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 36px;
		height: 36px;
		padding: 0 10px;
		background: var(--traek-thought-toggle-bg, #444444);
		border: 1px solid var(--traek-thought-toggle-border, #555555);
		border-radius: 6px;
		font-family: var(--traek-font-mono, 'Space Mono', monospace);
		font-size: 14px;
		font-weight: 600;
		color: var(--traek-thought-tag-cyan, #00d8ff);
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.2);
		flex-shrink: 0;
	}

	.shortcut span {
		font-size: 14px;
		line-height: 1.4;
		color: var(--traek-thought-row-muted-2, #aaaaaa);
	}

	.close-button {
		width: 100%;
		padding: 14px;
		min-height: 48px;
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.15s,
			opacity 0.15s;
	}

	.close-button:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.close-button:active {
		transform: translateY(0);
	}

	.close-button:focus-visible {
		outline: 2px solid var(--traek-input-button-bg, #00d8ff);
		outline-offset: 2px;
	}

	@media (prefers-reduced-motion: reduce) {
		.keyboard-help-overlay,
		.help-content {
			animation: none;
		}
		.close-button:hover {
			transform: none;
		}
	}

	/* Scrollbar styling */
	.help-content::-webkit-scrollbar {
		width: 8px;
	}

	.help-content::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.help-content::-webkit-scrollbar-thumb {
		background: var(--traek-thought-toggle-bg, #444444);
		border-radius: 4px;
	}

	.help-content::-webkit-scrollbar-thumb:hover {
		background: var(--traek-thought-toggle-border, #555555);
	}
</style>
