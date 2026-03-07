import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { lucia } from '$lib/server/auth.js';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = url.searchParams.get('token');
	if (!token) redirect(302, '/auth/signin?error=missing_token');

	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

	// Look up token
	const { data: record } = await db()
		.from('magic_link_tokens')
		.select('id, user_id')
		.eq('token_hash', tokenHash)
		.is('used_at', null)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();

	if (!record) redirect(302, '/auth/signin?error=invalid_token');

	// Mark token used
	await db()
		.from('magic_link_tokens')
		.update({ used_at: new Date().toISOString() })
		.eq('id', record.id);

	// Create Lucia session
	const session = await lucia.createSession(record.user_id, {});
	const cookie = lucia.createSessionCookie(session.id);
	cookies.set(cookie.name, cookie.value, { path: '/', ...cookie.attributes });

	redirect(302, '/app');
};
