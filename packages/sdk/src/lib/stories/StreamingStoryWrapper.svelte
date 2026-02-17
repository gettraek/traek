<script lang="ts">
	import { onMount } from 'svelte';
	import TraekCanvas from '../TraekCanvas.svelte';
	import {
		TraekEngine,
		DEFAULT_TRACK_ENGINE_CONFIG,
		type MessageNode
	} from '../TraekEngine.svelte';

	const STREAMING_CONTENT = `Based on what you’ve shared, I’d start by narrowing the question to one main decision or outcome you need help with. Add 2–3 short context bullets and any constraints (time, budget, team). That’s usually enough for a useful first answer.

Want to refine the question together or get a quick recommendation from here?`;

	const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
	engine.addNode('How do I get a good answer from the expert?', 'user');
	const responseNode = engine.addNode('', 'assistant', {
		autofocus: true
	});
	engine.updateNode(responseNode.id, { status: 'streaming' });
	engine.addNode('Thinking...', 'assistant', {
		type: 'thought',
		parentIds: [responseNode.id],
		x: 1,
		y: -1,
		data: {
			steps: ['Analyzing input...', 'Retrieving context...', 'Generating response...']
		}
	});
	engine.activeNodeId = responseNode.id;

	onMount(() => {
		let currentIndex = 0;
		const streamInterval = setInterval(() => {
			const chunkLength = Math.min(
				Math.ceil(Math.random() * 8) + 2,
				STREAMING_CONTENT.length - currentIndex
			);
			if (currentIndex < STREAMING_CONTENT.length) {
				const node = engine.nodes.find((n) => n.id === responseNode.id) as MessageNode | undefined;
				const currentContent = node?.content ?? '';
				const chunk = STREAMING_CONTENT.substring(currentIndex, currentIndex + chunkLength);
				engine.updateNode(responseNode.id, {
					content: currentContent + chunk
				});
				currentIndex += chunkLength;
			} else {
				clearInterval(streamInterval);
				engine.updateNode(responseNode.id, { status: 'done' });
				const thoughtNode = engine.nodes.find(
					(n) => n.parentIds.includes(responseNode.id) && n.type === 'thought'
				);
				if (thoughtNode) engine.updateNode(thoughtNode.id, { content: 'Done' });
			}
		}, DEFAULT_TRACK_ENGINE_CONFIG.streamIntervalMs);
	});
</script>

<TraekCanvas {engine} config={DEFAULT_TRACK_ENGINE_CONFIG} showFps={true} />
