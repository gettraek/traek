export type NodeStatus = 'streaming' | 'done' | 'error';

export type NodeColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'cyan';

export interface CustomTag {
	slug: string; // unique identifier, e.g. 'my-tag'
	label: string; // display name
	color: string; // hex or CSS color, e.g. '#3b82f6'
}

export enum BasicNodeTypes {
	TEXT = 'text',
	CODE = 'code',
	THOUGHT = 'thought'
}

export interface Node {
	id: string;
	parentIds: string[];
	role: 'user' | 'assistant' | 'system';
	type: BasicNodeTypes | string;
	status?: NodeStatus;
	errorMessage?: string;
	createdAt?: number;
	metadata?: {
		x: number;
		y: number;
		height?: number;
		tags?: string[];
		color?: NodeColor | null;
		bookmarked?: boolean;
		bookmarkLabel?: string;
		outdated?: boolean;
		[key: string]: unknown;
	};
	data?: unknown;
}

export interface MessageNode extends Node {
	content: string;
}

/**
 * A node that renders a framework-specific component.
 * The `component` field holds the raw component reference —
 * in @traek/svelte it is typed as `Component<any>`, in @traek/react as
 * `React.ComponentType<any>`, etc.
 */
export type CustomTraekNode = Node & {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: unknown;
	props?: Record<string, unknown>;
};

/** Props every custom node component receives from the canvas. */
export type TraekNodeComponentProps = {
	node: Node;
	engine: unknown; // typed as the framework-specific engine in each wrapper
	isActive: boolean;
};

/** Payload for bulk add; id optional (for saved projects). */
export interface AddNodePayload {
	id?: string;
	parentIds: string[];
	content: string;
	role: 'user' | 'assistant' | 'system';
	type?: MessageNode['type'];
	status?: NodeStatus;
	errorMessage?: string;
	createdAt?: number;
	metadata?: Partial<NonNullable<MessageNode['metadata']>>;
	data?: unknown;
}

export interface TraekEngineConfig {
	focusDurationMs: number;
	zoomSpeed: number;
	zoomLineModeBoost: number;
	scaleMin: number;
	scaleMax: number;
	nodeWidth: number;
	nodeHeightDefault: number;
	streamIntervalMs: number;
	rootNodeOffsetX: number;
	rootNodeOffsetY: number;
	layoutGapX: number;
	layoutGapY: number;
	heightChangeThreshold: number;
	/** Pixels per grid unit; positions (metadata.x, metadata.y) are in grid units. */
	gridStep: number;
}

export const DEFAULT_TRACK_ENGINE_CONFIG: TraekEngineConfig = {
	focusDurationMs: 280,
	zoomSpeed: 0.004,
	zoomLineModeBoost: 20,
	scaleMin: 0.05,
	scaleMax: 8,
	nodeWidth: 350,
	nodeHeightDefault: 100,
	streamIntervalMs: 30,
	rootNodeOffsetX: -175,
	rootNodeOffsetY: -50,
	layoutGapX: 35,
	layoutGapY: 50,
	heightChangeThreshold: 5,
	gridStep: 20
};
