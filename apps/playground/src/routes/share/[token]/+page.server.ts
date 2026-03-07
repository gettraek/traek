import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params }) => {
	const { data } = await db()
		.from('shares')
		.select('snapshot, conversation_id')
		.eq('token', params.token)
		.maybeSingle();

	if (!data) error(404, 'Shared conversation not found');

	return { snapshot: data.snapshot };
};
