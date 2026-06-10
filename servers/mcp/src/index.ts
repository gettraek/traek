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
 *   HTTP (PORT env)  — Streamable HTTP for hosted/Docker deployments.
 *                      Binds to 127.0.0.1 unless MCP_HOST is set.
 *                      Set MCP_ALLOWED_HOSTS (comma-separated) when exposing
 *                      the server beyond localhost.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { registerDocTools } from './tools/docs';
import { registerScaffoldTools } from './tools/scaffold';
import { registerResources } from './resources/docs';

function buildServer(): McpServer {
	const server = new McpServer({ name: 'traek-mcp', version: '0.1.0' });

	registerDocTools(server);
	registerScaffoldTools(server);
	registerResources(server);

	return server;
}

function sendJsonRpcError(
	res: ServerResponse,
	status: number,
	code: number,
	message: string
): void {
	if (res.headersSent) {
		res.end();
		return;
	}
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(
		JSON.stringify({
			jsonrpc: '2.0',
			error: { code, message },
			id: null
		})
	);
}

async function handleHttpRequest(
	req: IncomingMessage,
	res: ServerResponse,
	allowedHosts: string[] | undefined
): Promise<void> {
	let body: unknown;
	if (req.method === 'POST') {
		const chunks: Buffer[] = [];
		for await (const chunk of req) chunks.push(chunk as Buffer);
		const raw = Buffer.concat(chunks).toString();
		if (raw) {
			try {
				body = JSON.parse(raw);
			} catch {
				sendJsonRpcError(res, 400, -32700, 'Parse error: invalid JSON');
				return;
			}
		}
	}

	// Stateless mode: a fresh server + transport per request, torn down when
	// the response closes so we never leak handles.
	const server = buildServer();
	const transport = new StreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableDnsRebindingProtection: allowedHosts !== undefined,
		allowedHosts
	});

	res.on('close', () => {
		void transport.close();
		void server.close();
	});

	try {
		await server.connect(transport);
		await transport.handleRequest(req, res, body);
	} catch (err) {
		console.error('Error handling MCP request:', err);
		sendJsonRpcError(res, 500, -32603, 'Internal server error');
	}
}

async function main() {
	const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 0;

	if (port) {
		// HTTP mode: Streamable HTTP transport for hosted/Docker deployments.
		// Default to loopback; opt into wider exposure via MCP_HOST.
		const host = process.env.MCP_HOST ?? '127.0.0.1';
		const isLoopback = host === '127.0.0.1' || host === 'localhost';

		// DNS-rebinding protection: validate the Host header against an
		// allowlist. On loopback we know the valid values; for other binds the
		// operator must provide MCP_ALLOWED_HOSTS (otherwise protection is off,
		// e.g. behind a reverse proxy that already validates Host).
		const allowedHosts = process.env.MCP_ALLOWED_HOSTS
			? process.env.MCP_ALLOWED_HOSTS.split(',')
					.map((h) => h.trim())
					.filter(Boolean)
			: isLoopback
				? ['127.0.0.1', `127.0.0.1:${port}`, 'localhost', `localhost:${port}`]
				: undefined;

		const httpServer = createServer((req, res) => {
			void handleHttpRequest(req, res, allowedHosts);
		});

		httpServer.listen(port, host, () => {
			console.error(`Træk MCP server running on http://${host}:${port}`);
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
