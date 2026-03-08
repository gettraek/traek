import type { Env, AuthContext, ConvRow, ConvListRow } from '../types.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToFull(row: ConvRow) {
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		title: row.title,
		snapshot: JSON.parse(row.snapshot) as unknown,
		tags: JSON.parse(row.tags) as string[],
		meta: JSON.parse(row.meta) as Record<string, unknown>,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function rowToListItem(row: ConvListRow) {
	return {
		id: row.id,
		workspaceId: row.workspace_id,
		title: row.title,
		tags: JSON.parse(row.tags) as string[],
		meta: JSON.parse(row.meta) as Record<string, unknown>,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function randomId(): string {
	return crypto.randomUUID();
}

function nowIso(): string {
	return new Date().toISOString();
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /conversations
 * Body: { title, snapshot, tags?, meta? }
 */
export async function createConversation(
	request: Request,
	env: Env,
	auth: AuthContext
): Promise<Response> {
	let body: { title?: string; snapshot?: unknown; tags?: string[]; meta?: Record<string, unknown> };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	if (!body.snapshot) {
		return Response.json({ error: 'snapshot is required' }, { status: 400 });
	}

	const id = randomId();
	const now = nowIso();
	const tags = JSON.stringify(body.tags ?? []);
	const meta = JSON.stringify(body.meta ?? {});
	const snapshot = JSON.stringify(body.snapshot);
	const title = body.title ?? '';

	await env.DB.prepare(
		`INSERT INTO conversations (id, workspace_id, title, snapshot, tags, meta, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	)
		.bind(id, auth.workspaceId, title, snapshot, tags, meta, now, now)
		.run();

	const row = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
		.bind(id)
		.first<ConvRow>();

	return Response.json(rowToFull(row!), { status: 201 });
}

/**
 * GET /conversations/:id
 */
export async function getConversation(
	_request: Request,
	env: Env,
	auth: AuthContext,
	id: string
): Promise<Response> {
	const row = await env.DB.prepare('SELECT * FROM conversations WHERE id = ? AND workspace_id = ?')
		.bind(id, auth.workspaceId)
		.first<ConvRow>();

	if (!row) return Response.json({ error: 'Not found' }, { status: 404 });
	return Response.json(rowToFull(row));
}

/**
 * PATCH /conversations/:id
 * Body: { title?, snapshot?, tags?, meta? }
 */
export async function updateConversation(
	request: Request,
	env: Env,
	auth: AuthContext,
	id: string
): Promise<Response> {
	const existing = await env.DB.prepare(
		'SELECT * FROM conversations WHERE id = ? AND workspace_id = ?'
	)
		.bind(id, auth.workspaceId)
		.first<ConvRow>();

	if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

	let body: { title?: string; snapshot?: unknown; tags?: string[]; meta?: Record<string, unknown> };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const title = body.title !== undefined ? body.title : existing.title;
	const snapshot = body.snapshot !== undefined ? JSON.stringify(body.snapshot) : existing.snapshot;
	const tags = body.tags !== undefined ? JSON.stringify(body.tags) : existing.tags;
	const meta = body.meta !== undefined ? JSON.stringify(body.meta) : existing.meta;
	const updatedAt = nowIso();

	await env.DB.prepare(
		`UPDATE conversations
		 SET title = ?, snapshot = ?, tags = ?, meta = ?, updated_at = ?
		 WHERE id = ? AND workspace_id = ?`
	)
		.bind(title, snapshot, tags, meta, updatedAt, id, auth.workspaceId)
		.run();

	const row = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?')
		.bind(id)
		.first<ConvRow>();

	return Response.json(rowToFull(row!));
}

/**
 * DELETE /conversations/:id
 */
export async function deleteConversation(
	_request: Request,
	env: Env,
	auth: AuthContext,
	id: string
): Promise<Response> {
	const result = await env.DB.prepare('DELETE FROM conversations WHERE id = ? AND workspace_id = ?')
		.bind(id, auth.workspaceId)
		.run();

	if (result.meta.changes === 0) {
		return Response.json({ error: 'Not found' }, { status: 404 });
	}
	return new Response(null, { status: 204 });
}

/**
 * GET /conversations?limit&offset&sortBy&order&tag
 */
export async function listConversations(
	request: Request,
	env: Env,
	auth: AuthContext
): Promise<Response> {
	const url = new URL(request.url);
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);
	const sortBy = url.searchParams.get('sortBy') ?? 'updated_at';
	const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';
	const tag = url.searchParams.get('tag');

	// Map client field names to column names
	const sortCol =
		sortBy === 'createdAt' ? 'created_at' : sortBy === 'title' ? 'title' : 'updated_at';

	let query: string;
	let bindings: unknown[];

	if (tag) {
		// Filter by tag using JSON_EACH — supported in D1 (SQLite 3.38+)
		query = `
			SELECT id, workspace_id, title, tags, meta, created_at, updated_at
			FROM conversations
			WHERE workspace_id = ?
			  AND EXISTS (
			    SELECT 1 FROM json_each(tags) WHERE value = ?
			  )
			ORDER BY ${sortCol} ${order}
			LIMIT ? OFFSET ?`;
		bindings = [auth.workspaceId, tag, limit, offset];
	} else {
		query = `
			SELECT id, workspace_id, title, tags, meta, created_at, updated_at
			FROM conversations
			WHERE workspace_id = ?
			ORDER BY ${sortCol} ${order}
			LIMIT ? OFFSET ?`;
		bindings = [auth.workspaceId, limit, offset];
	}

	const { results } = await env.DB.prepare(query)
		.bind(...bindings)
		.all<ConvListRow>();

	return Response.json({ data: (results ?? []).map(rowToListItem) });
}

/**
 * GET /conversations/search?q&limit&offset
 */
export async function searchConversations(
	request: Request,
	env: Env,
	auth: AuthContext
): Promise<Response> {
	const url = new URL(request.url);
	const q = url.searchParams.get('q') ?? '';
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0', 10);

	if (!q.trim()) {
		return Response.json({ data: [] });
	}

	// FTS5 MATCH; wrap user query in quotes to prevent injection via FTS syntax
	const safeQ = q.replace(/"/g, '');

	const { results } = await env.DB.prepare(
		`SELECT c.id, c.workspace_id, c.title, c.tags, c.meta, c.created_at, c.updated_at
		 FROM conversations c
		 JOIN conversations_fts fts ON fts.id = c.id
		 WHERE fts MATCH ? AND c.workspace_id = ?
		 ORDER BY rank
		 LIMIT ? OFFSET ?`
	)
		.bind(`"${safeQ}"`, auth.workspaceId, limit, offset)
		.all<ConvListRow>();

	return Response.json({ data: (results ?? []).map(rowToListItem) });
}

/**
 * GET /conversations/count
 */
export async function countConversations(
	_request: Request,
	env: Env,
	auth: AuthContext
): Promise<Response> {
	const row = await env.DB.prepare(
		'SELECT COUNT(*) as count FROM conversations WHERE workspace_id = ?'
	)
		.bind(auth.workspaceId)
		.first<{ count: number }>();

	return Response.json({ count: row?.count ?? 0 });
}
