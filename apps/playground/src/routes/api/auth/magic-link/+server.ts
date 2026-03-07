import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { sendMagicLink } from '$lib/server/email.js';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
import { z } from 'zod';
import crypto from 'node:crypto';

const schema = z.object({ email: z.string().email() });

export async function POST({ request }) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) return json({ error: 'Valid email required' }, { status: 400 });

	const { email } = parsed.data;

	// Upsert user
	const { data: user, error: userError } = await db()
		.from('users')
		.upsert({ email }, { onConflict: 'email' })
		.select('id')
		.single();

	if (userError || !user) {
		console.error('User upsert failed', userError);
		return json({ error: 'Internal error' }, { status: 500 });
	}

	// Create magic link token (15 min TTL)
	const token = crypto.randomBytes(32).toString('hex');
	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

	const { error: tokenError } = await db()
		.from('magic_link_tokens')
		.insert({ user_id: user.id, token_hash: tokenHash, expires_at: expiresAt });

	if (tokenError) {
		console.error('Token insert failed', tokenError);
		return json({ error: 'Internal error' }, { status: 500 });
	}

	const appUrl = pubEnv.PUBLIC_APP_URL ?? env.PUBLIC_APP_URL ?? 'http://localhost:5173';

	try {
		await sendMagicLink(email, token, appUrl);
	} catch (err) {
		console.error('Email send failed', err);
		return json({ error: 'Failed to send email' }, { status: 500 });
	}

	return json({ ok: true });
}
