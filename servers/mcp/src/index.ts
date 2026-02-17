#!/usr/bin/env node
/**
 * Træk MCP Server — Developer Integration Assistant
 *
 * Helps developers integrate traek into their SvelteKit projects.
 * Designed for use with Claude Code and other MCP-compatible AI assistants.
 *
 * Tools:
 *   get_component_api   — Full prop/method API for TraekCanvas, TraekEngine, etc.
 *   list_exports        — All traek exports grouped by category
 *   list_guides         — Available integration guides
 *   get_guide           — Full text of an integration guide
 *   search_docs         — Full-text search across all docs
 *   list_snippets       — Available code snippets
 *   get_snippet         — Runnable code snippet for a scenario
 *   scaffold_page       — Generate a complete SvelteKit page + API route
 *
 * Resources (URI-addressable):
 *   traek://component/{name}  — Component API reference
 *   traek://guide/{name}      — Integration guide
 *   traek://snippet/{name}    — Code snippet
 *
 * Transports:
 *   stdio (default)  — for Claude Desktop, Claude Code, etc.
 *   HTTP (PORT env)  — Streamable HTTP for hosted/Docker deployments
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from 'node:http';
import { docTools } from './tools/docs';
import { scaffoldTools } from './tools/scaffold';
import { resourceHandlers } from './resources/docs';

function buildServer(): McpServer {
	const server = new McpServer({ name: 'traek-mcp', version: '0.1.0' });

	for (const tool of docTools) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		server.tool(tool.name, tool.description, tool.inputSchema as any, tool.handler as any);
	}

	for (const tool of scaffoldTools) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		server.tool(tool.name, tool.description, tool.inputSchema as any, tool.handler as any);
	}

	for (const resource of resourceHandlers) {
		server.resource(resource.name, resource.uri, resource.handler);
	}

	return server;
}

async function main() {
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;

	if (port) {
		// HTTP mode: Streamable HTTP transport for hosted/Docker deployments
		const httpServer = createServer(async (req, res) => {
			let body: unknown;
			if (req.method === 'POST') {
				const chunks: Buffer[] = [];
				for await (const chunk of req) chunks.push(chunk);
				const raw = Buffer.concat(chunks).toString();
				if (raw) {
					try {
						body = JSON.parse(raw);
					} catch {}
				}
			}

			const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
			await buildServer().connect(transport);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await transport.handleRequest(req as any, res as any, body);
		});

		httpServer.listen(port, '0.0.0.0', () => {
			console.error(`Træk MCP server running on HTTP port ${port}`);
		});
	} else {
		// Stdio mode (default): for Claude Desktop, Claude Code, etc.
		const transport = new StdioServerTransport();
		await buildServer().connect(transport);
		console.error('Træk MCP developer assistant running on stdio');
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
