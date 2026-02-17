<script lang="ts">
	import {
		markdownToHtml,
		useTheme,
		DEFAULT_TRACK_ENGINE_CONFIG,
		TraekCanvas,
		DefaultLoadingOverlay,
		createDefaultRegistry
	} from 'traek';
	import { createHeroEngine } from '$lib/heroDemoEngine';
	import GravityDotsBackground from '$lib/components/GravityDotsBackground.svelte';
	import highlightDarkUrl from 'highlight.js/styles/github-dark.css?url';
	import highlightLightUrl from 'highlight.js/styles/github.css?url';
	import { resolve } from '$app/paths';

	const themeContext = useTheme();
	const currentTheme = $derived(themeContext.currentThemeName());

	// Read-only hero demo: pre-seeded engine, no user interaction
	const heroEngine = createHeroEngine(DEFAULT_TRACK_ENGINE_CONFIG);
	const heroRegistry = createDefaultRegistry();

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
			<p class="tagline">Every answer opens more questions. Give them space.</p>

			<div class="hero-grid">
				<div class="hero-pill">
					<span class="dot"></span> What if you'd asked it differently?
				</div>
				<div class="hero-pill">
					<span class="dot"></span> See where the thinking went.
				</div>
				<div class="hero-pill">
					<span class="dot"></span> Watch ideas grow in real time.
				</div>
			</div>

			<div class="hero-cta-row">
				<a href={resolve('/demo')} class="btn primary" data-umami-event="landing-cta-demo"
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
			<div class="hero-demo-label">see it branch</div>
			<div class="demo-frame">
				{#if heroEngine}
					<TraekCanvas
						engine={heroEngine}
						config={DEFAULT_TRACK_ENGINE_CONFIG}
						registry={heroRegistry}
						showStats={false}
						breadcrumbMinNodes={999}
						minimapMinNodes={999}
						tourDelay={-1}
						initialScale={0.85}
					>
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
				<h2>Something always gets lost in the scroll.</h2>
				<p>
					A good idea came up three replies ago. You scrolled past it. Two paths split. You had to
					choose. That's not a conversation — that's a log.
				</p>
				<p>The more complex the thinking, the worse a single thread represents it.</p>
				<p class="punchline">
					<strong>If AI thinking branches, your UI shouldn’t stay flat.</strong>
				</p>
			</div>

			<div class="section-metric">
				<div class="metric-number">∞</div>
				<p class="metric-label">possible paths</p>
				<p class="metric-copy">
					Not an edge case. Not an afterthought.<br />Branching is the default.
				</p>
			</div>
		</div>
	</section>

	<section class="section alt">
		<div class="section-content two-column">
			<div>
				<h2>A map, not a log.</h2>
				<p>
					Every message is a place. Every reply, a direction. Pan the canvas. Follow a thread.
					Branch into the question you almost didn't ask.
				</p>
				<ul>
					<li>
						<strong>Branch anywhere</strong> — reply from any node; each path stays intact.
					</li>
					<li>
						<strong>Spatial layout</strong> — ideas spread out instead of stacking up.
					</li>
					<li>
						<strong>Thought nodes</strong> — reasoning stays visible without cluttering the path.
					</li>
					<li>
						<strong>Live streaming</strong> — watch tokens land in place as the model thinks.
					</li>
				</ul>
			</div>

			<div class="code-card">
				<div class="code-card-label">Two components. That's it.</div>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html renderedContent}
			</div>
		</div>
	</section>

	<section class="section section--stack">
		<div class="section-content two-column">
			<div class="section-card">
				<h2>Two layers. Your rules.</h2>
				<p>træk keeps the graph and the UI separate — so you stay in control:</p>
				<ul>
					<li><strong>TraekEngine</strong> — nodes, relationships, layout, and state.</li>
					<li><strong>TraekCanvas</strong> — the spatial UI, pan/zoom, and interaction.</li>
				</ul>
				<p>Bring your model, your streaming, your persistence. træk keeps everything navigable.</p>
			</div>

			<div class="stack-grid">
				<div class="stack-item">
					<h3>Made for when AI thinks out loud.</h3>
					<ul>
						<li>agents with memory</li>
						<li>prompts worth exploring</li>
						<li>reasoning that branches</li>
						<li>multi-path generation</li>
					</ul>
				</div>
				<div class="stack-item stack-item--light">
					<h3>Start in minutes.</h3>
					<p>
						Use TraekCanvas as your full UI — or wire TraekEngine into your own components and
						render messages your way.
					</p>
				</div>
			</div>
		</div>
	</section>

	<section class="section final">
		<div class="section-content final-inner">
			<h2>Ideas deserve more space than a scroll.</h2>
			<p>
				træk is actively growing. Drop it in, explore the demos, and help shape what spatial AI
				conversation can be.
			</p>
			<div class="hero-cta-row">
				<a href={resolve('/demo')} class="btn primary" data-umami-event="landing-cta-demo-bottom"
					>Open interactive demo</a
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

	.demo-frame :global(.floating-input-container),
	.demo-frame :global(.zoom-controls),
	.demo-frame :global(.toast-container) {
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
