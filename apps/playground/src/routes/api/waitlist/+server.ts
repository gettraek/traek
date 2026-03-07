import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { sendWaitlistConfirmation } from '$lib/server/email';
import type { RequestHandler } from './$types';

const WaitlistSchema = z.object({
	email: z.string().email('Invalid email address').max(320)
});

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = WaitlistSchema.safeParse(body);
	if (!parsed.success) {
		const firstIssue = parsed.error.issues[0];
		return json({ error: firstIssue?.message ?? 'Invalid input' }, { status: 400 });
	}

	const { email } = parsed.data;

	try {
		// Upsert into waitlist table (no-op if already exists)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (db() as any)
			.from('waitlist')
			.upsert({ email, joined_at: new Date().toISOString() }, { onConflict: 'email' });

		if (error) {
			console.error('Waitlist upsert error:', error);
			return json({ error: 'Failed to join waitlist. Please try again.' }, { status: 500 });
		}

		// Best-effort confirmation email — don't fail the request if email fails
		try {
			await sendWaitlistConfirmation(email);
		} catch (emailErr) {
			console.error('Waitlist confirmation email failed:', emailErr);
		}

		return json({ ok: true });
	} catch (err) {
		console.error('Waitlist error:', err);
		return json({ error: 'Server error. Please try again.' }, { status: 500 });
	}
};
