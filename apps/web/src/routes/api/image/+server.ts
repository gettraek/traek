/**
 * Server route: generate an image with OpenAI.
 * API key is read from env OPENAI_API_KEY (server-side only).
 * Rate limit: IMAGE_DAILY_LIMIT_PER_IP requests per IP per day (default 25).
 */

import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { checkDailyLimit, pruneOldEntries } from '$lib/server/rate-limit';

const DEFAULT_DAILY_LIMIT = dev ? 1000 : 25;

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
		parseInt(env.IMAGE_DAILY_LIMIT_PER_IP ?? String(DEFAULT_DAILY_LIMIT), 10) || DEFAULT_DAILY_LIMIT
	);
	const rate = checkDailyLimit(ip, limit);
	if (!rate.allowed) {
		return new Response(
			JSON.stringify({
				error: 'Daily image request limit reached',
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

	let body: { prompt?: string; size?: string };
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const prompt = body.prompt?.trim();
	if (!prompt) {
		return new Response(JSON.stringify({ error: 'prompt is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const size = body.size ?? '1024x1024';

	const res = await fetch('https://api.openai.com/v1/images/generations', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'gpt-image-1-mini',
			prompt,
			n: 1,
			size
		})
	});

	if (!res.ok) {
		const text = await res.text().catch(() => '');
		return new Response(
			JSON.stringify({
				error: 'OpenAI image request failed',
				detail: text || res.statusText
			}),
			{
				status: res.status,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const json = (await res.json()) as {
		data?: Array<{ b64_json?: string }>;
	};
	const b64 = json.data?.[0]?.b64_json;

	if (!b64) {
		return new Response(JSON.stringify({ error: 'No image data returned from OpenAI' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// GPT image models return base64-encoded image data; expose a data URL for the demo.
	const dataUrl = `data:image/png;base64,${b64}`;

	return new Response(JSON.stringify({ dataUrl }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
}
