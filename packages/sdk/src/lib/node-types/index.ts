export { NodeTypeRegistry } from './NodeTypeRegistry.svelte';
export { textNodeDefinition, thoughtNodeDefinition } from './builtins';
export type { NodeTypeDefinition, NodeTypeAction } from './types';

import { NodeTypeRegistry } from './NodeTypeRegistry.svelte';
import { textNodeDefinition, thoughtNodeDefinition } from './builtins';

/** Create a registry pre-loaded with built-in text and thought definitions. */
export function createDefaultRegistry(): NodeTypeRegistry {
	const registry = new NodeTypeRegistry();
	registry.register(textNodeDefinition);
	registry.register(thoughtNodeDefinition);
	return registry;
}
