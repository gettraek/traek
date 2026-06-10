/**
 * Server route: resolve actions via OpenAI gpt-4o-mini.
 * Receives user input + action definitions, returns matching action IDs.
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { checkDailyLimit, pruneOldEntries } from '$lib/server/rate-limit';
import { z } from 'zod';

const resolveActionsRequestSchema = z.object({
	input: z.string().min(1).max(2000),
	actions: z
		.array(
			z.object({
				id: z.string().max(100),
				description: z.string().max(200)
			})
		)
		.max(20)
});

const actionIdsSchema = z.array(z.string());

const DEFAULT_DAILY_LIMIT = dev ? 10000 : 100;

export async function POST({ request, getClientAddress }) {
	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set on server' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	let raw: unknown;
	try {
		raw = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const parsed = resolveActionsRequestSchema.safeParse(raw);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({ error: 'input and actions array required', details: parsed.error.issues }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}
	const { input, actions } = parsed.data;

	pruneOldEntries();
	const ip = getClientAddress();
	const limit = Math.max(
		1,
		parseInt(env.RESOLVE_ACTIONS_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT), 10) ||
			DEFAULT_DAILY_LIMIT
	);
	const rate = checkDailyLimit('resolve-actions', ip, limit);
	if (!rate.allowed) {
		return new Response(
			JSON.stringify({
				error: 'Daily request limit reached',
				retryAfter: rate.retryAfter
			}),
			{
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(rate.retryAfter)
				}
			}
		);
	}

	const actionList = actions.map((a) => `- ${a.id}: ${a.description}`).join('\n');
	const systemPrompt = `You are an action classifier. Given a user message and a list of available actions, return a JSON array of action IDs that are relevant to the user's intent. Return only the JSON array, nothing else. If no actions match, return [].

Available actions:
${actionList}`;

	try {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				temperature: 0,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: input }
				]
			})
		});

		if (!res.ok) {
			const err = await res.text().catch(() => '');
			console.error('OpenAI resolve-actions request failed', res.status, err);
			return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = (await res.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = data.choices?.[0]?.message?.content ?? '[]';

		// Validate model output and only return ids that were actually submitted
		let actionIds: string[] = [];
		try {
			const modelOutput = actionIdsSchema.safeParse(JSON.parse(content));
			if (modelOutput.success) {
				const knownIds = new Set(actions.map((a) => a.id));
				actionIds = modelOutput.data.filter((id) => knownIds.has(id));
			}
		} catch {
			actionIds = [];
		}

		return new Response(JSON.stringify({ actionIds }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		console.error('resolve-actions failed', e);
		return new Response(JSON.stringify({ error: 'Unexpected error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
