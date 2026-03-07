import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db.js';
import { decryptApiKey } from '$lib/server/crypto.js';
import { z } from 'zod';
import type { RequestHandler } from './$types.js';

const messageSchema = z.object({
	role: z.enum(['user', 'assistant', 'system']),
	content: z.string()
});

const requestSchema = z.object({
	messages: z.array(messageSchema).min(1),
	provider: z.enum(['openai', 'anthropic']).default('openai'),
	model: z.string().optional()
});

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const parsed = requestSchema.safeParse(body);
	if (!parsed.success)
		return json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });

	const { messages, provider, model } = parsed.data;

	// Load user's encrypted API key
	const { data: profile } = await db()
		.from('user_profiles')
		.select('encrypted_api_keys')
		.eq('user_id', locals.user.id)
		.maybeSingle();

	const keys = profile?.encrypted_api_keys as Record<
		string,
		{ ciphertext: string; iv: string }
	> | null;
	const encryptedKey = keys?.[provider];

	if (!encryptedKey) {
		return json({ error: 'no_api_key' }, { status: 400 });
	}

	let apiKey: string;
	try {
		apiKey = await decryptApiKey(encryptedKey.ciphertext, encryptedKey.iv);
	} catch {
		return json({ error: 'Failed to decrypt API key' }, { status: 500 });
	}

	if (provider === 'openai') {
		return proxyOpenAI(apiKey, messages, model ?? 'gpt-4o-mini');
	} else {
		return proxyAnthropic(apiKey, messages, model ?? 'claude-haiku-4-5-20251001');
	}
};

async function proxyOpenAI(
	apiKey: string,
	messages: Array<{ role: string; content: string }>,
	model: string
): Promise<Response> {
	const res = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ model, messages, stream: true })
	});

	if (!res.ok) {
		const err = await res.text();
		return new Response(JSON.stringify({ error: 'OpenAI error', detail: err }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

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
						if (!line.startsWith('data: ')) continue;
						const data = line.slice(6).trim();
						if (data === '[DONE]') continue;
						try {
							const obj = JSON.parse(data);
							const content = obj?.choices?.[0]?.delta?.content;
							if (typeof content === 'string' && content.length > 0) {
								controller.enqueue(new TextEncoder().encode(content));
							}
						} catch {
							/* skip */
						}
					}
				}
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }
	});
}

async function proxyAnthropic(
	apiKey: string,
	messages: Array<{ role: string; content: string }>,
	model: string
): Promise<Response> {
	const systemMessages = messages.filter((m) => m.role === 'system');
	const chatMessages = messages.filter((m) => m.role !== 'system');
	const system = systemMessages.map((m) => m.content).join('\n') || undefined;

	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			max_tokens: 4096,
			stream: true,
			system,
			messages: chatMessages.map((m) => ({ role: m.role, content: m.content }))
		})
	});

	if (!res.ok) {
		const err = await res.text();
		return new Response(JSON.stringify({ error: 'Anthropic error', detail: err }), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}

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
						if (!line.startsWith('data: ')) continue;
						const data = line.slice(6).trim();
						try {
							const obj = JSON.parse(data);
							if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta') {
								controller.enqueue(new TextEncoder().encode(obj.delta.text));
							}
						} catch {
							/* skip */
						}
					}
				}
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }
	});
}
