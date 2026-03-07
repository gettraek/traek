import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/signin');
	return {
		user: {
			id: locals.user.id,
			email: (locals.user as unknown as { email: string }).email
		}
	};
};
