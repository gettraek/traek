/**
 * Demo persistence: localStorage-backed conversation list and payloads.
 * Used by the demo app in src/routes/demo.
 */

import type { AddNodePayload } from './TraekEngine.svelte';

const LIST_KEY = 'traek-demo-conversations';
const CONV_PREFIX = 'traek-demo-conv-';

export interface ConversationMeta {
	id: string;
	title: string;
	updatedAt: number;
	/** Number of message nodes in the conversation. */
	nodeCount?: number;
}

export interface SavedViewport {
	scale: number;
	offsetX: number;
	offsetY: number;
}

export interface SavedConversation {
	id: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	nodes: AddNodePayload[];
	/** Last viewport (pan/zoom) for "continue where you left off". */
	viewport?: SavedViewport;
	/** Last focused node id (reply context). */
	activeNodeId?: string | null;
}

function getList(): ConversationMeta[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(LIST_KEY);
		return raw ? (JSON.parse(raw) as ConversationMeta[]) : [];
	} catch {
		return [];
	}
}

function setList(list: ConversationMeta[]) {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(LIST_KEY, JSON.stringify(list));
	} catch {
		// ignore
	}
}

export function listConversations(): ConversationMeta[] {
	return getList().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): SavedConversation | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(CONV_PREFIX + id);
		return raw ? (JSON.parse(raw) as SavedConversation) : null;
	} catch {
		return null;
	}
}

export function saveConversation(data: SavedConversation): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.setItem(CONV_PREFIX + data.id, JSON.stringify(data));
		const list = getList();
		const idx = list.findIndex((c) => c.id === data.id);
		const meta: ConversationMeta = {
			id: data.id,
			title: data.title,
			updatedAt: data.updatedAt,
			nodeCount: data.nodes.length
		};
		if (idx >= 0) list[idx] = meta;
		else list.push(meta);
		setList(list);
	} catch {
		// ignore
	}
}

export function createConversation(): SavedConversation {
	const id = crypto.randomUUID();
	const now = Date.now();
	const conv: SavedConversation = {
		id,
		title: 'New chat',
		createdAt: now,
		updatedAt: now,
		nodes: []
	};
	saveConversation(conv);
	return conv;
}

export function deleteConversation(id: string): void {
	if (typeof window === 'undefined') return;
	try {
		localStorage.removeItem(CONV_PREFIX + id);
		setList(getList().filter((c) => c.id !== id));
	} catch {
		// ignore
	}
}

/** Derive a short title from the first user message. */
export function titleFromNodes(nodes: AddNodePayload[]): string {
	const first = nodes.find((n) => n.role === 'user');
	if (first && typeof first.content === 'string') {
		const text = first.content.trim().slice(0, 60);
		return text + (first.content.length > 60 ? '…' : '');
	}
	return 'New chat';
}
