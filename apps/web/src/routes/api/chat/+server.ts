/**
 * Server route: stream OpenAI chat completion.
 * API key is read from env OPENAI_API_KEY (server-side only).
 * Rate limit: CHAT_DAILY_LIMIT_PER_IP requests per IP per day (default 50).
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { checkDailyLimit, pruneOldEntries } from '$lib/server/rate-limit';
import { z } from 'zod';

const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 8000;

// Coerce instead of reject: the demo client sends the full ancestor path verbatim,
// which may include system/custom-role nodes, over-long assistant content, or deep
// threads. Unknown roles are dropped, content is truncated, and the history is
// windowed to the last MAX_MESSAGES entries below.
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

// Server-controlled system prompt; client-supplied system messages are filtered out.
const SYSTEM_PROMPT =
	'You are the Træk demo assistant, a helpful AI inside a spatial, tree-structured conversation canvas. Answer concisely and use markdown where it helps.';

const DEFAULT_DAILY_LIMIT = dev ? 1000 : 50;

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

	const parsed = chatRequestSchema.safeParse(raw);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({ error: 'messages array required', details: parsed.error.issues }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}
	const messages = parsed.data.messages
		.filter((m) => m.role === 'user' || m.role === 'assistant')
		.map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }))
		.slice(-MAX_MESSAGES);

	if (messages.length === 0) {
		return new Response(
			JSON.stringify({ error: 'messages must contain at least one user or assistant message' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}

	pruneOldEntries();
	const ip = getClientAddress();
	const limit = Math.max(
		1,
		parseInt(env.CHAT_DAILY_LIMIT_PER_IP ?? String(DEFAULT_DAILY_LIMIT), 10) || DEFAULT_DAILY_LIMIT
	);
	const rate = checkDailyLimit('chat', ip, limit);
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

	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-5-mini',
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT },
				...messages.map((m) => ({ role: m.role, content: m.content }))
			],
			stream: true
		}),
		signal: request.signal
	});

	if (!res.ok) {
		const err = await res.text().catch(() => '');
		console.error('OpenAI chat request failed', res.status, err);
		return new Response(JSON.stringify({ error: 'Upstream request failed' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// Parse OpenAI SSE stream and emit only content deltas as plain text
	const reader = res.body!.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	// Set when the client disconnects; the pump must not touch the controller
	// afterwards (close()/error() would throw) nor log the abort as a real error.
	let cancelled = false;
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
				if (!cancelled) {
					try {
						controller.close();
					} catch {
						// Controller already closed/errored; nothing to do.
					}
				}
			} catch (e) {
				if (!cancelled) {
					console.error('OpenAI chat stream error', e);
					controller.error(e);
				}
			}
		},
		cancel() {
			cancelled = true;
			reader.cancel().catch(() => {});
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
