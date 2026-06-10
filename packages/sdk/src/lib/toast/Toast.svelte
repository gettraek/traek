<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Toast } from './toastStore.svelte';
	import { toastStore } from './toastStore.svelte';
	import { getTraekI18n } from '../i18n/index';

	const i18n = getTraekI18n();

	let { toast }: { toast: Toast } = $props();

	let progress = $state(100);
	let visible = $state(false);
	let hovered = $state(false);
	let focused = $state(false);
	// Countdown pauses while the pointer hovers OR focus is inside the toast.
	const paused = $derived(hovered || focused);
	let counting = false;
	let rafId = 0;
	let startTime = 0;
	// Each Toast instance belongs to one immutable toast entry; capture once.
	let remaining = untrack(() => toast.duration);
	let dismissTimer: ReturnType<typeof setTimeout> | undefined;

	const icons: Record<string, string> = {
		success: '\u2713',
		error: '\u2715',
		info: '\u2139',
		undo: '\u21A9'
	};

	const tick = (now: number) => {
		const elapsed = now - startTime;
		progress = Math.max(0, ((remaining - elapsed) / toast.duration) * 100);
		if (progress > 0) {
			rafId = requestAnimationFrame(tick);
		}
	};

	function startCountdown() {
		if (counting) return;
		counting = true;
		startTime = performance.now();
		dismissTimer = setTimeout(() => toastStore.removeToast(toast.id), remaining);
		rafId = requestAnimationFrame(tick);
	}

	function stopCountdown() {
		if (!counting) return;
		counting = false;
		clearTimeout(dismissTimer);
		cancelAnimationFrame(rafId);
		remaining = Math.max(0, remaining - (performance.now() - startTime));
	}

	function handleFocusOut(e: FocusEvent) {
		const next = e.relatedTarget;
		if (next instanceof Node && e.currentTarget instanceof Node && e.currentTarget.contains(next))
			return;
		focused = false;
	}

	onMount(() => {
		// Take over auto-dismiss from the store so hover/focus can pause the countdown.
		toastStore.claimTimer(toast.id);

		// Trigger slide-in on next frame
		requestAnimationFrame(() => {
			visible = true;
		});

		return () => {
			stopCountdown();
			// Hand the dismiss timer back to the store in case the toast entry
			// outlives this component instance, so it can never linger forever.
			toastStore.releaseTimer(toast.id, remaining);
		};
	});

	$effect(() => {
		if (paused) {
			stopCountdown();
		} else {
			startCountdown();
		}
	});

	function handleUndo() {
		toast.onUndo?.();
		toastStore.removeToast(toast.id);
	}

	function handleClose() {
		toastStore.removeToast(toast.id);
	}
</script>

<div
	class="traek-toast traek-toast--{toast.type}"
	class:traek-toast--visible={visible}
	role="status"
	aria-live="polite"
	onmouseenter={() => (hovered = true)}
	onmouseleave={() => (hovered = false)}
	onfocusin={() => (focused = true)}
	onfocusout={handleFocusOut}
>
	<div class="traek-toast__icon" aria-hidden="true">{icons[toast.type] ?? '\u2139'}</div>
	<div class="traek-toast__body">
		<span class="traek-toast__message">{toast.message}</span>
		{#if toast.type === 'undo' && toast.onUndo}
			<button class="traek-toast__undo" onclick={handleUndo}>{i18n.toast.undo}</button>
		{/if}
	</div>
	<button class="traek-toast__close" onclick={handleClose} aria-label={i18n.toast.dismiss}>✕</button
	>
	<div class="traek-toast__progress" style:width="{progress}%"></div>
</div>

<style>
	.traek-toast {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-radius: 10px;
		background: var(--traek-toast-bg, #1e1e1e);
		border: 1px solid var(--traek-toast-border, #333);
		color: var(--traek-toast-text, #ddd);
		font-size: 13px;
		min-width: 280px;
		max-width: 400px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		overflow: hidden;
		transform: translateX(-120%);
		opacity: 0;
		transition:
			transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1),
			opacity 0.3s ease;
	}

	.traek-toast--visible {
		transform: translateX(0);
		opacity: 1;
	}

	.traek-toast__icon {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 700;
	}

	.traek-toast--success .traek-toast__icon {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}
	.traek-toast--error .traek-toast__icon {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}
	.traek-toast--info .traek-toast__icon {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}
	.traek-toast--undo .traek-toast__icon {
		background: rgba(0, 216, 255, 0.2);
		color: var(--traek-toast-undo-accent, #00d8ff);
	}

	.traek-toast__body {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.traek-toast__message {
		flex: 1;
		line-height: 1.4;
	}

	.traek-toast__undo {
		flex-shrink: 0;
		background: none;
		border: 1px solid var(--traek-toast-undo-accent, #00d8ff);
		color: var(--traek-toast-undo-accent, #00d8ff);
		padding: 4px 12px;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.traek-toast__undo:hover {
		background: var(--traek-toast-undo-accent, #00d8ff);
		color: #000;
	}

	.traek-toast__close {
		flex-shrink: 0;
		background: none;
		border: none;
		color: var(--traek-toast-close, #666);
		font-size: 14px;
		cursor: pointer;
		padding: 2px;
		line-height: 1;
		transition: color 0.15s;
	}

	.traek-toast__close:hover {
		color: var(--traek-toast-text, #ddd);
	}

	.traek-toast__progress {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		background: var(--traek-toast-progress, #444);
		transition: width 0.1s linear;
	}

	.traek-toast--undo .traek-toast__progress {
		background: var(--traek-toast-undo-accent, #00d8ff);
		opacity: 0.4;
	}
</style>
