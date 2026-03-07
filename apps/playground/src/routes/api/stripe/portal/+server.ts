import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { db } from '$lib/server/db.js';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await db()
		.from('user_profiles')
		.select('stripe_customer_id')
		.eq('user_id', locals.user.id)
		.maybeSingle();

	const customerId = profile?.stripe_customer_id as string | undefined;
	if (!customerId) return json({ error: 'No subscription found' }, { status: 404 });

	const appUrl = pubEnv.PUBLIC_APP_URL ?? env.PUBLIC_APP_URL ?? 'http://localhost:5173';

	const session = await stripe().billingPortal.sessions.create({
		customer: customerId,
		return_url: `${appUrl}/app/settings`
	});

	return json({ url: session.url });
};
