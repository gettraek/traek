import type { ConversationSnapshot } from '../persistence/schemas';
import type { VersionHistoryManager } from './VersionHistoryManager';

export interface AutoSnapshotTimerOptions {
	/** Interval between auto-snapshots in ms. Default 5 minutes. */
	intervalMs?: number;
	/** Custom label prefix. Default 'Auto-save'. */
	labelPrefix?: string;
}

/**
 * Fires periodic auto-snapshots for a conversation.
 * Call start() to begin, stop() to cancel.
 */
export class AutoSnapshotTimer {
	private manager: VersionHistoryManager;
	private conversationId: string;
	private getSnapshot: () => ConversationSnapshot;
	private options: Required<AutoSnapshotTimerOptions>;
	private timerId: ReturnType<typeof setInterval> | null = null;

	/** Optional callback fired after each snapshot is saved. */
	onSnapshot?: (conversationId: string) => Promise<void>;

	constructor(
		manager: VersionHistoryManager,
		conversationId: string,
		getSnapshot: () => ConversationSnapshot,
		options: AutoSnapshotTimerOptions = {}
	) {
		this.manager = manager;
		this.conversationId = conversationId;
		this.getSnapshot = getSnapshot;
		this.options = {
			intervalMs: options.intervalMs ?? 5 * 60 * 1000,
			labelPrefix: options.labelPrefix ?? 'Auto-save'
		};
	}

	start(): void {
		if (this.timerId !== null) return;
		this.timerId = setInterval(() => this.fire(), this.options.intervalMs);
	}

	stop(): void {
		if (this.timerId !== null) {
			clearInterval(this.timerId);
			this.timerId = null;
		}
	}

	get isRunning(): boolean {
		return this.timerId !== null;
	}

	private async fire(): Promise<void> {
		const snapshot = this.getSnapshot();
		await this.manager.saveAutoSnapshot(
			this.conversationId,
			snapshot,
			`${this.options.labelPrefix} ${new Date().toLocaleTimeString()}`
		);
		await this.onSnapshot?.(this.conversationId);
	}
}
