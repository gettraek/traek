<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TraekCanvas from '../TraekCanvas.svelte';
	import {
		TraekEngine,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type TraekEngineConfig,
		type MessageNode
	} from '../TraekEngine.svelte';
	import BenchmarkCanvas from './BenchmarkCanvas.svelte';
	import StreamingStoryWrapper from './StreamingStoryWrapper.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/TraekCanvas',
		component: TraekCanvas,
		tags: ['autodocs'],
		argTypes: {
			engine: { control: false },
			config: { control: 'object' },
			initialPlacementPadding: { control: 'object' },
			onSendMessage: { control: false },
			showFps: { control: 'boolean' }
		},
		args: {
			initialPlacementPadding: { left: 10, top: 10 },
			showFps: true
		}
	});

	const MOCK_LONG_RESPONSE = `Based on your question, here's a structured answer:

I'd start by clarifying the scope: what exactly do you need the expert to weigh in on? That will determine how deep we go and which resources to pull in.

### 1. Define the problem
What decision or outcome are you trying to improve?

### 2. Context
What have you already tried or considered? Any constraints (time, budget, team)?

### 3. Preferred format
Do you want a short recommendation, a step-by-step plan, or a deeper analysis with options?

**Should we narrow the scope first, or do you want a quick recommendation based on what you've shared?**`;

	const RICH_BUBBLE_MARKDOWN = `## Expert session: getting the most out of it

![Session overview](https://picsum.photos/seed/expert-session/400/220)

Here’s how to make your chat with the expert effective.

### Before the session

- **Clarify your goal** — One main question or decision you want input on.
- **Gather context** — Relevant details, what you've already tried, constraints.
- **Set expectations** — Quick answer vs. deeper analysis.

### During the session

- **Be specific** — The more precise your question, the better the advice.
- **Share constraints** — Time, budget, or team limits help the expert tailor the answer.
- **Ask one thing at a time** — Follow-up threads keep the thread clear.

### After the session

- **Summarize** — Note the main recommendation and next steps.
- **Reuse the thread** — Come back to the same expert for follow-ups.

> One clear question per thread usually gets the best response.

**What do you want to focus on first: framing your question, or adding context?**`;

	function createEngineWithRichBranches(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('How do I get the most out of a session with an expert?', 'user');
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _richReply = engine.addNode(RICH_BUBBLE_MARKDOWN, 'assistant');

		engine.addNode('I want to focus on framing my question first.', 'user');
		engine.addNode(
			'Good idea. Start with: (1) What decision or outcome you need help with, (2) What you’ve already tried or considered, (3) Any constraints (time, budget). One clear sentence per part usually is enough to get a strong first answer.',
			'assistant'
		);

		engine.addNode('Can you give me a one-page checklist?', 'user');
		engine.addNode(
			'**Quick checklist:** Before: one main question, 2–3 context bullets. During: one topic per message, mention constraints. After: note the main recommendation and one next step. Reuse the same thread for follow-ups.',
			'assistant'
		);

		engine.addNode('What if my question is very broad?', 'user');
		engine.addNode(
			'**Narrow it:** Turn “How do I grow?” into “What should I prioritize first: content, outreach, or pricing?” or “What’s the first change you’d make in my situation?” The expert can then go deeper in follow-up messages.',
			'assistant',
			{
				autofocus: true
			}
		);
		return engine;
	}

	function createMockReplyHandler(
		engine: TraekEngine,
		config: TraekEngineConfig
	): (input: string, userNode: MessageNode) => void {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		return (_lastInput: string, _userNode: MessageNode) => {
			setTimeout(() => {
				const responseNode = engine.addNode('', 'assistant', {
					autofocus: true
				});

				const thoughtNode = engine.addNode('Thinking...', 'assistant', {
					type: 'thought',
					parentIds: [responseNode.id],
					autofocus: true,
					x: 1,
					y: -1,
					data: { steps: ['Analyzing input...'] }
				});

				setTimeout(() => {
					engine.updateNode(thoughtNode.id, {
						data: { steps: ['Analyzing input...', 'Retrieving context...'] }
					});
				}, 1000);

				setTimeout(() => {
					engine.updateNode(thoughtNode.id, {
						data: {
							steps: ['Analyzing input...', 'Retrieving context...', 'Generating response...']
						}
					});
				}, 2000);

				setTimeout(() => {
					engine.updateNode(responseNode.id, { status: 'streaming' });
					let currentIndex = 0;
					const streamInterval = setInterval(() => {
						const chunkLength = Math.ceil(Math.random() * 10);
						if (currentIndex < MOCK_LONG_RESPONSE.length) {
							const currentNode = engine.nodes.find((n) => n.id === responseNode.id);
							const currentContent = (currentNode as MessageNode)?.content ?? '';
							const chunk = MOCK_LONG_RESPONSE.substring(currentIndex, currentIndex + chunkLength);
							engine.updateNode(responseNode.id, {
								content: currentContent + chunk
							});
							currentIndex += chunkLength;
						} else {
							clearInterval(streamInterval);
							engine.updateNode(responseNode.id, { status: 'done' });
							engine.updateNode(thoughtNode.id, { content: 'Done' });
						}
					}, config.streamIntervalMs);
				}, 3000);
			}, 600);
		};
	}

	function createEngineWithConversation(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('I need advice on choosing the right tech stack for a new product.', 'user');
		const responseNode = engine.addNode(
			'I can help with that. To tailor the advice: what’s the product type, team size, and any constraints (timeline, budget, existing stack)?',
			'assistant',
			{ autofocus: true }
		);
		engine.activeNodeId = responseNode.id;
		return engine;
	}

	function createEngineWithError(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('What’s the best way to structure our API?', 'user');
		const responseNode = engine.addNode('', 'assistant', {
			autofocus: true
		});
		engine.updateNode(responseNode.id, {
			status: 'error',
			errorMessage: 'Expert unavailable'
		});
		engine.activeNodeId = responseNode.id;
		return engine;
	}

	function createEngineWithExpandableThought(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		engine.addNode('How should I phrase my question to get a useful answer?', 'user');
		const responseNode = engine.addNode(
			'Short version: one clear question, 2–3 context bullets, and any constraints. That’s usually enough for a strong first answer.',
			'assistant',
			{
				autofocus: true
			}
		);
		engine.addNode('Done', 'assistant', {
			type: 'thought',
			parentIds: [responseNode.id],
			data: {
				steps: [
					'Analyzing input: identified intent (how to ask the expert). Loaded conversation context.',
					'Retrieving context: matched guidelines for effective expert questions and answer quality.',
					'Generating response: drafted answer with examples. Ready for review.'
				]
			}
		});
		engine.activeNodeId = responseNode.id;
		return engine;
	}
</script>

<Story asChild name="Default">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
	{/if}
</Story>

<Story asChild name="With mock reply">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const onSendMessage = createMockReplyHandler(engine, DEFAULT_TRACK_ENGINE_CONFIG)}
		<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} {onSendMessage} showFps={true} />
	{/if}
</Story>

<Story asChild name="With conversation">
	{@const engine = createEngineWithConversation()}
	<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
</Story>

<Story asChild name="Streaming">
	<StreamingStoryWrapper />
</Story>

<Story asChild name="Error state">
	{@const engine = createEngineWithError()}
	<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
</Story>

<Story asChild name="Thought with expandable steps">
	{@const engine = createEngineWithExpandableThought()}
	<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
</Story>

<Story asChild name="Rich bubble and branched conversation">
	{@const engine = createEngineWithRichBranches()}
	<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
</Story>

<Story asChild name="Benchmark: 100 nodes">
	<BenchmarkCanvas />
</Story>
