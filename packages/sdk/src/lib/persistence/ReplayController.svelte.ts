import type { ConversationSnapshot, SerializedNode } from './types';
import { TraekEngine, type TraekEngineConfig } from '../TraekEngine.svelte';

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
	private engine: TraekEngine;
	private config?: Partial<TraekEngineConfig>;
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
		this.sortedNodes = [...snapshot.nodes].sort((a, b) => a.createdAt - b.createdAt);
		this.totalNodes = this.sortedNodes.length;
		this.config = options?.config ?? snapshot.config;
		this.onNodeAdded = options?.onNodeAdded;
		this.baseIntervalMs = options?.baseIntervalMs ?? 800;
		this.engine = new TraekEngine(this.config);
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
		this.engine.addNodes([
			{
				id: node.id,
				parentIds: node.parentIds,
				content: node.content,
				role: node.role,
				type: node.type,
				status: node.status,
				createdAt: node.createdAt,
				metadata: node.metadata,
				data: node.data
			}
		]);
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

	/** Jump to a specific index. Rebuilds the engine state up to that point. */
	seekTo(index: number): void {
		const target = Math.max(-1, Math.min(index, this.totalNodes - 1));
		const wasPlaying = this.isPlaying;
		this.pause();

		// Rebuild from scratch
		this.engine = new TraekEngine(this.config);
		this.currentIndex = -1;

		if (target >= 0) {
			const nodesToAdd = this.sortedNodes.slice(0, target + 1);
			this.engine.addNodes(
				nodesToAdd.map((n) => ({
					id: n.id,
					parentIds: n.parentIds,
					content: n.content,
					role: n.role,
					type: n.type,
					status: n.status,
					createdAt: n.createdAt,
					metadata: n.metadata,
					data: n.data
				}))
			);
			this.currentIndex = target;
			const lastNode = nodesToAdd[nodesToAdd.length - 1];
			if (lastNode) {
				this.engine.activeNodeId = lastNode.id;
				this.onNodeAdded?.(lastNode.id);
			}
		}

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

	/** Reset to beginning. */
	reset(): void {
		this.pause();
		this.engine = new TraekEngine(this.config);
		this.currentIndex = -1;
	}

	/** Clean up timers. */
	destroy(): void {
		this.pause();
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
