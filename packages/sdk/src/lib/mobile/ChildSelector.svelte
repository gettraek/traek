<script lang="ts">
	/**
	 * ChildSelector Bottom-Sheet
	 * Zeigt alle Kinder des aktuellen Nodes zur Auswahl.
	 * Drag-Handle + Sheet sind nach unten ziehbar zum Schließen.
	 */

	import type { Node, MessageNode } from '../TraekEngine.svelte';

	let {
		children,
		onSelect,
		onClose
	}: {
		children: Node[];
		onSelect: (nodeId: string) => void;
		onClose: () => void;
	} = $props();

	/** Drag-to-dismiss state */
	let dragY = $state(0);
	let isDragging = $state(false);
	let isDismissing = $state(false);
	let sheetEl = $state<HTMLElement | null>(null);

	let touchStartY = 0;
	let touchStartTime = 0;

	const DISMISS_THRESHOLD = 100;
	const VELOCITY_THRESHOLD = 0.5; // px/ms

	function handleDragStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		const t = e.touches[0];
		if (!t) return;
		touchStartY = t.clientY;
		touchStartTime = performance.now();
		isDragging = true;
		dragY = 0;
	}

	function handleDragMove(e: TouchEvent) {
		if (!isDragging || e.touches.length !== 1) return;
		const t = e.touches[0];
		if (!t) return;
		const dy = t.clientY - touchStartY;
		// Only allow dragging downward
		dragY = Math.max(0, dy);
		if (dragY > 0 && e.cancelable) {
			e.preventDefault();
		}
	}

	function handleDragEnd() {
		if (!isDragging) return;
		isDragging = false;

		const elapsed = performance.now() - touchStartTime;
		const velocity = elapsed > 0 ? dragY / elapsed : 0;
		const shouldDismiss = dragY >= DISMISS_THRESHOLD || velocity >= VELOCITY_THRESHOLD;

		if (shouldDismiss) {
			dismiss();
		} else {
			// Snap back
			dragY = 0;
		}
	}

	function dismiss() {
		isDismissing = true;
		// Animate to bottom then close
		const height = sheetEl?.offsetHeight ?? 400;
		dragY = height;
		setTimeout(() => onClose(), 200);
	}

	function handleBackdropClick(e: MouseEvent | KeyboardEvent) {
		if (e.target === e.currentTarget) {
			dismiss();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			dismiss();
		}
	}

	const sheetTransform = $derived(dragY > 0 ? `translateY(${dragY}px)` : '');
	const backdropOpacity = $derived(
		dragY > 0 && sheetEl ? Math.max(0, 1 - dragY / (sheetEl.offsetHeight ?? 400)) : 1
	);
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="child-selector-overlay"
	role="dialog"
	aria-modal="true"
	aria-labelledby="selector-title"
>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="selector-backdrop"
		onclick={handleBackdropClick}
		style:opacity={backdropOpacity}
	></div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="selector-content"
		class:dismissing={isDismissing}
		class:dragging={isDragging}
		bind:this={sheetEl}
		style:transform={sheetTransform}
		ontouchstart={handleDragStart}
		ontouchmove={handleDragMove}
		ontouchend={handleDragEnd}
		ontouchcancel={() => {
			isDragging = false;
			dragY = 0;
		}}
	>
		<!-- Drag Handle -->
		<div class="drag-handle" aria-hidden="true"></div>

		<h3 id="selector-title">Welche Fortsetzung?</h3>
		<p class="selector-hint">Es gibt {children.length} Antworten. Wähle eine:</p>

		<div class="children-list" role="list">
			{#each children as child, i (i)}
				<button class="child-option" onclick={() => onSelect(child.id)}>
					<span class="option-number">{i + 1}</span>
					<div class="option-content">
						<span class="option-role">{child.role === 'user' ? '👤 User' : '🤖 Assistant'}</span>
						<span class="option-preview">
							{(child as MessageNode).content?.slice(0, 80) ?? 'Nachricht'}
							{(child as MessageNode).content && (child as MessageNode).content.length > 80
								? '...'
								: ''}
						</span>
					</div>
				</button>
			{/each}
		</div>

		<button class="cancel-button" onclick={onClose}>Abbrechen</button>
	</div>
</div>

<style>
	.child-selector-overlay {
		position: fixed;
		inset: 0;
		z-index: 500;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.selector-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
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

	.selector-content {
		position: relative;
		width: 100%;
		max-height: 70vh;
		background: var(--traek-input-bg, rgba(30, 30, 30, 0.95));
		backdrop-filter: blur(16px);
		border-top: 1px solid var(--traek-input-border, #444444);
		border-radius: 24px 24px 0 0;
		padding: 24px 16px;
		padding-bottom: max(24px, env(safe-area-inset-bottom));
		color: var(--traek-node-text, #dddddd);
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
		transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		touch-action: none;
	}

	.selector-content.dragging {
		transition: none;
	}

	.selector-content.dismissing {
		transition: transform 0.2s ease-in;
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.drag-handle {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 60px;
		height: 20px;
		cursor: grab;
	}

	.drag-handle::after {
		content: '';
		position: absolute;
		top: 8px;
		left: 10px;
		right: 10px;
		height: 4px;
		background: var(--traek-input-context-text, #888888);
		border-radius: 2px;
		opacity: 0.5;
		transition: opacity 0.15s ease;
	}

	.dragging .drag-handle::after {
		opacity: 0.8;
	}

	.selector-content h3 {
		font-size: 20px;
		font-weight: 600;
		margin-bottom: 8px;
		margin-top: 12px;
	}

	.selector-hint {
		font-size: 14px;
		color: var(--traek-input-context-text, #888888);
		margin-bottom: 16px;
	}

	.children-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
		max-height: 50vh;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.child-option {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		min-height: 60px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		text-align: left;
		color: var(--traek-node-text, #dddddd);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.child-option:hover,
	.child-option:focus-visible {
		background: rgba(255, 255, 255, 0.1);
		border-color: var(--traek-input-dot, #00d8ff);
		transform: translateX(4px);
	}

	.child-option:active {
		transform: translateX(4px) scale(0.98);
	}

	.option-number {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--traek-input-dot, #00d8ff);
		color: var(--traek-input-button-text, #000000);
		border-radius: 50%;
		font-size: 14px;
		font-weight: 600;
	}

	.option-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.option-role {
		font-size: 12px;
		color: var(--traek-input-context-text, #888888);
		font-weight: 600;
	}

	.option-preview {
		font-size: 14px;
		line-height: 1.4;
		overflow: hidden;
		display: -webkit-box;
		line-clamp: 2;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.cancel-button {
		width: 100%;
		padding: 14px;
		min-height: 48px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		color: var(--traek-node-text, #dddddd);
		font-size: 16px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.cancel-button:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.cancel-button:active {
		transform: scale(0.98);
	}

	@media (prefers-reduced-motion: reduce) {
		.selector-content {
			animation: none;
		}
		.child-option:hover {
			transform: none;
		}
	}
</style>
