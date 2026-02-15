import type { NodeStatus, TraekEngineConfig } from '../TraekEngine.svelte';

export interface SerializedNode {
	id: string;
	parentId: string | null;
	content: string;
	role: 'user' | 'assistant' | 'system';
	type: string;
	status?: NodeStatus;
	createdAt: number;
	metadata: { x: number; y: number; height?: number };
	data?: unknown;
}

export interface ConversationSnapshot {
	version: 1;
	createdAt: number;
	title?: string;
	config?: Partial<TraekEngineConfig>;
	viewport?: { scale: number; offsetX: number; offsetY: number };
	activeNodeId: string | null;
	nodes: SerializedNode[];
}
