import { z } from 'zod/v3';
import { componentDocs, getComponentDoc, searchComponentDocs } from '../data/components';
import { getGuide, listGuides, searchGuides } from '../data/guides';
import { listSnippets } from '../data/snippets';

function formatPropTable(props: NonNullable<ReturnType<typeof getComponentDoc>>['props']): string {
	if (!props || props.length === 0) return '';
	return props
		.map(
			(p) =>
				`**${p.name}** \`${p.type}\`${p.required ? ' *(required)*' : ''}\n  ${p.description}${p.default ? `\n  Default: \`${p.default}\`` : ''}`
		)
		.join('\n\n');
}

function formatMethodList(
	methods: NonNullable<ReturnType<typeof getComponentDoc>>['methods']
): string {
	if (!methods || methods.length === 0) return '';
	return methods
		.map((m) => `**\`${m.name}\`** — \`${m.signature}\`\n  ${m.description}`)
		.join('\n\n');
}

function formatComponentDoc(doc: ReturnType<typeof getComponentDoc>): string {
	if (!doc) return '';
	const parts: string[] = [];

	parts.push(`# ${doc.name}\n\nimport { ${doc.name} } from '${doc.importPath}'\n`);
	parts.push(doc.description);

	if (doc.props && doc.props.length > 0) {
		parts.push(`\n## Props\n\n${formatPropTable(doc.props)}`);
	}
	if (doc.stateProps && doc.stateProps.length > 0) {
		parts.push(`\n## Reactive State\n\n${formatPropTable(doc.stateProps)}`);
	}
	if (doc.methods && doc.methods.length > 0) {
		parts.push(`\n## Methods\n\n${formatMethodList(doc.methods)}`);
	}
	if (doc.notes && doc.notes.length > 0) {
		parts.push(`\n## Notes\n\n${doc.notes.map((n) => `- ${n}`).join('\n')}`);
	}
	if (doc.example) {
		parts.push(`\n## Example\n\n\`\`\`svelte\n${doc.example}\n\`\`\``);
	}

	return parts.join('\n');
}

export const docTools = [
	{
		name: 'get_component_api',
		description:
			'Get the full API reference for a specific traek export. Returns props, state, methods, notes, and a usage example. Use this before integrating any Træk component.',
		inputSchema: {
			component: z
				.string()
				.describe(
					'Name of the component or class. One of: TraekCanvas, TraekEngine, TextNode, ConversationStore, ReplayController, NodeTypeRegistry, ThemeProvider'
				)
		},
		handler: async ({ component }: { component: string }) => {
			const doc = getComponentDoc(component);
			if (!doc) {
				const available = Object.keys(componentDocs).join(', ');
				return {
					content: [
						{
							type: 'text' as const,
							text: `No docs found for "${component}". Available: ${available}`
						}
					],
					isError: true
				};
			}
			return {
				content: [{ type: 'text' as const, text: formatComponentDoc(doc) }]
			};
		}
	},

	{
		name: 'list_exports',
		description:
			'List all exported symbols from traek grouped by category. Use this to discover what is available before deciding what to import.',
		inputSchema: {},
		handler: async () => {
			const text = `# traek Exports

## Core Components
- \`TraekCanvas\` — Main interactive canvas component
- \`TextNode\` — Default markdown message renderer
- \`DefaultLoadingOverlay\` — Default loading screen

## Engine & State
- \`TraekEngine\` — Core state management class
- \`DEFAULT_TRACK_ENGINE_CONFIG\` — Default engine config values
- \`wouldCreateCycle(nodes, parentId, childId)\` — DAG cycle detection utility

## Actions (Slash Commands)
- \`ActionBadges\` — Displays action badges on nodes
- \`SlashCommandDropdown\` — Input dropdown for slash commands
- \`ActionResolver\` — Server-side action resolution class
- Types: \`ActionDefinition\`, \`ResolveActions\`

## Node Type System
- \`NodeTypeRegistry\` — Register custom node types with toolbar actions
- \`createDefaultRegistry()\` — Create registry with built-in text + thought types
- \`textNodeDefinition\`, \`thoughtNodeDefinition\` — Built-in type definitions
- Types: \`NodeTypeDefinition\`, \`NodeTypeAction\`, \`ActionVariant\`

## Default Node Actions
- \`duplicateAction\`, \`deleteAction\`, \`createRetryAction\`, \`createEditAction\`
- \`createDefaultNodeActions(callbacks)\`

## Persistence
- \`ConversationStore\` — localStorage persistence, conversation list management
- \`ReplayController\` — Step-through replay of conversation history
- \`ReplayControls\` — UI for replay playback
- \`SaveIndicator\` — "Saved / Saving..." status badge
- \`ChatList\` — Sidebar list of stored conversations
- \`snapshotToJSON(snapshot)\` — Export snapshot as JSON string
- \`snapshotToMarkdown(snapshot)\` — Export snapshot as Markdown
- \`downloadFile(content, filename, mimeType)\` — Trigger browser download
- Types: \`ConversationSnapshot\`, \`SerializedNode\`, \`StoredConversation\`, \`ConversationListItem\`, \`SaveState\`

## Conversation UI
- \`HeaderBar\` — Top bar for conversation title and controls

## Tag System
- \`TagBadges\`, \`TagDropdown\`, \`TagFilter\`
- \`PREDEFINED_TAGS\`, \`getNodeTags(node)\`, \`getTagConfig(tag)\`, \`matchesTagFilter(node, filter)\`

## Toast Notifications
- \`ToastContainer\`, \`ToastComponent\`
- \`toastStore\`, \`toast(message, type)\`, \`toastUndo(message, onUndo)\`

## Mobile / Focus Mode
- \`FocusMode\` — Linear focus mode for mobile
- \`PositionIndicator\`, \`SwipeAffordances\`, \`OnboardingOverlay\`
- \`HomeButton\`, \`KeyboardCheatsheet\`, \`Breadcrumbs\`, \`ChildSelector\`
- \`focusModeConfigSchema\`, \`DEFAULT_FOCUS_MODE_CONFIG\`
- Types: \`FocusModeConfig\`, \`SwipeDirection\`

## Onboarding
- \`DesktopTour\`, \`TourStep\`

## Theme System
- \`ThemeProvider\` — Root theme context provider
- \`ThemePicker\` — UI for switching themes
- \`useTheme()\`, \`applyThemeToRoot(theme)\`
- \`darkTheme\`, \`lightTheme\`, \`highContrastTheme\`, \`themes\`
- \`DEFAULT_THEME\`, \`createCustomTheme(base)\`
- Type: \`ThemeName\`, \`ThemeContext\`
- Zod schemas: \`TraekThemeSchema\`, \`TraekThemeColorsSchema\`, etc.

## Zod Validation Schemas
- \`serializedNodeSchema\`, \`conversationSnapshotSchema\`
- \`traekEngineConfigSchema\`, \`addNodePayloadSchema\`
- \`actionDefinitionSchema\`, \`nodeTypeActionSchema\`, \`nodeTypeDefinitionSchema\`

## Subpath Export
- \`traek/server\` — Server-only utilities (rate limiter, etc.)

## Key Types
- \`Node\` — Base node interface (id, parentIds, role, type, status, metadata)
- \`MessageNode extends Node\` — Node with content: string
- \`TraekNodeComponentProps\` — Props every custom node component receives
- \`NodeComponentMap\` — Map from type string to Svelte component
- \`TraekEngineConfig\` — Engine configuration
- \`AddNodePayload\` — Payload for bulk addNodes()`;

			return { content: [{ type: 'text' as const, text }] };
		}
	},

	{
		name: 'list_guides',
		description:
			'List all available integration guides. Returns guide IDs you can pass to get_guide.',
		inputSchema: {},
		handler: async () => {
			const guides = listGuides();
			const text = guides.map((g) => `**${g.id}** — ${g.title}\n  ${g.description}`).join('\n\n');
			return {
				content: [{ type: 'text' as const, text: `# Available Guides\n\n${text}` }]
			};
		}
	},

	{
		name: 'get_guide',
		description:
			'Get the full text of an integration guide. Guides cover: getting-started, openai-streaming, custom-nodes, persistence, theming, sveltekit-setup.',
		inputSchema: {
			guide: z
				.string()
				.describe(
					'Guide ID. One of: getting-started, openai-streaming, custom-nodes, persistence, theming, sveltekit-setup'
				)
		},
		handler: async ({ guide }: { guide: string }) => {
			const doc = getGuide(guide);
			if (!doc) {
				const available = listGuides()
					.map((g) => g.id)
					.join(', ');
				return {
					content: [
						{
							type: 'text' as const,
							text: `No guide found for "${guide}". Available: ${available}`
						}
					],
					isError: true
				};
			}
			return { content: [{ type: 'text' as const, text: doc.content }] };
		}
	},

	{
		name: 'search_docs',
		description:
			'Full-text search across all Træk documentation: component APIs, guides, and snippet descriptions. Use this when you need to find something but are not sure which component or guide covers it.',
		inputSchema: {
			query: z.string().describe('Search query — a term, concept, or feature name')
		},
		handler: async ({ query }: { query: string }) => {
			const componentResults = searchComponentDocs(query);
			const guideResults = searchGuides(query);

			const parts: string[] = [`# Search results for "${query}"\n`];

			if (componentResults.length > 0) {
				parts.push('## Component API matches\n');
				parts.push(componentResults.map((r) => `**${r.component}**: ${r.excerpt}`).join('\n\n'));
			}

			if (guideResults.length > 0) {
				parts.push('\n## Guide matches\n');
				parts.push(guideResults.map((r) => `**Guide: ${r.guide}**: ${r.excerpt}`).join('\n\n'));
			}

			if (componentResults.length === 0 && guideResults.length === 0) {
				parts.push('No results found. Try: streaming, engine, node, persistence, theme, canvas');
			}

			return { content: [{ type: 'text' as const, text: parts.join('\n') }] };
		}
	},

	{
		name: 'list_snippets',
		description:
			'List all available code snippets. Returns snippet IDs you can pass to get_snippet.',
		inputSchema: {},
		handler: async () => {
			const items = listSnippets();
			const text = items.map((s) => `**${s.id}** — ${s.title}\n  ${s.description}`).join('\n\n');
			return {
				content: [{ type: 'text' as const, text: `# Available Code Snippets\n\n${text}` }]
			};
		}
	}
];
