import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import type { RequestHandler } from './$types.js';

const schema = z.object({
	conversationId: z.string().uuid(),
	snapshot: z.unknown()
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
	if (!parsed.success)
		return json({ error: 'conversationId and snapshot required' }, { status: 400 });

	const { conversationId, snapshot } = parsed.data;
	const token = crypto.randomUUID();

	const { error } = await db().from('shares').insert({
		token,
		conversation_id: conversationId,
		user_id: locals.user.id,
		snapshot
	});

	if (error) {
		console.error('Share insert failed', error);
		return json({ error: 'Failed to create share' }, { status: 500 });
	}

	return json({ token });
};
