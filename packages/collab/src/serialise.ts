/**
 * @traek/collab — serialise
 *
 * Pure functions for converting @traek/core Node objects to/from the flat
 * CollabSerializedNode shape stored in the Yjs Y.Map.
 *
 * Extracted for testability and reuse.
 */

import type { Node, MessageNode } from '@traek/core';
import type { CollabSerializedNode } from './types.js';

/**
 * Convert a @traek/core Node to a flat, JSON-safe {@link CollabSerializedNode}.
 */
export function serialiseNode(node: Node): CollabSerializedNode {
	const msg = node as MessageNode;
	return {
		id: node.id,
		parentIds: node.parentIds,
		content: typeof msg.content === 'string' ? msg.content : '',
		role: node.role,
		type: node.type,
		status: node.status,
		errorMessage: node.errorMessage,
		createdAt: node.createdAt ?? Date.now(),
		metaX: node.metadata?.x ?? 0,
		metaY: node.metadata?.y ?? 0,
		...(node.metadata?.height !== undefined && { metaHeight: node.metadata.height }),
		...(Array.isArray(node.metadata?.tags) &&
			(node.metadata.tags as string[]).length > 0 && {
				metaTags: node.metadata.tags as string[]
			}),
		...(node.data !== undefined && { data: node.data })
	};
}

/**
 * Shallow comparison between two serialised nodes.
 * Returns `true` if any tracked field has changed so the Yjs doc needs updating.
 */
export function hasChanged(prev: CollabSerializedNode, next: CollabSerializedNode): boolean {
	if (prev.content !== next.content) return true;
	if (prev.role !== next.role) return true;
	if (prev.type !== next.type) return true;
	if (prev.status !== next.status) return true;
	if (prev.errorMessage !== next.errorMessage) return true;
	if (prev.metaX !== next.metaX) return true;
	if (prev.metaY !== next.metaY) return true;
	if (prev.metaHeight !== next.metaHeight) return true;
	if (prev.parentIds.join(',') !== next.parentIds.join(',')) return true;
	return false;
}
