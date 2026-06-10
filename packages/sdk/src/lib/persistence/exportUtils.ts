/**
 * Utilities for exporting conversations as JSON and Markdown.
 */

import type { ConversationSnapshot, SerializedNode } from './types';

/**
 * Export a snapshot as pretty-printed JSON.
 */
export function snapshotToJSON(snapshot: ConversationSnapshot): string {
	return JSON.stringify(snapshot, null, 2);
}

/**
 * Export a snapshot as Markdown.
 * Linearizes the tree structure into threads (root → leaf paths).
 */
export function snapshotToMarkdown(snapshot: ConversationSnapshot): string {
	const title = sanitizeMarkdownTitle(snapshot.title ?? 'Untitled Conversation');
	const createdAt = new Date(snapshot.createdAt).toLocaleString();

	let md = `# ${title}\n\n`;
	md += `_Created: ${createdAt}_\n\n`;

	if (snapshot.nodes.length === 0) {
		md += '_(No messages)_\n';
		return md;
	}

	// Build a map for quick lookups
	const nodeMap = new Map<string, SerializedNode>();
	for (const node of snapshot.nodes) {
		nodeMap.set(node.id, node);
	}

	// Find all root nodes (no parents)
	const roots = snapshot.nodes.filter((n) => n.parentIds.length === 0);

	if (roots.length === 0) {
		// Fallback: find nodes with invalid parentIds
		const orphans = snapshot.nodes.filter(
			(n) => n.parentIds.length > 0 && !nodeMap.has(n.parentIds[0])
		);
		if (orphans.length > 0) {
			md += '## Orphaned Messages\n\n';
			for (const node of orphans) {
				md += renderNode(node);
			}
		}
		return md;
	}

	// Extract all threads (root → leaf paths)
	const threads = extractThreads(roots, nodeMap);

	// Render each thread
	threads.forEach((thread, idx) => {
		const pathStr = thread.map((n) => n.role).join(' → ');
		md += `## Thread ${idx + 1}: ${pathStr}\n\n`;

		for (const node of thread) {
			md += renderNode(node);
		}

		md += '---\n\n';
	});

	return md;
}

/** Hard cap on extracted threads to keep DAG exports bounded. */
const MAX_THREADS = 1000;

/**
 * Extract all linear threads (root → leaf paths) from the tree.
 * Guards against cycles (terminates the path) and caps the total
 * number of threads so DAG fan-out cannot explode.
 */
function extractThreads(
	roots: SerializedNode[],
	nodeMap: Map<string, SerializedNode>
): SerializedNode[][] {
	const threads: SerializedNode[][] = [];

	// Precompute children once: parentId → child nodes (O(n) instead of O(n²))
	const childrenMap = new Map<string, SerializedNode[]>();
	for (const node of nodeMap.values()) {
		for (const parentId of node.parentIds) {
			const list = childrenMap.get(parentId);
			if (list) {
				list.push(node);
			} else {
				childrenMap.set(parentId, [node]);
			}
		}
	}

	const path: SerializedNode[] = [];

	const onPath = new Set<string>();

	function dfs(node: SerializedNode): void {
		if (threads.length >= MAX_THREADS) return;

		if (onPath.has(node.id)) {
			// Cycle detected: terminate this path as a thread
			threads.push([...path]);
			return;
		}

		path.push(node);
		onPath.add(node.id);

		const children = childrenMap.get(node.id) ?? [];
		if (children.length === 0) {
			// Leaf node: this is a complete thread
			threads.push([...path]);
		} else {
			for (const child of children) {
				dfs(child);
			}
		}

		path.pop();
		onPath.delete(node.id);
	}

	for (const root of roots) {
		dfs(root);
	}

	return threads;
}

/**
 * Sanitize a title for safe interpolation into a Markdown heading:
 * collapse newlines and escape a leading `#` so the title cannot
 * inject extra headings or break the document structure.
 */
function sanitizeMarkdownTitle(title: string): string {
	const flattened = title.replace(/[\r\n]+/g, ' ').trim();
	return flattened.startsWith('#') ? `\\${flattened}` : flattened;
}

/**
 * Render a single node as Markdown.
 */
function renderNode(node: SerializedNode): string {
	let md = '';

	const roleLabel =
		node.role === 'user' ? 'User' : node.role === 'assistant' ? 'Assistant' : 'System';

	md += `**${roleLabel}:**\n\n`;

	if (node.content.trim()) {
		md += `${node.content.trim()}\n\n`;
	} else {
		md += '_(No content)_\n\n';
	}

	return md;
}

/**
 * Download a file to the user's device.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
	if (typeof window === 'undefined') return;

	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';

	document.body.appendChild(a);
	a.click();

	// Cleanup
	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);
}
