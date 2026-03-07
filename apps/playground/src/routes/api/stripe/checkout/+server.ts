import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { db } from '$lib/server/db.js';
import { env } from '$env/dynamic/private';
import { env as pubEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const userEmail = (locals.user as unknown as { email: string }).email;
	const appUrl = pubEnv.PUBLIC_APP_URL ?? env.PUBLIC_APP_URL ?? 'http://localhost:5173';

	// Get or create Stripe customer
	const { data: profile } = await db()
		.from('user_profiles')
		.select('stripe_customer_id')
		.eq('user_id', locals.user.id)
		.maybeSingle();

	let customerId = profile?.stripe_customer_id as string | undefined;
	if (!customerId) {
		const customer = await stripe().customers.create({ email: userEmail });
		customerId = customer.id;
		await db()
			.from('user_profiles')
			.upsert(
				{ user_id: locals.user.id, stripe_customer_id: customerId },
				{ onConflict: 'user_id' }
			);
	}

	const session = await stripe().checkout.sessions.create({
		customer: customerId,
		mode: 'subscription',
		line_items: [{ price: env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
		success_url: `${appUrl}/app?upgraded=1`,
		cancel_url: `${appUrl}/app/settings`
	});

	return json({ url: session.url });
};
