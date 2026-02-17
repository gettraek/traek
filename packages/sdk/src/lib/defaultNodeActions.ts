import type { NodeTypeAction } from './node-types/types';
import type { Node, TraekEngine, MessageNode } from './TraekEngine.svelte';
import { toast } from './toast/toastStore.svelte';

export const duplicateAction: NodeTypeAction = {
	id: 'duplicate',
	label: 'Duplicate',
	icon: 'solar:copy-linear',
	handler: (node: Node, engine: TraekEngine) => {
		engine.duplicateNode(node.id);
	}
};

export const deleteAction: NodeTypeAction = {
	id: 'delete',
	label: 'Delete',
	icon: 'solar:trash-bin-minimalistic-linear',
	handler: (node: Node, engine: TraekEngine) => {
		engine.deleteNode(node.id);
	},
	variants: (node: Node, engine: TraekEngine) => {
		const count = engine.getDescendantCount(node.id);
		if (count === 0) return null;
		return [
			{
				label: 'Only this node',
				handler: (n: Node, e: TraekEngine) => e.deleteNode(n.id)
			},
			{
				label: `With ${count} descendant${count > 1 ? 's' : ''}`,
				handler: (n: Node, e: TraekEngine) => e.deleteNodeAndDescendants(n.id)
			}
		];
	}
};

export function createRetryAction(onRetry: (nodeId: string) => void): NodeTypeAction {
	return {
		id: 'retry',
		label: 'Retry',
		icon: 'solar:refresh-linear',
		handler: (node: Node) => {
			onRetry(node.id);
		}
	};
}

export function createEditAction(onEditNode: (nodeId: string) => void): NodeTypeAction {
	return {
		id: 'edit',
		label: 'Edit',
		icon: 'solar:pen-linear',
		handler: (node: Node) => {
			onEditNode(node.id);
		}
	};
}

export const copyBranchAction: NodeTypeAction = {
	id: 'copy-branch',
	label: 'Copy Branch',
	icon: 'solar:clipboard-list-linear',
	handler: async (node: Node, engine: TraekEngine) => {
		// Build linear path from root to this node (following primary parent chain)
		const path: Node[] = [];
		let current: Node | null | undefined = node;

		while (current) {
			path.unshift(current);
			const primaryParentId: string | undefined = current.parentIds[0];
			current = primaryParentId ? engine.getNode(primaryParentId) : undefined;
		}

		// Format as Markdown
		const markdown = path
			.map((n) => {
				const roleHeader =
					n.role === 'user' ? '## User' : n.role === 'assistant' ? '## Assistant' : '## System';
				const content = (n as MessageNode).content ?? '';
				return `${roleHeader}\n${content}`;
			})
			.join('\n\n');

		// Copy to clipboard
		try {
			await navigator.clipboard.writeText(markdown);
			toast('Branch copied to clipboard', 'success');
		} catch (err) {
			console.error('Failed to copy to clipboard:', err);
			toast('Failed to copy to clipboard', 'error');
		}
	}
};

export function createCompareAction(onCompare: (nodeId: string) => void): NodeTypeAction {
	return {
		id: 'compare',
		label: 'Compare branches',
		icon: 'solar:code-file-linear',
		handler: (node: Node) => {
			onCompare(node.id);
		}
	};
}

export interface DefaultNodeActionCallbacks {
	onRetry?: (nodeId: string) => void;
	onEditNode?: (nodeId: string) => void;
	onCompare?: (nodeId: string) => void;
}

export function createDefaultNodeActions(callbacks: DefaultNodeActionCallbacks): NodeTypeAction[] {
	const actions: NodeTypeAction[] = [duplicateAction, copyBranchAction, deleteAction];
	if (callbacks.onRetry) {
		actions.push(createRetryAction(callbacks.onRetry));
	}
	if (callbacks.onEditNode) {
		actions.push(createEditAction(callbacks.onEditNode));
	}
	if (callbacks.onCompare) {
		actions.push(createCompareAction(callbacks.onCompare));
	}
	return actions;
}
