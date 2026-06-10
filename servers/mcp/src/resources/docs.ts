import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getComponentDoc, componentDocs } from '../data/components';
import { getGuide, listGuides } from '../data/guides';
import { getSnippet, listSnippets } from '../data/snippets';

// The MCP spec recommends -32002 for "resource not found", but SDK 1.26 does not
// expose such a code (its ErrorCode enum only covers the JSON-RPC codes plus
// ConnectionClosed/RequestTimeout/UrlElicitationRequired), so we fall back to
// InvalidParams (-32602). Swap this constant once the SDK ships a dedicated code.
const RESOURCE_NOT_FOUND = ErrorCode.InvalidParams;

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

export function registerResources(server: McpServer): void {
	server.registerResource(
		'traek-component-docs',
		new ResourceTemplate('traek://component/{name}', { list: undefined }),
		{
			title: 'Træk component API reference',
			description: 'API reference for a traek component or class',
			mimeType: 'text/markdown'
		},
		async (uri, variables) => {
			const name = String(variables.name);
			const allNames = Object.keys(componentDocs);
			const matched = allNames.find((k) => k.toLowerCase() === name.toLowerCase());
			if (!matched) {
				throw new McpError(
					RESOURCE_NOT_FOUND,
					`Resource not found: no component docs for "${name}". Available: ${allNames.join(', ')}`
				);
			}

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'text/markdown',
						text: formatComponentAsMarkdown(matched)
					}
				]
			};
		}
	);

	server.registerResource(
		'traek-guide',
		new ResourceTemplate('traek://guide/{name}', { list: undefined }),
		{
			title: 'Træk integration guide',
			description: 'Full text of a traek integration guide',
			mimeType: 'text/markdown'
		},
		async (uri, variables) => {
			const name = String(variables.name);
			const guide = getGuide(name);
			if (!guide) {
				const available = listGuides()
					.map((g) => g.id)
					.join(', ');
				throw new McpError(
					RESOURCE_NOT_FOUND,
					`Resource not found: no guide named "${name}". Available: ${available}`
				);
			}

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'text/markdown',
						text: guide.content
					}
				]
			};
		}
	);

	server.registerResource(
		'traek-snippet',
		new ResourceTemplate('traek://snippet/{name}', { list: undefined }),
		{
			title: 'Træk code snippet',
			description: 'Runnable code snippet for a traek integration scenario',
			mimeType: 'text/markdown'
		},
		async (uri, variables) => {
			const name = String(variables.name);
			const snippet = getSnippet(name);
			if (!snippet) {
				const available = listSnippets()
					.map((s) => s.id)
					.join(', ');
				throw new McpError(
					RESOURCE_NOT_FOUND,
					`Resource not found: no snippet named "${name}". Available: ${available}`
				);
			}

			return {
				contents: [
					{
						uri: uri.toString(),
						mimeType: 'text/markdown',
						text: `# ${snippet.title}\n\n${snippet.description}\n\n\`\`\`${snippet.language}\n${snippet.code}\n\`\`\``
					}
				]
			};
		}
	);
}
