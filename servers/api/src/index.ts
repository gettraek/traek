/**
 * Træk Cloud Persistence API — Cloudflare Worker
 *
 * Routes (all require `Authorization: Bearer <api-key>`):
 *
 *   POST   /conversations            — create
 *   GET    /conversations/count      — count
 *   GET    /conversations/search     — full-text search
 *   GET    /conversations/:id        — get single
 *   PATCH  /conversations/:id        — update
 *   DELETE /conversations/:id        — delete
 *   GET    /conversations            — list
 *
 * Admin (for key provisioning — internal use only):
 *   POST   /admin/keys               — create API key
 *   DELETE /admin/keys/:id           — revoke API key
 */

import type { Env } from './types.js';
import { authenticate, unauthorized } from './middleware/auth.js';
import {
	createConversation,
	getConversation,
	updateConversation,
	deleteConversation,
	listConversations,
	searchConversations,
	countConversations
} from './routes/conversations.js';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization,Content-Type'
};

function withCors(response: Response): Response {
	const res = new Response(response.body, response);
	for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
	return res;
}

// ── Admin handlers (key management) ─────────────────────────────────────────

async function adminCreateKey(request: Request, env: Env): Promise<Response> {
	// Require the admin secret passed as a separate header
	const adminSecret = request.headers.get('X-Admin-Secret');
	const expectedSecret = (env as Env & { ADMIN_SECRET?: string }).ADMIN_SECRET;
	if (!expectedSecret || adminSecret !== expectedSecret) {
		return Response.json({ error: 'Forbidden' }, { status: 403 });
	}

	let body: { workspaceId?: string; label?: string };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (!body.workspaceId) {
		return Response.json({ error: 'workspaceId is required' }, { status: 400 });
	}

	// Generate a cryptographically random key
	const rawKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	const salt = (env as Env & { API_KEY_SALT?: string }).API_KEY_SALT ?? '';
	const encoder = new TextEncoder();
	const data = encoder.encode(salt + rawKey);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const keyHash = Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	const id = crypto.randomUUID();
	await env.DB.prepare(
		`INSERT INTO api_keys (id, key_hash, workspace_id, label)
		 VALUES (?, ?, ?, ?)`
	)
		.bind(id, keyHash, body.workspaceId, body.label ?? '')
		.run();

	return Response.json(
		{ id, key: `trak_${rawKey}`, workspaceId: body.workspaceId },
		{ status: 201 }
	);
}

async function adminDeleteKey(request: Request, env: Env, keyId: string): Promise<Response> {
	const adminSecret = request.headers.get('X-Admin-Secret');
	const expectedSecret = (env as Env & { ADMIN_SECRET?: string }).ADMIN_SECRET;
	if (!expectedSecret || adminSecret !== expectedSecret) {
		return Response.json({ error: 'Forbidden' }, { status: 403 });
	}

	const result = await env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(keyId).run();
	if (result.meta.changes === 0) {
		return Response.json({ error: 'Not found' }, { status: 404 });
	}
	return new Response(null, { status: 204 });
}

// ── Router ───────────────────────────────────────────────────────────────────

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname.replace(/\/$/, '') || '/';
		const method = request.method.toUpperCase();

		// Preflight
		if (method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS });
		}

		// ── Admin routes ────────────────────────────────────────────────────
		if (path === '/admin/keys' && method === 'POST') {
			return withCors(await adminCreateKey(request, env));
		}
		const adminDeleteMatch = path.match(/^\/admin\/keys\/([^/]+)$/);
		if (adminDeleteMatch && method === 'DELETE') {
			return withCors(await adminDeleteKey(request, env, adminDeleteMatch[1]));
		}

		// ── Authenticated conversation routes ────────────────────────────────
		const auth = await authenticate(request, env);
		if (!auth) return withCors(unauthorized());

		// Static paths first (before /:id match)
		if (path === '/conversations' && method === 'POST') {
			return withCors(await createConversation(request, env, auth));
		}
		if (path === '/conversations' && method === 'GET') {
			return withCors(await listConversations(request, env, auth));
		}
		if (path === '/conversations/count' && method === 'GET') {
			return withCors(await countConversations(request, env, auth));
		}
		if (path === '/conversations/search' && method === 'GET') {
			return withCors(await searchConversations(request, env, auth));
		}

		// Dynamic /:id paths
		const idMatch = path.match(/^\/conversations\/([^/]+)$/);
		if (idMatch) {
			const id = decodeURIComponent(idMatch[1]);
			if (method === 'GET') return withCors(await getConversation(request, env, auth, id));
			if (method === 'PATCH') return withCors(await updateConversation(request, env, auth, id));
			if (method === 'DELETE') return withCors(await deleteConversation(request, env, auth, id));
		}

		return withCors(Response.json({ error: 'Not found' }, { status: 404 }));
	}
} satisfies ExportedHandler<Env>;
