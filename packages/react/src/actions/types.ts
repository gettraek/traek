export interface ActionDefinition {
	id: string;
	label: string;
	description: string;
	icon?: string;
	keywords?: string[];
	slashCommand?: string;
}

/**
 * Callback for stage-2 (semantic) action resolution.
 * Receives the current user input and the full list of available actions.
 * Should return the IDs of actions that match the input.
 */
export type ResolveActions = (input: string, actions: ActionDefinition[]) => Promise<string[]>;
