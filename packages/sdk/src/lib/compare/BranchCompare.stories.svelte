<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BranchCompare from './BranchCompare.svelte';
	import { TraekEngine, DEFAULT_TRACK_ENGINE_CONFIG } from '../TraekEngine.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/BranchCompare',
		component: BranchCompare,
		tags: ['autodocs'],
		argTypes: {
			engine: { control: false },
			nodeId: { control: false },
			onClose: { control: false }
		}
	});

	function createEngineTwoBranches(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		const root = engine.addNode('How should I structure my API?', 'user');

		// Branch A: REST approach
		engine.branchFrom(root.id);
		const branchA = engine.addNode('Use REST with resource-oriented endpoints.', 'assistant');
		engine.branchFrom(branchA.id);
		engine.addNode(
			'GET /users, POST /users, GET /users/:id, PUT /users/:id, DELETE /users/:id',
			'assistant'
		);

		// Branch B: GraphQL approach
		engine.branchFrom(root.id);
		const branchB = engine.addNode('Use GraphQL for flexible data querying.', 'assistant');
		engine.branchFrom(branchB.id);
		engine.addNode(
			'Single endpoint with schema: type User { id, name, email }. Query { users, user(id: ID!) }',
			'assistant'
		);

		return engine;
	}

	function createEngineThreeBranches(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		const root = engine.addNode('What frontend framework should I choose?', 'user');

		// Branch A: React
		engine.branchFrom(root.id);
		const branchA = engine.addNode(
			'React: Large ecosystem, great for complex UIs, strong job market.',
			'assistant'
		);
		engine.branchFrom(branchA.id);
		engine.addNode(
			'Pros: Huge community, lots of libraries. Cons: JSX learning curve.',
			'assistant'
		);

		// Branch B: Vue
		engine.branchFrom(root.id);
		const branchB = engine.addNode(
			'Vue: Easy to learn, progressive framework, great documentation.',
			'assistant'
		);
		engine.branchFrom(branchB.id);
		engine.addNode('Pros: Gentle learning curve. Cons: Smaller ecosystem than React.', 'assistant');

		// Branch C: Svelte
		engine.branchFrom(root.id);
		const branchC = engine.addNode(
			'Svelte: No virtual DOM, compiled output, minimal boilerplate.',
			'assistant'
		);
		engine.branchFrom(branchC.id);
		engine.addNode(
			'Pros: Fast, simple syntax. Cons: Smaller community, fewer resources.',
			'assistant'
		);

		return engine;
	}

	function createEngineLongBranches(): TraekEngine {
		const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);
		const root = engine.addNode('Explain the difference between SQL and NoSQL databases.', 'user');

		// Branch A: Detailed SQL
		engine.branchFrom(root.id);
		let current = engine.addNode(
			'SQL databases use structured tables with predefined schemas. They enforce ACID properties (Atomicity, Consistency, Isolation, Durability) and support complex joins.',
			'assistant'
		);
		engine.branchFrom(current.id);
		current = engine.addNode(
			'Examples: PostgreSQL, MySQL, SQLite. Best for: financial systems, transactional data, structured reporting.',
			'assistant'
		);
		engine.branchFrom(current.id);
		engine.addNode(
			'Key strengths: data integrity, complex queries with JOINs, well-established standards.',
			'assistant'
		);

		// Branch B: Detailed NoSQL
		engine.branchFrom(root.id);
		current = engine.addNode(
			'NoSQL databases are schema-less and optimized for horizontal scaling. They sacrifice some consistency guarantees for high availability and partition tolerance (CAP theorem).',
			'assistant'
		);
		engine.branchFrom(current.id);
		current = engine.addNode(
			'Examples: MongoDB (document), Redis (key-value), Cassandra (column-family). Best for: real-time apps, high-volume writes, flexible schemas.',
			'assistant'
		);
		engine.branchFrom(current.id);
		engine.addNode(
			'Key strengths: horizontal scaling, flexible data models, high write throughput.',
			'assistant'
		);

		return engine;
	}
</script>

<Story asChild name="Two Branches">
	{#if typeof window !== 'undefined'}
		{@const engine = createEngineTwoBranches()}
		{@const rootId = engine.nodes[0].id}
		<div style="width: 100%; height: 600px; background: var(--traek-canvas-bg);">
			<BranchCompare {engine} nodeId={rootId} onClose={() => console.log('Close')} />
		</div>
	{/if}
</Story>

<Story asChild name="Three Branches">
	{#if typeof window !== 'undefined'}
		{@const engine = createEngineThreeBranches()}
		{@const rootId = engine.nodes[0].id}
		<div style="width: 100%; height: 600px; background: var(--traek-canvas-bg);">
			<BranchCompare {engine} nodeId={rootId} onClose={() => console.log('Close')} />
		</div>
	{/if}
</Story>

<Story asChild name="Long Branches">
	{#if typeof window !== 'undefined'}
		{@const engine = createEngineLongBranches()}
		{@const rootId = engine.nodes[0].id}
		<div style="width: 100%; height: 600px; background: var(--traek-canvas-bg);">
			<BranchCompare {engine} nodeId={rootId} onClose={() => console.log('Close')} />
		</div>
	{/if}
</Story>

<Story asChild name="No Branches">
	{#if typeof window !== 'undefined'}
		{@const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG)}
		{@const root = engine.addNode('A node with no branches', 'user')}
		<div style="width: 100%; height: 400px; background: var(--traek-canvas-bg);">
			<BranchCompare {engine} nodeId={root.id} onClose={() => console.log('Close')} />
		</div>
	{/if}
</Story>
