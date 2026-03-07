import { json } from '@sveltejs/kit';
import type Stripe from 'stripe';
import { stripe, priceIdToTier } from '$lib/server/stripe.js';
import { db } from '$lib/server/db.js';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	const sig = request.headers.get('stripe-signature');
	const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

	if (!sig || !webhookSecret) return json({ error: 'Missing signature' }, { status: 400 });

	let event: Stripe.Event;
	try {
		const body = await request.text();
		event = stripe().webhooks.constructEvent(body, sig, webhookSecret);
	} catch (err) {
		console.error('Webhook signature verification failed', err);
		return json({ error: 'Invalid signature' }, { status: 400 });
	}

	switch (event.type) {
		case 'customer.subscription.created':
		case 'customer.subscription.updated': {
			const sub = event.data.object as Stripe.Subscription;
			const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
			const priceId = sub.items.data[0]?.price.id;
			const tier = priceId ? priceIdToTier(priceId) : 'free';
			const active = ['active', 'trialing'].includes(sub.status);

			await db()
				.from('user_profiles')
				.update({
					tier: active ? tier : 'free',
					stripe_subscription_id: sub.id
				})
				.eq('stripe_customer_id', customerId);
			break;
		}
		case 'customer.subscription.deleted': {
			const sub = event.data.object as Stripe.Subscription;
			const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
			await db()
				.from('user_profiles')
				.update({ tier: 'free', stripe_subscription_id: null })
				.eq('stripe_customer_id', customerId);
			break;
		}
	}

	return json({ received: true });
};
