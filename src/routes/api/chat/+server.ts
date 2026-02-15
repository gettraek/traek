/**
 * Server route: stream OpenAI chat completion.
 * API key is read from env OPENAI_API_KEY (server-side only).
 * Rate limit: CHAT_DAILY_LIMIT_PER_IP requests per IP per day (default 50).
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { checkDailyLimit, pruneOldEntries } from '$lib/server/rate-limit.js';
import { z } from 'zod';

const chatRequestSchema = z.object({
	messages: z
		.array(
			z.object({
				role: z.string(),
				content: z.string()
			})
		)
		.min(1)
});

const DEFAULT_DAILY_LIMIT = dev ? 1000 : 50;

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
		parseInt(env.CHAT_DAILY_LIMIT_PER_IP ?? String(DEFAULT_DAILY_LIMIT), 10) || DEFAULT_DAILY_LIMIT
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

	const parsed = chatRequestSchema.safeParse(raw);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({ error: 'messages array required', details: parsed.error.issues }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}
	const { messages } = parsed.data;

	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-5-mini',
			messages: messages.map((m) => ({
				role: m.role as 'user' | 'assistant' | 'system',
				content: String(m.content ?? '')
			})),
			stream: true
		})
	});

	if (!res.ok) {
		const err = await res.text();
		return new Response(JSON.stringify({ error: 'OpenAI request failed', detail: err }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Parse OpenAI SSE stream and emit only content deltas as plain text
	const reader = res.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	const stream = new ReadableStream({
		async start(controller) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n');
					buffer = lines.pop() ?? '';
					for (const line of lines) {
						if (line.startsWith('data: ')) {
							const data = line.slice(6).trim();
							if (data === '[DONE]') continue;
							try {
								const obj = JSON.parse(data);
								const content = obj?.choices?.[0]?.delta?.content;
								if (typeof content === 'string' && content.length > 0) {
									controller.enqueue(new TextEncoder().encode(content));
								}
							} catch {
								// skip malformed line
							}
						}
					}
				}
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
}
