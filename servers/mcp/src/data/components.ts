/**
 * Accurate API reference for every exported component and class in traek.
 * Derived from the actual source code in packages/sdk/src.
 */

export interface PropDoc {
	name: string;
	type: string;
	required: boolean;
	default?: string;
	description: string;
}

export interface MethodDoc {
	name: string;
	signature: string;
	description: string;
}

export interface ComponentDoc {
	name: string;
	importPath: string;
	description: string;
	props?: PropDoc[];
	methods?: MethodDoc[];
	stateProps?: PropDoc[];
	notes?: string[];
	example?: string;
}

export const componentDocs: Record<string, ComponentDoc> = {
	TraekCanvas: {
		name: 'TraekCanvas',
		importPath: 'traek',
		description:
			'Main exported component. Renders the interactive canvas with pan/zoom, message nodes, connection lines, and a streaming input bar. Can manage its own engine internally or accept an external one for full control.',
		props: [
			{
				name: 'engine',
				type: 'TraekEngine | null',
				required: false,
				default: 'internal (auto-created)',
				description:
					'External TraekEngine instance. Pass your own to have programmatic control (add nodes, react to state). If omitted, TraekCanvas creates and manages its own engine.'
			},
			{
				name: 'config',
				type: 'Partial<TraekEngineConfig>',
				required: false,
				description:
					'Override default engine config values (zoom speed, node dimensions, layout gaps, etc.). Only used when engine prop is omitted.'
			},
			{
				name: 'onSendMessage',
				type: '(input: string, userNode: MessageNode, action?: string | string[]) => void',
				required: false,
				description:
					'Callback fired when the user submits input. The user message node has already been added to the engine. Use engine.addNode() or engine.updateNode() to add and stream the assistant response.'
			},
			{
				name: 'componentMap',
				type: 'NodeComponentMap',
				required: false,
				default: '{}',
				description:
					"Map from node.type string to a Svelte component. Use to render custom node types. Keys are your custom type strings (e.g. 'image', 'code-result'). Values are Svelte components that accept TraekNodeComponentProps."
			},
			{
				name: 'actions',
				type: 'ActionDefinition[]',
				required: false,
				description:
					'Array of slash-command action definitions shown in the input dropdown. Each has id, label, icon, and optional description.'
			},
			{
				name: 'resolveActions',
				type: 'ResolveActions',
				required: false,
				description:
					'Async function called on the server to resolve actions from the /api/resolve-actions endpoint. Enables server-side action computation.'
			},
			{
				name: 'registry',
				type: 'NodeTypeRegistry',
				required: false,
				description:
					'Full node type registry for advanced node type customization including toolbar actions, context menus, and lifecycle hooks.'
			},
			{
				name: 'onRetry',
				type: '(nodeId: string) => void',
				required: false,
				description:
					'Callback fired when the user clicks the retry button on an error node. Receive the node ID and re-trigger your AI call.'
			},
			{
				name: 'onEditNode',
				type: '(nodeId: string) => void',
				required: false,
				description: 'Callback fired when the user edits an existing node.'
			},
			{
				name: 'onNodesChanged',
				type: '() => void',
				required: false,
				description: 'Fired after any mutation to engine.nodes. Useful for auto-saving.'
			},
			{
				name: 'onViewportChange',
				type: '(viewport: { scale: number; offset: { x: number; y: number } }) => void',
				required: false,
				description: 'Fired on every pan/zoom update with current viewport state.'
			},
			{
				name: 'mode',
				type: "'auto' | 'canvas' | 'focus'",
				required: false,
				default: "'auto'",
				description:
					"'auto' = canvas on desktop, focus mode on mobile. 'canvas' = always canvas. 'focus' = always linear focus mode."
			},
			{
				name: 'mobileBreakpoint',
				type: 'number',
				required: false,
				default: '768',
				description: 'Pixel width below which auto mode switches to focus/mobile mode.'
			},
			{
				name: 'focusConfig',
				type: 'Partial<FocusModeConfig>',
				required: false,
				description: 'Configuration for the mobile focus mode overlay.'
			},
			{
				name: 'initialScale',
				type: 'number',
				required: false,
				description: 'Initial zoom level. Default is 1.0.'
			},
			{
				name: 'initialOffset',
				type: '{ x: number; y: number }',
				required: false,
				description: 'Initial pan offset in pixels.'
			},
			{
				name: 'initialPlacementPadding',
				type: '{ left: number; top: number }',
				required: false,
				default: '{ left: 0, top: 0 }',
				description: 'Offset applied to root node placement on first render.'
			},
			{
				name: 'showFps',
				type: 'boolean',
				required: false,
				default: 'false',
				description: 'Show FPS counter in the corner (dev/debug).'
			},
			{
				name: 'showStats',
				type: 'boolean',
				required: false,
				default: 'true',
				description: 'Show node count and other stats in the UI.'
			},
			{
				name: 'initialOverlay',
				type: 'Snippet',
				required: false,
				description: 'Svelte snippet rendered as an overlay on first load (e.g. welcome screen).'
			},
			{
				name: 'inputActions',
				type: 'Snippet<[InputActionsContext]>',
				required: false,
				description: 'Custom Svelte snippet rendered alongside the input bar for custom actions.'
			},
			{
				name: 'defaultNodeActions',
				type: 'NodeTypeAction[]',
				required: false,
				description: 'Override the default toolbar actions shown on every node.'
			},
			{
				name: 'filterNodeActions',
				type: '(node: Node, actions: NodeTypeAction[]) => NodeTypeAction[]',
				required: false,
				description: 'Filter function to conditionally hide/show toolbar actions per node.'
			}
		],
		notes: [
			'TraekCanvas fills 100% width/height of its container. Wrap it in a positioned container.',
			'The engine prop is optional — omit it for self-contained usage, pass it for full control.',
			'onSendMessage receives the already-added userNode. No need to add it yourself.',
			"For streaming: add an assistant node with status: 'streaming', then update its content incrementally, then set status: 'done'."
		],
		example: `<script lang="ts">
  import { TraekEngine, TraekCanvas, type MessageNode } from 'traek'

  const engine = new TraekEngine()

  async function handleSend(input: string, userNode: MessageNode) {
    const assistantNode = engine.addNode('', 'assistant', {
      parentIds: [userNode.id],
      status: 'streaming'
    })

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let content = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      content += decoder.decode(value, { stream: true })
      engine.updateNode(assistantNode.id, { content, status: 'streaming' })
    }

    engine.updateNode(assistantNode.id, { status: 'done' })
  }
<\/script>

<div style="height: 100dvh">
  <TraekCanvas {engine} onSendMessage={handleSend} />
</div>`
	},

	TraekEngine: {
		name: 'TraekEngine',
		importPath: 'traek',
		description:
			'Core state management class. Manages the DAG conversation tree: nodes, parent-child relationships (multi-parent DAG), spatial layout (x/y in grid units), search, collapse/expand, tagging, serialization, and undo. Uses Svelte 5 $state runes — all reactive properties are live and update the UI automatically.',
		stateProps: [
			{
				name: 'nodes',
				type: 'Node[]',
				required: false,
				description:
					'Reactive array of all nodes. Mutating it (via engine methods) triggers re-renders.'
			},
			{
				name: 'activeNodeId',
				type: 'string | null',
				required: false,
				description:
					'ID of the currently focused/active node. New nodes added without explicit parentIds use this as their parent.'
			},
			{
				name: 'collapsedNodes',
				type: 'Set<string>',
				required: false,
				description:
					'Set of node IDs that are collapsed. Descendants of collapsed nodes are hidden.'
			},
			{
				name: 'searchQuery',
				type: 'string',
				required: false,
				description: 'Current search query string.'
			},
			{
				name: 'searchMatches',
				type: 'string[]',
				required: false,
				description: 'Array of node IDs matching the current search query.'
			},
			{
				name: 'currentSearchIndex',
				type: 'number',
				required: false,
				description: 'Index into searchMatches for the currently highlighted match.'
			},
			{
				name: 'pendingFocusNodeId',
				type: 'string | null',
				required: false,
				description: 'Set to a node ID to trigger canvas panning to center on that node.'
			},
			{
				name: 'contextPath',
				type: 'Node[] (derived)',
				required: false,
				description:
					'Reactive derived value: linear path from root to activeNode following primary parents.'
			}
		],
		methods: [
			{
				name: 'constructor',
				signature: 'new TraekEngine(config?: Partial<TraekEngineConfig>)',
				description: 'Create a new engine. All config values have defaults.'
			},
			{
				name: 'addNode',
				signature:
					'addNode(content: string, role: "user" | "assistant" | "system", options?: AddNodeOptions): MessageNode',
				description:
					"Add a text/message node. Options: type, parentIds, autofocus, x, y, data, deferLayout. If parentIds is omitted, uses [activeNodeId]. Returns the created node. Use status: 'streaming' then update incrementally."
			},
			{
				name: 'addCustomNode',
				signature: 'addCustomNode(component: Component, props?, role?, options?): CustomTraekNode',
				description:
					'Add a node with a custom Svelte component renderer. Used for non-text node types like images, code results, etc.'
			},
			{
				name: 'addNodes',
				signature: 'addNodes(payloads: AddNodePayload[]): MessageNode[]',
				description:
					'Bulk add nodes in one layout pass. Payloads may include explicit ids (for persistence round-trips). Topologically sorted automatically.'
			},
			{
				name: 'updateNode',
				signature: 'updateNode(nodeId: string, updates: Partial<MessageNode>): void',
				description: 'Update node properties. Use for streaming: update content and status.'
			},
			{
				name: 'deleteNode',
				signature: 'deleteNode(nodeId: string): void',
				description: 'Delete a single node. Does not delete descendants.'
			},
			{
				name: 'deleteNodeAndDescendants',
				signature: 'deleteNodeAndDescendants(nodeId: string): void',
				description: 'Delete a node and all its descendants via BFS. Stores undo buffer.'
			},
			{
				name: 'duplicateNode',
				signature: 'duplicateNode(nodeId: string): Node | null',
				description: 'Create a sibling copy of a node with the same content, role, and type.'
			},
			{
				name: 'restoreDeleted',
				signature: 'restoreDeleted(): boolean',
				description: 'Restore the last deleted node(s) within the 30s undo window.'
			},
			{
				name: 'getNode',
				signature: 'getNode(id: string): Node | undefined',
				description: 'O(1) node lookup by ID. Returns the reactive proxy.'
			},
			{
				name: 'getChildren',
				signature: 'getChildren(parentId: string | null): Node[]',
				description: 'Get direct children of a node. Pass null for root nodes.'
			},
			{
				name: 'getParent',
				signature: 'getParent(nodeId: string): Node | null',
				description: 'Get the primary parent (first in parentIds) of a node.'
			},
			{
				name: 'getSiblings',
				signature: 'getSiblings(nodeId: string): Node[]',
				description: 'Get all siblings (children of same primary parent). Excludes thought nodes.'
			},
			{
				name: 'getDescendants',
				signature: 'getDescendants(nodeId: string): Node[]',
				description: 'BFS traversal returning all descendant nodes. Excludes thought nodes.'
			},
			{
				name: 'getDepth',
				signature: 'getDepth(nodeId: string): number',
				description: 'Get depth of a node following primary parent chain. Root = 0.'
			},
			{
				name: 'focusOnNode',
				signature: 'focusOnNode(nodeId: string): void',
				description: 'Pan and center the canvas on a specific node.'
			},
			{
				name: 'branchFrom',
				signature: 'branchFrom(nodeId: string): void',
				description: 'Set activeNodeId to nodeId — next addNode() call will branch from this node.'
			},
			{
				name: 'toggleCollapse',
				signature: 'toggleCollapse(nodeId: string): void',
				description: 'Toggle the collapsed state of a node.'
			},
			{
				name: 'addConnection',
				signature: 'addConnection(parentId: string, childId: string): boolean',
				description:
					'Add a parent edge to a node (DAG multi-parent). Returns false if it would create a cycle.'
			},
			{
				name: 'removeConnection',
				signature: 'removeConnection(parentId: string, childId: string): boolean',
				description: 'Remove a parent edge from a node.'
			},
			{
				name: 'searchNodesMethod',
				signature: 'searchNodesMethod(query: string): void',
				description:
					'Search nodes by content (case-insensitive). Updates searchQuery, searchMatches, currentSearchIndex. Auto-expands collapsed subtrees with matches.'
			},
			{
				name: 'nextSearchMatch / previousSearchMatch',
				signature: 'nextSearchMatch(): void / previousSearchMatch(): void',
				description: 'Navigate between search matches, panning to each.'
			},
			{
				name: 'addTag / removeTag / getTags',
				signature:
					'addTag(nodeId, tag): void / removeTag(nodeId, tag): void / getTags(nodeId): string[]',
				description: 'Tag management on node metadata.'
			},
			{
				name: 'serialize',
				signature: 'serialize(title?: string): ConversationSnapshot',
				description:
					'Serialize full engine state to a JSON-safe snapshot. Custom component refs are stripped (only type string is kept).'
			},
			{
				name: 'TraekEngine.fromSnapshot',
				signature:
					'static fromSnapshot(snapshot: ConversationSnapshot, config?: Partial<TraekEngineConfig>): TraekEngine',
				description:
					'Static factory: create a new engine from a serialized snapshot. Validates with Zod.'
			},
			{
				name: 'flushLayoutFromRoot',
				signature: 'flushLayoutFromRoot(): void',
				description:
					'Re-run the full layout algorithm from all roots. Call after addNodes(..., { deferLayout: true }).'
			},
			{
				name: 'moveNodeAndDescendants',
				signature: 'moveNodeAndDescendants(nodeId: string, dx: number, dy: number): void',
				description: 'Move a node (and its descendants) by dx/dy pixels. Sets manualPosition flag.'
			}
		],
		notes: [
			'Nodes use parentIds: string[] (array) not a single parentId. First element is the primary parent for layout.',
			'Positions (metadata.x, metadata.y) are in grid units. gridStep defaults to 20px/unit.',
			"status: 'streaming' | 'done' | 'error' controls the loading indicator on nodes.",
			'onNodeCreated, onNodeDeleting, onNodeDeleted lifecycle callbacks are wired by TraekCanvas automatically when a registry is present.'
		]
	},

	TextNode: {
		name: 'TextNode',
		importPath: 'traek',
		description:
			'Default node renderer. Renders markdown (marked + DOMPurify), syntax-highlighted code blocks (highlight.js), and inline images. Used automatically for nodes of type "text". You can replace it via componentMap.',
		props: [
			{
				name: 'node',
				type: 'Node',
				required: true,
				description: 'The node to render. Accesses (node as MessageNode).content for markdown.'
			},
			{
				name: 'engine',
				type: 'TraekEngine',
				required: true,
				description: 'The engine instance (for actions like delete/duplicate).'
			},
			{
				name: 'isActive',
				type: 'boolean',
				required: true,
				description: 'Whether this node is the active/focused node.'
			}
		],
		notes: [
			'Every custom node component must accept exactly these three props (TraekNodeComponentProps).',
			'Register custom components via the componentMap prop on TraekCanvas.'
		]
	},

	ConversationStore: {
		name: 'ConversationStore',
		importPath: 'traek',
		description:
			'Persistence class. Auto-saves conversation snapshots to localStorage and manages a list of stored conversations. Wraps a TraekEngine and observes changes via onNodesChanged.',
		stateProps: [
			{
				name: 'conversations',
				type: 'ConversationListItem[]',
				required: false,
				description: 'Reactive list of all stored conversations.'
			},
			{
				name: 'currentId',
				type: 'string | null',
				required: false,
				description: 'ID of the currently loaded conversation.'
			},
			{
				name: 'saveState',
				type: "'idle' | 'saving' | 'saved' | 'error'",
				required: false,
				description: 'Reactive save status for UI indicators.'
			}
		],
		methods: [
			{
				name: 'constructor',
				signature: 'new ConversationStore(engine: TraekEngine)',
				description:
					'Creates a store bound to the given engine. Call init() to load from localStorage.'
			},
			{
				name: 'init',
				signature: 'init(): void',
				description: 'Load conversations from localStorage. Call once in an $effect or onMount.'
			},
			{
				name: 'newConversation',
				signature: 'newConversation(title?: string): string',
				description: 'Clear the engine and start a new conversation. Returns the new ID.'
			},
			{
				name: 'loadConversation',
				signature: 'loadConversation(id: string): void',
				description: 'Load a stored conversation into the engine.'
			},
			{
				name: 'deleteConversation',
				signature: 'deleteConversation(id: string): void',
				description: 'Delete a conversation from localStorage.'
			},
			{
				name: 'save',
				signature: 'save(title?: string): void',
				description: 'Manually trigger a save.'
			}
		],
		example: `<script lang="ts">
  import { TraekEngine, ConversationStore, TraekCanvas } from 'traek'

  const engine = new TraekEngine()
  const store = new ConversationStore(engine)

  $effect(() => { store.init() })
<\/script>

<TraekCanvas {engine} onNodesChanged={() => store.save()} onSendMessage={handleSend} />`
	},

	ReplayController: {
		name: 'ReplayController',
		importPath: 'traek',
		description:
			'Replay/scrub through conversation history. Replays a snapshot step-by-step, revealing nodes one at a time.',
		methods: [
			{
				name: 'constructor',
				signature: 'new ReplayController(engine: TraekEngine, snapshot: ConversationSnapshot)',
				description: 'Initialize replay from a snapshot.'
			},
			{
				name: 'play / pause / stop',
				signature: 'play(): void / pause(): void / stop(): void',
				description: 'Control replay playback.'
			},
			{
				name: 'seekTo',
				signature: 'seekTo(stepIndex: number): void',
				description: 'Jump to a specific step in the replay.'
			}
		]
	},

	NodeTypeRegistry: {
		name: 'NodeTypeRegistry',
		importPath: 'traek',
		description:
			'Advanced node type system. Register custom node type definitions with toolbar actions, context menu items, and lifecycle hooks. Pass the registry instance to TraekCanvas.',
		methods: [
			{
				name: 'register',
				signature: 'register(definition: NodeTypeDefinition): void',
				description: 'Register a new node type definition.'
			},
			{
				name: 'createDefaultRegistry',
				signature: 'createDefaultRegistry(): NodeTypeRegistry',
				description: 'Create a registry pre-populated with the default text and thought node types.'
			}
		],
		example: `<script lang="ts">
  import { createDefaultRegistry, TraekCanvas } from 'traek'
  import MyCustomNode from './MyCustomNode.svelte'

  const registry = createDefaultRegistry()
  registry.register({
    type: 'my-custom',
    component: MyCustomNode,
    actions: [
      { id: 'export', label: 'Export', icon: '⬇', handler: ({ node }) => exportNode(node) }
    ]
  })
<\/script>

<TraekCanvas {engine} {registry} />`
	},

	ThemeProvider: {
		name: 'ThemeProvider',
		importPath: 'traek',
		description:
			'Wraps your app to provide theme context. Applies CSS custom properties (--traek-*) to :root. Required for theming.',
		props: [
			{
				name: 'theme',
				type: 'ThemeName | TraekTheme',
				required: false,
				default: "'dark'",
				description:
					"Built-in theme name ('dark', 'light', 'highContrast') or a custom theme object."
			}
		],
		example: `<!-- +layout.svelte -->
<script lang="ts">
  import { ThemeProvider } from 'traek'
<\/script>

<ThemeProvider theme="dark">
  <slot />
</ThemeProvider>`
	}
};

export function getComponentDoc(name: string): ComponentDoc | null {
	const key = Object.keys(componentDocs).find((k) => k.toLowerCase() === name.toLowerCase());
	return key ? componentDocs[key] : null;
}

export function searchComponentDocs(query: string): Array<{ component: string; excerpt: string }> {
	const lower = query.toLowerCase();
	const results: Array<{ component: string; excerpt: string }> = [];

	for (const [name, doc] of Object.entries(componentDocs)) {
		const text = [
			doc.description,
			...(doc.props ?? []).map((p) => `${p.name}: ${p.description}`),
			...(doc.methods ?? []).map((m) => `${m.name}: ${m.description}`),
			...(doc.stateProps ?? []).map((p) => `${p.name}: ${p.description}`)
		].join(' ');

		if (text.toLowerCase().includes(lower)) {
			const idx = text.toLowerCase().indexOf(lower);
			const excerpt = text.slice(Math.max(0, idx - 50), idx + 100).trim();
			results.push({ component: name, excerpt: `...${excerpt}...` });
		}
	}

	return results;
}
