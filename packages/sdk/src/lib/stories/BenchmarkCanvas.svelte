<script lang="ts">
	import TraekCanvas from '../TraekCanvas.svelte';
	import {
		TraekEngine,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type AddNodePayload
	} from '../TraekEngine.svelte';

	const LOG_CONTEXT = 'BenchmarkCanvas';

	const BENCHMARK_USER_MESSAGES = ['How do I get the most out of a session with an expert?'];
	const BENCHMARK_ASSISTANT_SNIPPETS = [
		"Start with one clear question and 2–3 context bullets. That's usually enough for a strong first answer.",
		"Narrow broad questions: e.g. 'What should I prioritize first?' instead of 'How do I grow?'",
		'Mention constraints (time, budget, team) so the expert can tailor the advice.',
		'One topic per message keeps the thread clear. You can always branch for follow-ups.',
		'Reuse the same thread for related follow-ups so the expert has full context.',
		'Before the session: define your goal, gather context, set expectations (quick vs deep).',
		'During: be specific, share constraints, ask one thing at a time.',
		'After: note the main recommendation and one next step.',
		'A good question template: What decision? What have you tried? What are the constraints?',
		"If the answer is too generic, ask: 'What would you do first in my situation?'",
		'You can ask for a short recommendation, a step-by-step plan, or a deeper analysis.',
		'Experts work best with one main question per thread. Split big topics into separate threads.',
		"Add a line like 'I have 2 weeks and a small budget' to get more actionable advice.",
		"Follow-up with 'Can you go deeper on X?' to get more detail on one part.",
		"Summarize your understanding: 'So the first step is…' — the expert can correct or confirm."
	];

	function benchmarkImageMarkdown(index: number): string {
		const url = `https://picsum.photos/seed/expert-${index}/280/140`;
		return `\n\n![image](${url})\n\n`;
	}

	const rootMsg =
		BENCHMARK_USER_MESSAGES[0] ?? 'How do I get the most out of a session with an expert?';

	const buildStart = performance.now();
	const rootId = crypto.randomUUID() as string;
	const level1Ids = Array.from({ length: 10 }, () => crypto.randomUUID() as string);
	const level2Ids = Array.from({ length: 30 }, () => crypto.randomUUID() as string);
	const level3Ids = Array.from({ length: 60 }, () => crypto.randomUUID() as string);

	const payloads: AddNodePayload[] = [
		{
			id: rootId,
			parentIds: [],
			content: rootMsg,
			role: 'user',
			metadata: { x: 0, y: 0 }
		},
		...level1Ids.map((id, i) => {
			let content =
				BENCHMARK_ASSISTANT_SNIPPETS[i % BENCHMARK_ASSISTANT_SNIPPETS.length] ?? `Branch ${i + 1}`;
			if (i % 3 === 0) content += benchmarkImageMarkdown(i);
			return {
				id,
				parentIds: [rootId],
				content,
				role: 'assistant' as const,
				metadata: { x: (-(level1Ids.length / 2) + i) * 132, y: 6 }
			};
		}),
		...level2Ids.map((id, i) => {
			const parentIndex = Math.floor(i / 3);
			const idx = 10 + i;
			let content =
				BENCHMARK_ASSISTANT_SNIPPETS[idx % BENCHMARK_ASSISTANT_SNIPPETS.length] ??
				`Response ${i + 1}`;
			if (idx % 4 === 0) content += benchmarkImageMarkdown(idx);
			return {
				id,
				parentIds: level1Ids[parentIndex] ? [level1Ids[parentIndex] as string] : [],
				content,
				role: 'assistant' as const,
				metadata: { x: (-(level2Ids.length / 2) + i) * 44 - 44, y: 15 }
			};
		}),
		...level3Ids.map((id, i) => {
			const parentIndex = Math.floor(i / 2);
			const leafIdx = 40 + i;
			let content =
				BENCHMARK_ASSISTANT_SNIPPETS[leafIdx % BENCHMARK_ASSISTANT_SNIPPETS.length] ??
				`Follow-up ${leafIdx}`;
			if (leafIdx % 5 === 0) content += benchmarkImageMarkdown(leafIdx);
			return {
				id,
				parentIds: level2Ids[parentIndex] ? [level2Ids[parentIndex] as string] : [],
				content,
				role: 'assistant' as const,
				metadata: { x: (-(level2Ids.length / 2) + i) * 22 - 385, y: 35 }
			};
		})
	];
	console.log(LOG_CONTEXT, 'build payloads', {
		ms: Math.round(performance.now() - buildStart),
		count: payloads.length
	});

	const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
	const addNodesStart = performance.now();
	engine.addNodes(payloads);
	requestAnimationFrame(() => {
		if (payloads[0]?.id) {
			engine.focusOnNode(payloads[0].id);
		}
	});
	console.log(LOG_CONTEXT, 'engine.addNodes(payloads)', {
		ms: Math.round(performance.now() - addNodesStart)
	});
</script>

<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
