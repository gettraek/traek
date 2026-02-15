export type { ActionDefinition } from './schemas.js';
export { actionDefinitionSchema } from './schemas.js';

/**
 * Callback for stage-2 (semantic) action resolution.
 * Receives the current user input and the full list of available actions.
 * Should return the IDs of actions that match the input.
 */
export type ResolveActions = (
	input: string,
	actions: import('./schemas.js').ActionDefinition[]
) => Promise<string[]>;
