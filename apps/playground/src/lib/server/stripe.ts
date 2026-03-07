import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
	if (!_stripe) {
		if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
		_stripe = new Stripe(env.STRIPE_SECRET_KEY);
	}
	return _stripe;
}

export type Tier = 'free' | 'pro' | 'team';

export function priceIdToTier(priceId: string): Tier {
	if (priceId === env.STRIPE_PRO_PRICE_ID) return 'pro';
	if (priceId === env.STRIPE_TEAM_PRICE_ID) return 'team';
	return 'free';
}
