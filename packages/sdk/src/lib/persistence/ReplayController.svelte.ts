import type { ConversationSnapshot, SerializedNode } from './types';
import { conversationSnapshotSchema } from './schemas';
import { TraekEngine, type TraekEngineConfig, type AddNodePayload } from '../TraekEngine.svelte';

/**
 * Replays a conversation snapshot step by step, adding nodes
 * chronologically to a TraekEngine instance.
 */
export class ReplayController {
	/** Index of the last added node (0-based). -1 means empty. */
	currentIndex = $state(-1);
	/** Whether replay is actively playing. */
	isPlaying = $state(false);
	/** Playback speed multiplier. */
	speed = $state(1);
	/** Total number of nodes in the snapshot. */
	readonly totalNodes: number;

	private sortedNodes: SerializedNode[];
	/**
	 * Single engine instance for the controller's lifetime. Never reassigned:
	 * consumers hold a reference via getEngine(), so seekTo/reset mutate this
	 * instance in place instead of swapping it for a new one.
	 */
	private readonly engine: TraekEngine;
	private onNodeAdded?: (nodeId: string) => void;
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private baseIntervalMs: number;

	constructor(
		snapshot: ConversationSnapshot,
		options?: {
			config?: Partial<TraekEngineConfig>;
			/** Called after each node is added (e.g. to centerOnNode). */
			onNodeAdded?: (nodeId: string) => void;
			/** Base interval in ms between nodes at 1x speed. Default 800. */
			baseIntervalMs?: number;
		}
	) {
		// Validate at the boundary: snapshots often come from storage or files.
		const parsed = conversationSnapshotSchema.safeParse(snapshot);
		if (!parsed.success) {
			throw new Error(`Invalid conversation snapshot: ${parsed.error.message}`);
		}

		this.sortedNodes = [...parsed.data.nodes].sort((a, b) => a.createdAt - b.createdAt);
		this.totalNodes = this.sortedNodes.length;
		this.onNodeAdded = options?.onNodeAdded;
		this.baseIntervalMs = options?.baseIntervalMs ?? 800;
		this.engine = new TraekEngine(options?.config ?? parsed.data.config);
	}

	/** Get the engine instance being replayed into. */
	getEngine(): TraekEngine {
		return this.engine;
	}

	/** Start or resume playback. */
	play(): void {
		if (this.isPlaying) return;
		if (this.currentIndex >= this.totalNodes - 1) return;
		this.isPlaying = true;
		this.scheduleNext();
	}

	/** Pause playback. */
	pause(): void {
		this.isPlaying = false;
		this.clearInterval();
	}

	/** Add the next node. */
	step(): void {
		if (this.currentIndex >= this.totalNodes - 1) return;
		this.currentIndex += 1;
		const node = this.sortedNodes[this.currentIndex];
		if (!node) return;
		this.engine.addNodes([this.toPayload(node)]);
		this.engine.activeNodeId = node.id;
		this.onNodeAdded?.(node.id);

		if (this.isPlaying && this.currentIndex >= this.totalNodes - 1) {
			this.pause();
		}
	}

	/** Remove the last added node. */
	stepBack(): void {
		if (this.currentIndex < 0) return;
		const node = this.sortedNodes[this.currentIndex];
		if (node) {
			this.engine.deleteNode(node.id);
		}
		this.currentIndex -= 1;
		const prev = this.currentIndex >= 0 ? this.sortedNodes[this.currentIndex] : null;
		this.engine.activeNodeId = prev?.id ?? null;
		if (prev) this.onNodeAdded?.(prev.id);
	}

	/**
	 * Jump to a specific index. Mutates the existing engine in place
	 * (adds missing nodes or removes newest-first) so external references
	 * from getEngine() stay valid.
	 */
	seekTo(index: number): void {
		const target = Math.max(-1, Math.min(index, this.totalNodes - 1));
		const wasPlaying = this.isPlaying;
		this.pause();

		if (target > this.currentIndex) {
			// Add the missing nodes in one batch (parents always precede children
			// chronologically, and addNodes topologically sorts as a safety net).
			const nodesToAdd = this.sortedNodes.slice(this.currentIndex + 1, target + 1);
			this.engine.addNodes(nodesToAdd.map((n) => this.toPayload(n)));
		} else if (target < this.currentIndex) {
			// Remove newest-first so children are deleted before their parents.
			for (let i = this.currentIndex; i > target; i--) {
				this.engine.deleteNode(this.sortedNodes[i].id);
			}
		}

		this.currentIndex = target;
		const current = target >= 0 ? this.sortedNodes[target] : null;
		this.engine.activeNodeId = current?.id ?? null;
		if (current) this.onNodeAdded?.(current.id);

		if (wasPlaying && target < this.totalNodes - 1) {
			this.play();
		}
	}

	/** Set playback speed multiplier. */
	setSpeed(multiplier: number): void {
		this.speed = multiplier;
		if (this.isPlaying) {
			this.clearInterval();
			this.scheduleNext();
		}
	}

	/** Reset to beginning. Keeps the same engine instance. */
	reset(): void {
		this.pause();
		this.seekTo(-1);
	}

	/** Clean up timers. */
	destroy(): void {
		this.pause();
	}

	private toPayload(node: SerializedNode): AddNodePayload {
		return {
			id: node.id,
			parentIds: node.parentIds,
			content: node.content,
			role: node.role,
			type: node.type,
			status: node.status,
			createdAt: node.createdAt,
			metadata: node.metadata,
			data: node.data
		};
	}

	private scheduleNext(): void {
		this.clearInterval();
		const ms = Math.max(50, this.baseIntervalMs / this.speed);
		this.intervalId = globalThis.setInterval(() => {
			this.step();
		}, ms);
	}

	private clearInterval(): void {
		if (this.intervalId != null) {
			globalThis.clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}
