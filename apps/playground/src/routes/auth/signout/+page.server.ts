import { redirect } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		if (!locals.session) redirect(302, '/');
		await lucia.invalidateSession(locals.session.id);
		const blank = lucia.createBlankSessionCookie();
		cookies.set(blank.name, blank.value, { path: '/', ...blank.attributes });
		redirect(302, '/');
	}
};
