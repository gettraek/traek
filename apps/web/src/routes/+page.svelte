<script lang="ts">
	import {
		markdownToHtml,
		useTheme,
		DEFAULT_TRACK_ENGINE_CONFIG,
		TraekCanvas,
		DefaultLoadingOverlay,
		createHeroEngine,
		GravityDotsBackground
	} from '@traek/sdk';
	import highlightDarkUrl from 'highlight.js/styles/github-dark.css?url';
	import highlightLightUrl from 'highlight.js/styles/github.css?url';
	import { resolve } from '$app/paths';

	const themeContext = useTheme();
	const currentTheme = $derived(themeContext.currentThemeName());

	// Read-only hero demo: pre-seeded engine, no user interaction
	const heroEngine = createHeroEngine(DEFAULT_TRACK_ENGINE_CONFIG);

	const renderedContent = $derived(
		markdownToHtml(
			`\`\`\`bash
npm install traek
\`\`\`

\`\`\`svelte
<script lang="ts">
  import {
    TraekCanvas,
    TraekEngine,
    DEFAULT_TRACK_ENGINE_CONFIG
  } from 'traek';

  const engine = new TraekEngine(DEFAULT_TRACK_ENGINE_CONFIG);

  // Canvas calls this with the text the user typed
  // and the node they're replying from (for branching).
  function onSendMessage(input, fromNode) {
    const userNode = engine.addNode(input, 'user', {
      parentIds: fromNode?.id ? [fromNode.id] : []
    });

    const assistantNode = engine.addNode('', 'assistant', {
      // Parent defaults to the active node (the new user message),
      // so replies naturally branch from the message you answered.
      autofocus: true
    });

    // stream chunks into assistantNode.content here...
  }

  <TraekCanvas {engine} {onSendMessage} />
` +
				// eslint-disable-next-line no-useless-escape
				`<\/script>
\`\`\``
		)
	);
</script>

<svelte:head>
	<link rel="stylesheet" href={currentTheme === 'light' ? highlightLightUrl : highlightDarkUrl} />
</svelte:head>

<main class="landing">
	<section class="hero">
		<div class="hero-copy">
			<div class="eyebrow">spatial conversation engine</div>
			<h1>træk — follow ideas, not threads.</h1>
			<p class="tagline">
				træk turns linear chats into a spatial canvas of branching conversations — built for
				AI-native products where reasoning is not linear.
			</p>

			<div class="hero-grid">
				<div class="hero-pill">
					<span class="dot"></span> Branch conversations without losing history
				</div>
				<div class="hero-pill">
					<span class="dot"></span> Navigate discussions like a map, not a log
				</div>
				<div class="hero-pill">
					<span class="dot"></span> Streaming-first & markdown aware
				</div>
			</div>

			<div class="hero-cta-row">
				<a href={resolve('/demo', {})} class="btn primary" data-umami-event="landing-cta-demo"
					>Open interactive demo</a
				>
				<a
					href="https://www.npmjs.com/package/traek"
					class="btn secondary"
					rel="noreferrer"
					data-umami-event="landing-cta-npm"
				>
					npm install traek
				</a>
			</div>
		</div>

		<div class="hero-demo">
			<div class="hero-demo-label">Live topology preview (read-only)</div>
			<div class="demo-frame">
				{#if heroEngine}
					<TraekCanvas engine={heroEngine} config={DEFAULT_TRACK_ENGINE_CONFIG} showStats={false}>
						{#snippet initialOverlay()}
							<DefaultLoadingOverlay />
						{/snippet}
					</TraekCanvas>
				{:else}
					<div class="demo-placeholder">træk canvas loads in the browser.</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="section section--problem">
		<div class="section-content section-split">
			<div class="section-card">
				<h2>The problem with classic chat UIs</h2>
				<p>
					Most AI products still present long-form reasoning as a single scrolling thread. That
					works for quick answers — but breaks down as soon as conversations become exploratory,
					multi-directional, iterative, agent-driven, and reasoning-heavy.
				</p>
				<p>
					Context gets buried, alternative paths are lost, and it becomes hard to see how a decision
					was reached.
				</p>
				<p class="punchline">
					<strong>If AI thinking branches, your UI shouldn’t stay flat.</strong>
				</p>
			</div>

			<div class="section-metric">
				<div class="metric-number">∞</div>
				<p class="metric-label">possible paths</p>
				<p class="metric-copy">
					træk treats conversations as a navigable graph instead of a frozen log — so branching
					exploration is the default, not an edge-case.
				</p>
			</div>
		</div>
	</section>

	<section class="section alt">
		<div class="section-content two-column">
			<div>
				<h2>What træk gives you</h2>
				<p>
					træk replaces the scrolling timeline with a spatial mental model of the conversation. Each
					message is a node; every reply is a direction you can branch, follow, or revisit.
				</p>
				<ul>
					<li>
						<strong>Branching conversations</strong> — explore alternatives without overwriting the main
						path.
					</li>
					<li>
						<strong>Readable layout</strong> — parents stay above, replies fan out horizontally as complexity
						grows.
					</li>
					<li>
						<strong>Pan &amp; zoom canvas</strong> — move through large dialogs like a diagram, not a
						log.
					</li>
					<li>
						<strong>Thought nodes</strong> — attach system / reasoning steps without polluting the visible
						path.
					</li>
					<li>
						<strong>Streaming-first</strong> — render tokens in place while keeping the topology intact.
					</li>
				</ul>
			</div>

			<div class="code-card">
				<div class="code-card-label">Quick start</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html renderedContent}
			</div>
		</div>
	</section>

	<section class="section section--stack">
		<div class="section-content two-column">
			<div class="section-card">
				<h2>Engine + canvas, cleanly separated</h2>
				<p>træk keeps the conversation graph and the UI as separate layers:</p>
				<ul>
					<li>
						<strong>TraekEngine</strong> — owns nodes, relationships, layout logic, and state.
					</li>
					<li>
						<strong>TraekCanvas</strong> — renders the spatial UI, pan/zoom, and interaction.
					</li>
				</ul>
				<p>
					You stay in control of message creation, streaming, persistence, and model orchestration.
					træk keeps everything navigable and coherent.
				</p>
			</div>

			<div class="stack-grid">
				<div class="stack-item">
					<h3>Built for</h3>
					<ul>
						<li>AI chat products</li>
						<li>agent interfaces</li>
						<li>prompt exploration tools</li>
						<li>research assistants</li>
						<li>reasoning-heavy workflows</li>
						<li>multi-path generation UIs</li>
					</ul>
				</div>
				<div class="stack-item stack-item--light">
					<h3>Drop-in integration</h3>
					<p>
						Use TraekCanvas as a ready-made UI, or wire TraekEngine into your own components and
						render messages your way.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="section final">
		<div class="section-content final-inner">
			<h2>Stop designing AI conversations as a single thread.</h2>
			<p>
				træk is under active development. Try the demos, drop it into your product, and shape how
				spatial AI conversations feel.
			</p>
			<div class="hero-cta-row">
				<a
					href={resolve('/demo', {})}
					class="btn primary"
					data-umami-event="landing-cta-demo-bottom">Open interactive demo</a
				>
				<a
					href="https://github.com/gettraek/traek"
					class="btn tertiary"
					data-umami-event="landing-cta-github">View source</a
				>
			</div>
		</div>
	</section>
	<GravityDotsBackground />
</main>

<style>
	:global(body) {
		margin: 0;
		color: var(--traek-landing-text-main, #f5f5f5);
	}

	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		gap: 4rem;
		padding: 3rem max(5vw, 2rem) 4rem;
		box-sizing: border-box;
	}

	.hero {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.4fr);
		align-items: center;
		gap: 3rem;
	}

	.hero-copy {
		max-width: 640px;
	}

	.eyebrow {
		font-size: 0.8rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--traek-landing-text-muted-1, #8b8b8b);
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: clamp(2.4rem, 3vw + 1.6rem, 3.4rem);
		line-height: 1.05;
		margin: 0 0 1rem;
	}

	.tagline {
		font-size: 1.05rem;
		color: var(--traek-landing-text-muted-3, #c9c9c9);
		max-width: 40rem;
		margin-bottom: 1.75rem;
	}

	.hero-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 2rem;
	}

	.hero-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.85rem;
		border-radius: 999px;
		background: var(--traek-pill-bg, rgba(255, 255, 255, 0.03));
		border: 1px solid var(--traek-pill-border, rgba(255, 255, 255, 0.06));
		font-size: 0.8rem;
		color: var(--traek-landing-text-muted-5, #d9d9d9);
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--traek-accent-cyan, #00d8ff);
		box-shadow: var(--traek-shadow-dot-glow);
	}

	.hero-cta-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.9rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.7rem 1.3rem;
		border-radius: 999px;
		font-size: 0.9rem;
		text-decoration: none;
		border: 1px solid transparent;
		cursor: pointer;
		transition:
			background 0.15s ease-out,
			transform 0.1s ease-out,
			box-shadow 0.15s ease-out,
			border-color 0.15s ease-out;
	}

	.btn.primary {
		background: linear-gradient(
			135deg,
			var(--traek-accent-cyan, #00d8ff),
			var(--traek-accent-lime, #00ffa3)
		);
		color: var(--traek-bg-body, #000000);
		box-shadow: var(--traek-shadow-btn-primary);
	}

	.btn.primary:hover {
		transform: translateY(-1px);
		box-shadow: var(--traek-shadow-btn-primary-hover);
	}

	.btn.secondary {
		background: transparent;
		color: var(--traek-landing-text-muted-8, #e5e5e5);
		border-color: rgba(255, 255, 255, 0.25);
	}

	.btn.secondary:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.btn.tertiary {
		background: rgba(255, 255, 255, 0.03);
		color: var(--traek-landing-text-muted-5, #dcdcdc);
		border-color: rgba(255, 255, 255, 0.09);
	}

	.btn.tertiary:hover {
		background: rgba(255, 255, 255, 0.07);
	}

	.hero-demo {
		position: relative;
	}

	.hero-demo-label {
		font-size: 0.8rem;
		color: var(--traek-landing-text-muted-2, #a5a5a5);
		margin-bottom: 0.75rem;
	}

	.demo-frame {
		position: relative;
		height: 420px;
		border-radius: 24px;
		overflow: hidden;
		background: radial-gradient(
			circle at top left,
			var(--traek-demo-frame-bg-outer, #191919) 0,
			var(--traek-demo-frame-bg-inner, #050505) 52%,
			var(--traek-demo-frame-bg-bottom, #000000) 100%
		);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: var(--traek-shadow-demo-frame);
	}

	.demo-frame :global(.viewport) {
		height: 100%;
	}

	.demo-frame :global(.floating-input-container) {
		display: none;
	}

	.demo-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 260px;
		border-radius: 16px;
		border: 1px dashed rgba(255, 255, 255, 0.15);
		color: var(--traek-landing-text-muted-1, #8b8b8b);
		font-size: 0.9rem;
	}

	.section {
		position: relative;
		padding-block: 1rem;
	}

	.section.alt::before {
		content: '';
		position: absolute;
		inset: -10%;
		background: radial-gradient(
			circle at top right,
			var(--traek-section-alt-glow),
			transparent 60%
		);
		opacity: 0.9;
		z-index: -1;
	}

	.section-content {
		max-width: 1080px;
		margin: 0 auto;
		color: var(--traek-landing-text-muted-5, #dcdcdc);
	}

	.section h2 {
		font-size: 1.5rem;
		margin-bottom: 0.6rem;
	}

	.section p {
		font-size: 0.98rem;
		color: var(--traek-landing-text-muted-3, #c3c3c3);
		max-width: 46rem;
	}

	.section ul {
		margin: 0.8rem 0 0.4rem 1.1rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.35rem 1.4rem;
		font-size: 0.95rem;
	}

	.section li {
		color: var(--traek-landing-text-muted-6, #e0e0e0);
	}

	.punchline {
		margin-top: 0.8rem;
		color: var(--traek-landing-text-muted-9, #f0f0f0);
	}

	.section-split {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
		gap: 2rem;
		align-items: flex-start;
	}

	.section-card {
		border-radius: 18px;
		background: radial-gradient(
			circle at top left,
			var(--traek-card-bg-dark-1, #1f1f1f),
			var(--traek-card-bg-dark-2, #101010)
		);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: var(--traek-shadow-card);
		padding: 1.4rem 1.6rem;
	}

	.section-metric {
		align-self: stretch;
		border-radius: 18px;
		background: radial-gradient(
			circle at top,
			var(--traek-metric-accent),
			var(--traek-metric-bg-end)
		);
		border: 1px solid var(--traek-metric-accent-border);
		box-shadow:
			var(--traek-shadow-metric),
			0 0 40px var(--traek-metric-glow);
		padding: 1.5rem 1.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.metric-number {
		font-size: 2.4rem;
		font-weight: 600;
		letter-spacing: 0.04em;
	}

	.metric-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--traek-landing-text-muted-2, #a5a5a5);
	}

	.metric-copy {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		color: var(--traek-landing-text-muted-4, #d4d4d4);
		max-width: 22rem;
	}

	.two-column {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.1fr);
		gap: 2.5rem;
		align-items: flex-start;
	}

	.code-card {
		border-radius: 18px;
		background: radial-gradient(
			circle at top left,
			var(--traek-card-bg-dark-3, #262626),
			var(--traek-card-bg-dark-4, #111111)
		);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: var(--traek-shadow-code-card);
		padding: 1rem 1.2rem 1.1rem;
		font-size: 0.8rem;
	}

	.section--stack .section-card {
		margin-bottom: 1.2rem;
	}

	.stack-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.1fr);
		gap: 1.2rem;
		align-items: flex-start;
	}

	.stack-item {
		border-radius: 16px;
		background: var(--traek-card-bg-dark-1);
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: var(--traek-shadow-stack-item);
		padding: 1rem 1.1rem;
	}

	.stack-item--light {
		background: radial-gradient(
			circle at top left,
			var(--traek-stack-accent),
			var(--traek-stack-bg-end)
		);
		border-color: var(--traek-stack-accent-border);
	}

	.code-card-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--traek-code-label);
		margin-bottom: 0.4rem;
	}
	.final {
		padding-top: 0.5rem;
	}

	.final-inner {
		text-align: center;
		max-width: 720px;
	}

	.final-inner h2 {
		font-size: 1.7rem;
		margin-bottom: 0.6rem;
	}

	.final-inner p {
		margin-bottom: 1.4rem;
		color: var(--traek-final-muted);
	}

	@media (max-width: 900px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
		}

		.demo-frame {
			height: 360px;
		}

		.two-column,
		.stack-grid,
		.section-split {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 640px) {
		.landing {
			padding-inline: 1.5rem;
		}

		.hero-cta-row {
			flex-direction: column;
			align-items: stretch;
		}

		.hero-grid {
			gap: 0.5rem;
		}

		.demo-frame {
			height: 320px;
		}
	}
</style>
