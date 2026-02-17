import type { NodeTypeAction } from './node-types/types';
import type { Node, TraekEngine, MessageNode } from './TraekEngine.svelte';
import { toast } from './toast/toastStore.svelte';
import type { TraekTranslations } from './i18n/types';
import { DEFAULT_TRANSLATIONS } from './i18n/defaults';

export function createDuplicateAction(labels = DEFAULT_TRANSLATIONS.nodeActions): NodeTypeAction {
	return {
		id: 'duplicate',
		label: labels.duplicate,
		icon: 'solar:copy-linear',
		handler: (node: Node, engine: TraekEngine) => {
			engine.duplicateNode(node.id);
		}
	};
}

export function createDeleteAction(labels = DEFAULT_TRANSLATIONS.nodeActions): NodeTypeAction {
	return {
		id: 'delete',
		label: labels.delete,
		icon: 'solar:trash-bin-minimalistic-linear',
		handler: (node: Node, engine: TraekEngine) => {
			engine.deleteNode(node.id);
		},
		variants: (node: Node, engine: TraekEngine) => {
			const count = engine.getDescendantCount(node.id);
			if (count === 0) return null;
			return [
				{
					label: labels.onlyThisNode,
					handler: (n: Node, e: TraekEngine) => e.deleteNode(n.id)
				},
				{
					label: labels.withDescendants(count),
					handler: (n: Node, e: TraekEngine) => e.deleteNodeAndDescendants(n.id)
				}
			];
		}
	};
}

/** @deprecated Use createDuplicateAction() instead for i18n support. */
export const duplicateAction: NodeTypeAction = createDuplicateAction();

/** @deprecated Use createDeleteAction() instead for i18n support. */
export const deleteAction: NodeTypeAction = createDeleteAction();

export function createRetryAction(
	onRetry: (nodeId: string) => void,
	labels = DEFAULT_TRANSLATIONS.nodeActions
): NodeTypeAction {
	return {
		id: 'retry',
		label: labels.retry,
		icon: 'solar:refresh-linear',
		handler: (node: Node) => {
			onRetry(node.id);
		}
	};
}

export function createEditAction(
	onEditNode: (nodeId: string) => void,
	labels = DEFAULT_TRANSLATIONS.nodeActions
): NodeTypeAction {
	return {
		id: 'edit',
		label: labels.edit,
		icon: 'solar:pen-linear',
		handler: (node: Node) => {
			onEditNode(node.id);
		}
	};
}

export function createCopyBranchAction(labels = DEFAULT_TRANSLATIONS.nodeActions): NodeTypeAction {
	return {
		id: 'copy-branch',
		label: labels.copyBranch,
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
				toast(labels.branchCopied, 'success');
			} catch (err) {
				console.error('Failed to copy to clipboard:', err);
				toast(labels.copyFailed, 'error');
			}
		}
	};
}

/** @deprecated Use createCopyBranchAction() instead for i18n support. */
export const copyBranchAction: NodeTypeAction = createCopyBranchAction();

export function createCompareAction(
	onCompare: (nodeId: string) => void,
	labels = DEFAULT_TRANSLATIONS.nodeActions
): NodeTypeAction {
	return {
		id: 'compare',
		label: labels.compareBranches,
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
	translations?: TraekTranslations;
}

export function createDefaultNodeActions(callbacks: DefaultNodeActionCallbacks): NodeTypeAction[] {
	const labels = callbacks.translations?.nodeActions ?? DEFAULT_TRANSLATIONS.nodeActions;
	const actions: NodeTypeAction[] = [
		createDuplicateAction(labels),
		createCopyBranchAction(labels),
		createDeleteAction(labels)
	];
	if (callbacks.onRetry) {
		actions.push(createRetryAction(callbacks.onRetry, labels));
	}
	if (callbacks.onEditNode) {
		actions.push(createEditAction(callbacks.onEditNode, labels));
	}
	if (callbacks.onCompare) {
		actions.push(createCompareAction(callbacks.onCompare, labels));
	}
	return actions;
}
