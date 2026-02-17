/**
 * Server route: resolve actions via OpenAI gpt-4o-mini.
 * Receives user input + action definitions, returns matching action IDs.
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { checkDailyLimit, pruneOldEntries } from '@traek/sdk/server';
import { z } from 'zod';

const resolveActionsRequestSchema = z.object({
	input: z.string().min(1),
	actions: z.array(
		z.object({
			id: z.string(),
			description: z.string()
		})
	)
});

const DEFAULT_DAILY_LIMIT = dev ? 10000 : 100;

export async function POST({ request, getClientAddress }) {
	const apiKey = env.OPENAI_API_KEY;
	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set on server' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	pruneOldEntries();
	const ip = getClientAddress();
	const limit = Math.max(
		1,
		parseInt(env.RESOLVE_ACTIONS_DAILY_LIMIT ?? String(DEFAULT_DAILY_LIMIT), 10) ||
			DEFAULT_DAILY_LIMIT
	);
	const rate = checkDailyLimit(ip, limit);
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
			const err = await res.text();
			return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: err }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = (await res.json()) as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		const content = data.choices?.[0]?.message?.content ?? '[]';

		let actionIds: string[];
		try {
			actionIds = JSON.parse(content);
			if (!Array.isArray(actionIds)) actionIds = [];
		} catch {
			actionIds = [];
		}

		return new Response(JSON.stringify({ actionIds }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (e) {
		return new Response(
			JSON.stringify({
				error: e instanceof Error ? e.message : 'Unexpected error'
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
}
