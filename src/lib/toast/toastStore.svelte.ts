export type ToastType = 'success' | 'error' | 'info' | 'undo';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	/** Callback for undo-type toasts */
	onUndo?: () => void;
	/** Auto-dismiss timeout in ms (default 4000, undo: 30000) */
	duration: number;
}

const MAX_VISIBLE = 3;

class ToastStore {
	toasts = $state<Toast[]>([]);
	private timers = new Map<string, ReturnType<typeof setTimeout>>();

	addToast(opts: Omit<Toast, 'id'>): string {
		const id = crypto.randomUUID();
		const toast: Toast = { ...opts, id };

		// Evict oldest if at max
		while (this.toasts.length >= MAX_VISIBLE) {
			const oldest = this.toasts[0];
			if (oldest) this.removeToast(oldest.id);
		}

		this.toasts.push(toast);

		// Auto-dismiss
		const timer = setTimeout(() => {
			this.removeToast(id);
		}, toast.duration);
		this.timers.set(id, timer);

		return id;
	}

	removeToast(id: string): void {
		const timer = this.timers.get(id);
		if (timer != null) {
			clearTimeout(timer);
			this.timers.delete(id);
		}
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	clear(): void {
		for (const timer of this.timers.values()) {
			clearTimeout(timer);
		}
		this.timers.clear();
		this.toasts = [];
	}
}

export const toastStore = new ToastStore();

/** Show a simple toast notification. */
export function toast(message: string, type: ToastType = 'info'): string {
	return toastStore.addToast({ message, type, duration: 4000 });
}

/** Show an undo toast with a 30s window. */
export function toastUndo(message: string, onUndo: () => void): string {
	return toastStore.addToast({ message, type: 'undo', onUndo, duration: 30000 });
}
