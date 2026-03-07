import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { encryptApiKey } from '$lib/server/crypto.js';
import { z } from 'zod';
import type { RequestHandler } from './$types.js';

const schema = z.object({
	provider: z.enum(['openai', 'anthropic']),
	key: z.string().min(10)
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) return json({ error: 'provider and key required' }, { status: 400 });

	const { provider, key } = parsed.data;
	const encrypted = await encryptApiKey(key);

	// Upsert user_profile and merge the new key into encrypted_api_keys JSONB
	const { data: existing } = await db()
		.from('user_profiles')
		.select('encrypted_api_keys')
		.eq('user_id', locals.user.id)
		.maybeSingle();

	const currentKeys = (existing?.encrypted_api_keys ?? {}) as Record<
		string,
		{ ciphertext: string; iv: string }
	>;
	const updatedKeys = { ...currentKeys, [provider]: encrypted };

	await db()
		.from('user_profiles')
		.upsert(
			{ user_id: locals.user.id, encrypted_api_keys: updatedKeys },
			{ onConflict: 'user_id' }
		);

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { provider } = await request.json().catch(() => ({}));
	if (!provider) return json({ error: 'provider required' }, { status: 400 });

	const { data: existing } = await db()
		.from('user_profiles')
		.select('encrypted_api_keys')
		.eq('user_id', locals.user.id)
		.maybeSingle();

	const currentKeys = {
		...((existing?.encrypted_api_keys ?? {}) as Record<string, { ciphertext: string; iv: string }>)
	};
	delete currentKeys[provider];

	await db()
		.from('user_profiles')
		.update({ encrypted_api_keys: currentKeys })
		.eq('user_id', locals.user.id);

	return json({ ok: true });
};
