import type { Env, AuthContext } from '../types.js';

/**
 * Computes SHA-256 of `text` (+ optional salt) and returns the hex digest.
 * Uses the Web Crypto API which is available in all Workers runtimes.
 */
async function sha256Hex(text: string, salt = ''): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(salt + text);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Validates the `Authorization: Bearer <key>` header against the `api_keys`
 * table in D1. Returns an `AuthContext` on success or null on failure.
 *
 * The raw API key is never stored — only its SHA-256 hash (with an optional
 * per-deployment salt from the `API_KEY_SALT` env var).
 */
export async function authenticate(request: Request, env: Env): Promise<AuthContext | null> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) return null;

	const rawKey = authHeader.slice(7).trim();
	if (!rawKey) return null;

	const keyHash = await sha256Hex(rawKey, env.API_KEY_SALT ?? '');

	const row = await env.DB.prepare('SELECT workspace_id FROM api_keys WHERE key_hash = ? LIMIT 1')
		.bind(keyHash)
		.first<{ workspace_id: string }>();

	if (!row) return null;

	// Fire-and-forget: update last_used_at without blocking the response
	env.DB.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE key_hash = ?")
		.bind(keyHash)
		.run()
		.catch(() => {});

	return { workspaceId: row.workspace_id };
}

/**
 * Returns a 401 JSON response.
 */
export function unauthorized(): Response {
	return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
