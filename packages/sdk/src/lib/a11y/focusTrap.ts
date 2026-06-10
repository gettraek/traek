import type { Action } from 'svelte/action';

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])'
].join(', ');

function getFocusable(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(el) => el.getClientRects().length > 0
	);
}

/**
 * Svelte action that traps Tab/Shift+Tab focus inside the element.
 *
 * On mount, focuses the element marked with `[data-autofocus]` (the element itself or a
 * descendant), falling back to the first focusable descendant, then to the element itself
 * (useful for containers with `tabindex="-1"`). On destroy, focus is restored to the element
 * that was focused before the trap was activated.
 */
export const focusTrap: Action<HTMLElement> = (node) => {
	const previouslyFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;

	function focusInitial() {
		const autofocus = node.matches('[data-autofocus]')
			? node
			: node.querySelector<HTMLElement>('[data-autofocus]');
		const target = autofocus ?? getFocusable(node)[0] ?? node;
		target.focus();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Tab') return;

		const focusable = getFocusable(node);
		if (focusable.length === 0) {
			e.preventDefault();
			node.focus();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;
		const activeInside = active instanceof HTMLElement && node.contains(active);

		if (e.shiftKey) {
			if (!activeInside || active === first || active === node) {
				e.preventDefault();
				last.focus();
			}
		} else if (!activeInside || active === last) {
			e.preventDefault();
			first.focus();
		}
	}

	focusInitial();
	node.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			if (previouslyFocused && previouslyFocused.isConnected) {
				previouslyFocused.focus();
			}
		}
	};
};
