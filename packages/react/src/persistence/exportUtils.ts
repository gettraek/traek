/**
 * Utilities for exporting conversations as JSON and Markdown.
 */

import type { ConversationSnapshot, SerializedNode } from '@traek/core';

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
	const title = snapshot.title ?? 'Untitled Conversation';
	const createdAt = new Date(snapshot.createdAt).toLocaleString();

	let md = `# ${title}\n\n`;
	md += `_Created: ${createdAt}_\n\n`;

	if (snapshot.nodes.length === 0) {
		md += '_(No messages)_\n';
		return md;
	}

	const nodeMap = new Map<string, SerializedNode>();
	for (const node of snapshot.nodes) {
		nodeMap.set(node.id, node);
	}

	const roots = snapshot.nodes.filter((n) => n.parentIds.length === 0);

	if (roots.length === 0) {
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

	const threads = extractThreads(roots, nodeMap);

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

function extractThreads(
	roots: SerializedNode[],
	nodeMap: Map<string, SerializedNode>
): SerializedNode[][] {
	const threads: SerializedNode[][] = [];

	function dfs(node: SerializedNode, path: SerializedNode[]): void {
		const newPath = [...path, node];
		const nodeChildren = Array.from(nodeMap.values()).filter((n) => n.parentIds.includes(node.id));

		if (nodeChildren.length === 0) {
			threads.push(newPath);
		} else {
			for (const child of nodeChildren) {
				dfs(child, newPath);
			}
		}
	}

	for (const root of roots) {
		dfs(root, []);
	}

	return threads;
}

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

	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);
}
