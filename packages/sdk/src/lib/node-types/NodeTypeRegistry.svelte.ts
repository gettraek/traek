import type { NodeTypeDefinition } from './types';

/**
 * Reactive node type registry backed by a `$state` Map.
 * Register/unregister triggers UI updates automatically.
 */
export class NodeTypeRegistry {
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	private map = $state<Map<string, NodeTypeDefinition>>(new Map());

	/** Register a node type definition. Replaces existing if same type. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	register(definition: NodeTypeDefinition<any>): void {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const next = new Map(this.map);
		next.set(definition.type, definition);
		this.map = next;
	}

	/** Unregister a node type. Returns true if it existed. */
	unregister(type: string): boolean {
		if (!this.map.has(type)) return false;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const next = new Map(this.map);
		next.delete(type);
		this.map = next;
		return true;
	}

	/** Get a definition by type key. */
	get(type: string): NodeTypeDefinition | undefined {
		return this.map.get(type);
	}

	/** Check if a type is registered. */
	has(type: string): boolean {
		return this.map.has(type);
	}

	/** List all registered definitions. */
	list(): NodeTypeDefinition[] {
		return Array.from(this.map.values());
	}
}
