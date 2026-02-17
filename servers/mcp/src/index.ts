#!/usr/bin/env node
/**
 * Træk MCP Server — Developer Integration Assistant
 *
 * Helps developers integrate @traek/sdk into their SvelteKit projects.
 * Designed for use with Claude Code and other MCP-compatible AI assistants.
 *
 * Tools:
 *   get_component_api   — Full prop/method API for TraekCanvas, TraekEngine, etc.
 *   list_exports        — All @traek/sdk exports grouped by category
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
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { docTools } from './tools/docs.js'
import { scaffoldTools } from './tools/scaffold.js'
import { resourceHandlers } from './resources/docs.js'

const server = new McpServer({
	name: 'traek-mcp',
	version: '0.1.0',
})

// Register documentation and search tools
for (const tool of docTools) {
	server.tool(tool.name, tool.description, tool.inputSchema, tool.handler)
}

// Register scaffolding tools
for (const tool of scaffoldTools) {
	server.tool(tool.name, tool.description, tool.inputSchema, tool.handler)
}

// Register URI-addressable resources
for (const resource of resourceHandlers) {
	server.resource(resource.name, resource.uri, resource.handler)
}

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('Træk MCP developer assistant running on stdio')
}

main().catch((err) => {
	console.error('Fatal error:', err)
	process.exit(1)
})
