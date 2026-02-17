import type { Node, TraekEngine } from '../TraekEngine.svelte';

/** A variant option shown when an action supports multiple behaviors. */
export interface ActionVariant {
	label: string;
	handler: (node: Node, engine: TraekEngine) => void;
}

/** Action shown in the floating toolbar for a node type. */
export interface NodeTypeAction {
	id: string;
	label: string;
	icon?: string;
	handler: (node: Node, engine: TraekEngine) => void;
	/** When defined and returns non-null, clicking shows variant options instead of running handler directly. */
	variants?: (node: Node, engine: TraekEngine) => ActionVariant[] | null;
}

/** Full definition for a registered node type. */
export interface NodeTypeDefinition<TData = unknown> {
	/** Unique type key (matches node.type). */
	type: string;
	/** Human-readable label for UI. */
	label: string;
	/**
	 * Svelte component to render nodes of this type.
	 * Omit for special types like 'thought' that render
	 * inline inside TraekNodeWrapper.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component?: any;
	/** Optional icon (emoji or short string). */
	icon?: string;
	/**
	 * When true, the component manages its own TraekNodeWrapper
	 * (e.g. TextNode). When false (default), the canvas wraps it.
	 */
	selfWrapping?: boolean;
	/** Default size hints for layout. */
	defaultSize?: { width?: number; minHeight?: number };
	/** Validate the node's data payload. */
	validateData?: (data: unknown) => data is TData;
	/** Serialize node.data for persistence (strip non-serializable parts). */
	serializeData?: (data: TData) => unknown;
	/** Deserialize persisted data back to TData. */
	deserializeData?: (raw: unknown) => TData;
	/** Toolbar actions for this node type. */
	actions?: NodeTypeAction[];
	/** Called after the node is added to the engine. */
	onCreate?: (node: Node, engine: TraekEngine) => void;
	/** Called before the node is removed from the engine. */
	onDestroy?: (node: Node, engine: TraekEngine) => void;
}
