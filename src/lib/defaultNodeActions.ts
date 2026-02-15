import type { NodeTypeAction } from './node-types/types.js';
import type { Node, TraekEngine, MessageNode } from './TraekEngine.svelte';

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

export interface DefaultNodeActionCallbacks {
	onRetry?: (nodeId: string) => void;
	onEditNode?: (nodeId: string) => void;
}

export function createDefaultNodeActions(callbacks: DefaultNodeActionCallbacks): NodeTypeAction[] {
	const actions: NodeTypeAction[] = [duplicateAction, deleteAction];
	if (callbacks.onRetry) {
		actions.push(createRetryAction(callbacks.onRetry));
	}
	if (callbacks.onEditNode) {
		actions.push(createEditAction(callbacks.onEditNode));
	}
	return actions;
}
