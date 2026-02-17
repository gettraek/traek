import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getComponentDoc, componentDocs } from '../data/components';
import { getGuide } from '../data/guides';
import { getSnippet } from '../data/snippets';

function formatComponentAsMarkdown(name: string): string {
	const doc = getComponentDoc(name);
	if (!doc) return `No documentation found for "${name}".`;

	const lines: string[] = [
		`# ${doc.name}`,
		``,
		`**Import:** \`import { ${doc.name} } from '${doc.importPath}'\``,
		``,
		doc.description
	];

	if (doc.props && doc.props.length > 0) {
		lines.push(``, `## Props`, ``);
		for (const p of doc.props) {
			lines.push(
				`### \`${p.name}\``,
				`- **Type:** \`${p.type}\``,
				`- **Required:** ${p.required ? 'Yes' : 'No'}`,
				...(p.default ? [`- **Default:** \`${p.default}\``] : []),
				``,
				p.description,
				``
			);
		}
	}

	if (doc.stateProps && doc.stateProps.length > 0) {
		lines.push(`## Reactive State`, ``);
		for (const p of doc.stateProps) {
			lines.push(`### \`${p.name}: ${p.type}\``, ``, p.description, ``);
		}
	}

	if (doc.methods && doc.methods.length > 0) {
		lines.push(`## Methods`, ``);
		for (const m of doc.methods) {
			lines.push(
				`### \`${m.name}\``,
				`\`\`\`typescript`,
				m.signature,
				`\`\`\``,
				``,
				m.description,
				``
			);
		}
	}

	if (doc.notes && doc.notes.length > 0) {
		lines.push(`## Important Notes`, ``);
		for (const n of doc.notes) {
			lines.push(`- ${n}`);
		}
		lines.push(``);
	}

	if (doc.example) {
		lines.push(`## Example`, ``, `\`\`\`svelte`, doc.example, `\`\`\``, ``);
	}

	return lines.join('\n');
}

export const resourceHandlers = [
	{
		name: 'traek-component-docs',
		uri: new ResourceTemplate('traek://component/{name}', { list: undefined }),
		handler: async (uri: URL, variables: Record<string, string | string[]>) => {
			const name = String(variables.name);
			const allNames = Object.keys(componentDocs);
			const matched = allNames.find((k) => k.toLowerCase() === name.toLowerCase()) ?? name;
			const content = formatComponentAsMarkdown(matched);

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'text/markdown',
						text: content
					}
				]
			};
		}
	},

	{
		name: 'traek-guide',
		uri: new ResourceTemplate('traek://guide/{name}', { list: undefined }),
		handler: async (uri: URL, variables: Record<string, string | string[]>) => {
			const name = String(variables.name);
			const guide = getGuide(name);
			const text = guide
				? guide.content
				: `Guide "${name}" not found. Available: getting-started, openai-streaming, custom-nodes, persistence, theming, sveltekit-setup`;

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'text/markdown',
						text
					}
				]
			};
		}
	},

	{
		name: 'traek-snippet',
		uri: new ResourceTemplate('traek://snippet/{name}', { list: undefined }),
		handler: async (uri: URL, variables: Record<string, string | string[]>) => {
			const name = String(variables.name);
			const snippet = getSnippet(name);
			const text = snippet
				? `# ${snippet.title}\n\n${snippet.description}\n\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``
				: `Snippet "${name}" not found. Run list_snippets to see all available IDs.`;

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'text/markdown',
						text
					}
				]
			};
		}
	}
];
