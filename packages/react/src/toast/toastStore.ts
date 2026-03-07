export type ToastType = 'success' | 'error' | 'info' | 'undo';

export interface ToastData {
	id: string;
	type: ToastType;
	message: string;
	/** Callback for undo-type toasts */
	onUndo?: () => void;
	/** Auto-dismiss timeout in ms */
	duration: number;
}

type Listener = () => void;

const MAX_VISIBLE = 3;

class ToastStore {
	private toasts: ToastData[] = [];
	private timers = new Map<string, ReturnType<typeof setTimeout>>();
	private listeners = new Set<Listener>();

	subscribe(listener: Listener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	getToasts(): ToastData[] {
		return this.toasts;
	}

	private notify(): void {
		for (const l of this.listeners) l();
	}

	addToast(opts: Omit<ToastData, 'id'>): string {
		const id = crypto.randomUUID();
		const toast: ToastData = { ...opts, id };

		while (this.toasts.length >= MAX_VISIBLE) {
			const oldest = this.toasts[0];
			if (oldest) this.removeToast(oldest.id);
		}

		this.toasts = [...this.toasts, toast];
		this.notify();

		const timer = setTimeout(() => this.removeToast(id), toast.duration);
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
		this.notify();
	}

	clear(): void {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
		this.toasts = [];
		this.notify();
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
