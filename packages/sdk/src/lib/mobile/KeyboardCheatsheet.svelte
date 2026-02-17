<script lang="ts">
	/**
	 * Item 7: Keyboard Shortcuts Cheatsheet Overlay
	 * Zeigt alle verfügbaren Keyboard-Shortcuts im Focus Mode
	 */

	let { onClose }: { onClose: () => void } = $props();

	function handleBackdropClick(e: MouseEvent | KeyboardEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="keyboard-hints-overlay" role="dialog" aria-modal="true" aria-labelledby="hints-title">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="hints-backdrop" onclick={handleBackdropClick}></div>
	<div class="hints-content">
		<h2 id="hints-title">Tastatur-Navigation</h2>

		<div class="shortcuts-grid">
			<div class="shortcut">
				<kbd>↑</kbd>
				<span>Zum Kind (tiefer)</span>
			</div>
			<div class="shortcut">
				<kbd>↓</kbd>
				<span>Zum Eltern (zurück)</span>
			</div>
			<div class="shortcut">
				<kbd>←</kbd>
				<span>Vorherige Alternative</span>
			</div>
			<div class="shortcut">
				<kbd>→</kbd>
				<span>Nächste Alternative</span>
			</div>
			<div class="shortcut">
				<kbd>Home</kbd>
				<span>Zurück zum Start</span>
			</div>
			<div class="shortcut">
				<kbd>i</kbd>
				<span>Input fokussieren</span>
			</div>
			<div class="shortcut">
				<kbd>Esc</kbd>
				<span>Input verlassen</span>
			</div>
			<div class="shortcut">
				<kbd>?</kbd>
				<span>Diese Hilfe anzeigen</span>
			</div>
		</div>

		<button class="close-button" onclick={onClose}>Schließen</button>
	</div>
</div>

<style>
	.keyboard-hints-overlay {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hints-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		animation: backdropFade 0.2s ease;
	}

	@keyframes backdropFade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.hints-content {
		position: relative;
		width: 90%;
		max-width: 500px;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		border: 1px solid var(--traek-input-border, #444444);
		border-radius: 16px;
		padding: 24px;
		color: var(--traek-node-text, #dddddd);
		animation: slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideInUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.hints-content h2 {
		margin-bottom: 20px;
		font-size: 20px;
		font-weight: 600;
	}

	.shortcuts-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
		margin-bottom: 24px;
	}

	@media (max-width: 500px) {
		.shortcuts-grid {
			grid-template-columns: 1fr;
		}
	}

	.shortcut {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
		padding: 0 8px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		font-family: var(--traek-font-mono, 'Space Mono', monospace);
		font-size: 14px;
		font-weight: 600;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.1),
			0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.shortcut span {
		font-size: 14px;
		line-height: 1.4;
	}

	.close-button {
		width: 100%;
		padding: 12px;
		min-height: 48px;
		background: var(--traek-input-button-bg, #00d8ff);
		color: var(--traek-input-button-text, #000000);
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.close-button:hover {
		transform: translateY(-1px);
	}

	.close-button:active {
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.hints-backdrop,
		.hints-content {
			animation: none;
		}
		.close-button:hover {
			transform: none;
		}
	}
</style>
