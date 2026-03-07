<script lang="ts">
	import type { LayoutData } from './$types.js';

	let { data }: { data: LayoutData } = $props();

	let email = $state('');
	let waitlistStatus = $state<'idle' | 'loading' | 'done' | 'error'>('idle');
	let waitlistError = $state('');

	async function joinWaitlist(e: SubmitEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		waitlistStatus = 'loading';
		try {
			const res = await fetch('/api/waitlist', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim() })
			});
			if (res.ok) {
				waitlistStatus = 'done';
			} else {
				const d = (await res.json().catch(() => ({}))) as { error?: string };
				waitlistError = d.error ?? 'Something went wrong.';
				waitlistStatus = 'error';
			}
		} catch {
			waitlistError = 'Network error. Please try again.';
			waitlistStatus = 'error';
		}
	}
</script>

<svelte:head>
	<title>træk Playground — Spatial AI conversations</title>
</svelte:head>

<div class="page">
	<!-- Navigation -->
	<nav class="nav">
		<a class="logo" href="/">
			<span class="logo-main">træk</span>
			<span class="logo-sub">Playground</span>
		</a>
		<div class="nav-links">
			<a href="https://docs.gettraek.com" class="nav-link" rel="noreferrer" target="_blank">Docs</a>
			<a href="https://github.com/gettraek/traek" class="nav-link" rel="noreferrer" target="_blank"
				>GitHub</a
			>
			{#if data.user}
				<a href="/app" class="btn btn-primary btn-sm">Open App</a>
			{:else}
				<a href="/auth/signin" class="btn btn-primary btn-sm">Sign in</a>
			{/if}
		</div>
	</nav>

	<!-- Hero -->
	<section class="hero">
		<div class="hero-content">
			<div class="hero-eyebrow">
				<span class="eyebrow-dot" aria-hidden="true"></span>
				Spatial AI Canvas
			</div>

			<h1>
				Follow ideas,<br />
				not<span class="h1-accent"> threads.</span>
			</h1>

			<p class="hero-sub">
				A hosted environment for branching, comparing, and sharing AI conversations. Bring your own
				key — start in seconds.
			</p>

			{#if data.user}
				<div class="hero-actions">
					<a href="/app" class="btn btn-primary btn-large">Open Playground</a>
				</div>
			{:else}
				<div class="hero-actions">
					<a href="/auth/signin" class="btn btn-primary btn-large">Start for free</a>
					<a href="/auth/signin" class="btn btn-ghost btn-large">Sign in</a>
				</div>
				<p class="hero-note">No credit card required &middot; 5 conversations free</p>
			{/if}

			<div class="hero-pills">
				<span class="pill">Branch anywhere</span>
				<span class="pill">Pan & zoom canvas</span>
				<span class="pill">Share links</span>
				<span class="pill">BYOK</span>
			</div>
		</div>

		<div class="hero-visual" aria-hidden="true">
			<!-- Animated branching graph illustration -->
			<svg class="graph-svg" viewBox="0 0 420 340" fill="none" xmlns="http://www.w3.org/2000/svg">
				<!-- Connection lines -->
				<path
					class="conn"
					d="M210 60 L210 100"
					stroke="rgba(0,216,255,0.3)"
					stroke-width="1.5"
					stroke-dasharray="6 4"
				/>
				<path
					class="conn conn-1"
					d="M210 140 L110 190"
					stroke="rgba(0,216,255,0.25)"
					stroke-width="1.5"
					stroke-dasharray="6 4"
				/>
				<path
					class="conn conn-2"
					d="M210 140 L310 190"
					stroke="rgba(0,216,255,0.25)"
					stroke-width="1.5"
					stroke-dasharray="6 4"
				/>
				<path
					class="conn conn-3"
					d="M110 230 L60 280"
					stroke="rgba(0,216,255,0.18)"
					stroke-width="1.5"
					stroke-dasharray="5 5"
				/>
				<path
					class="conn conn-4"
					d="M110 230 L160 280"
					stroke="rgba(0,216,255,0.18)"
					stroke-width="1.5"
					stroke-dasharray="5 5"
				/>
				<path
					class="conn conn-5"
					d="M310 230 L260 280"
					stroke="rgba(0,255,163,0.18)"
					stroke-width="1.5"
					stroke-dasharray="5 5"
				/>
				<path
					class="conn conn-6"
					d="M310 230 L360 280"
					stroke="rgba(0,255,163,0.18)"
					stroke-width="1.5"
					stroke-dasharray="5 5"
				/>

				<!-- Root node -->
				<rect
					class="node node-root"
					x="162"
					y="20"
					width="96"
					height="40"
					rx="10"
					fill="#161616"
					stroke="rgba(0,216,255,0.6)"
					stroke-width="1.5"
				/>
				<rect x="172" y="32" width="56" height="6" rx="3" fill="rgba(0,216,255,0.4)" />
				<rect x="172" y="42" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.12)" />

				<!-- Middle left node -->
				<rect
					class="node node-left"
					x="62"
					y="100"
					width="96"
					height="40"
					rx="10"
					fill="#161616"
					stroke="rgba(255,255,255,0.12)"
					stroke-width="1.5"
				/>
				<rect x="72" y="112" width="50" height="6" rx="3" fill="rgba(255,255,255,0.25)" />
				<rect x="72" y="122" width="36" height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />

				<!-- Middle right node (active) -->
				<rect
					class="node node-right"
					x="262"
					y="100"
					width="96"
					height="40"
					rx="10"
					fill="#161616"
					stroke="rgba(0,255,163,0.5)"
					stroke-width="1.5"
				/>
				<rect x="272" y="112" width="50" height="6" rx="3" fill="rgba(0,255,163,0.35)" />
				<rect x="272" y="122" width="36" height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />

				<!-- Leaf nodes -->
				<rect
					class="node node-leaf"
					x="22"
					y="195"
					width="76"
					height="35"
					rx="8"
					fill="#111"
					stroke="rgba(255,255,255,0.08)"
					stroke-width="1"
				/>
				<rect x="30" y="206" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.18)" />
				<rect x="30" y="214" width="28" height="4" rx="2" fill="rgba(255,255,255,0.08)" />

				<rect
					class="node node-leaf"
					x="110"
					y="195"
					width="76"
					height="35"
					rx="8"
					fill="#111"
					stroke="rgba(255,255,255,0.08)"
					stroke-width="1"
				/>
				<rect x="118" y="206" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.18)" />
				<rect x="118" y="214" width="28" height="4" rx="2" fill="rgba(255,255,255,0.08)" />

				<rect
					class="node node-leaf"
					x="222"
					y="195"
					width="76"
					height="35"
					rx="8"
					fill="#111"
					stroke="rgba(0,255,163,0.25)"
					stroke-width="1"
				/>
				<rect x="230" y="206" width="40" height="5" rx="2.5" fill="rgba(0,255,163,0.2)" />
				<rect x="230" y="214" width="28" height="4" rx="2" fill="rgba(255,255,255,0.08)" />

				<rect
					class="node node-leaf"
					x="310"
					y="195"
					width="76"
					height="35"
					rx="8"
					fill="#111"
					stroke="rgba(0,255,163,0.25)"
					stroke-width="1"
				/>
				<rect x="318" y="206" width="40" height="5" rx="2.5" fill="rgba(0,255,163,0.2)" />
				<rect x="318" y="214" width="28" height="4" rx="2" fill="rgba(255,255,255,0.08)" />

				<!-- Deep leaf nodes -->
				<rect
					x="30"
					y="250"
					width="60"
					height="30"
					rx="7"
					fill="#0d0d0d"
					stroke="rgba(255,255,255,0.05)"
					stroke-width="1"
				/>
				<rect x="37" y="260" width="34" height="4" rx="2" fill="rgba(255,255,255,0.12)" />

				<rect
					x="118"
					y="250"
					width="60"
					height="30"
					rx="7"
					fill="#0d0d0d"
					stroke="rgba(255,255,255,0.05)"
					stroke-width="1"
				/>
				<rect x="125" y="260" width="34" height="4" rx="2" fill="rgba(255,255,255,0.12)" />

				<rect
					x="226"
					y="250"
					width="60"
					height="30"
					rx="7"
					fill="#0d0d0d"
					stroke="rgba(0,255,163,0.15)"
					stroke-width="1"
				/>
				<rect x="233" y="260" width="34" height="4" rx="2" fill="rgba(0,255,163,0.15)" />

				<rect
					x="318"
					y="250"
					width="60"
					height="30"
					rx="7"
					fill="#0d0d0d"
					stroke="rgba(0,255,163,0.15)"
					stroke-width="1"
				/>
				<rect x="325" y="260" width="34" height="4" rx="2" fill="rgba(0,255,163,0.15)" />

				<!-- Glow behind root -->
				<ellipse cx="210" cy="40" rx="80" ry="30" fill="rgba(0,216,255,0.04)" class="glow-root" />
			</svg>
		</div>
	</section>

	<!-- Features -->
	<section class="features">
		<div class="section-eyebrow">What you get</div>
		<h2 class="section-title">Built for the way AI actually thinks.</h2>

		<div class="feature-grid">
			<div class="feature-card">
				<div class="feature-icon">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="6" y1="3" x2="6" y2="15" />
						<circle cx="18" cy="6" r="3" />
						<circle cx="6" cy="18" r="3" />
						<path d="M18 9a9 9 0 0 1-9 9" />
					</svg>
				</div>
				<h3>Branch anywhere</h3>
				<p>
					Fork a conversation from any node. Explore alternative framings without losing your
					thread.
				</p>
			</div>

			<div class="feature-card">
				<div class="feature-icon">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="8" cy="12" r="3" />
						<circle cx="20" cy="8" r="3" />
						<circle cx="20" cy="16" r="3" />
						<path d="M10.7 11.1L17.3 8.9M10.7 12.9L17.3 15.1" />
					</svg>
				</div>
				<h3>Compare branches</h3>
				<p>Run the same prompt two ways and see the responses side by side on the canvas.</p>
			</div>

			<div class="feature-card">
				<div class="feature-icon">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
					</svg>
				</div>
				<h3>Share instantly</h3>
				<p>
					Public read-only links to any conversation or branch. One click to share your thinking.
				</p>
			</div>

			<div class="feature-card">
				<div class="feature-icon">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
				</div>
				<h3>Your key, your data</h3>
				<p>
					Use your OpenAI or Anthropic API key. Encrypted at rest. Your conversations stay private.
				</p>
			</div>

			<div class="feature-card">
				<div class="feature-icon">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
					</svg>
				</div>
				<h3>Thought nodes</h3>
				<p>Model reasoning stays visible in collapsible panels — never buried, never in the way.</p>
			</div>

			<div class="feature-card">
				<div class="feature-icon">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="7 10 12 15 17 10" />
						<line x1="12" y1="15" x2="12" y2="3" />
					</svg>
				</div>
				<h3>Export anywhere</h3>
				<p>Download any conversation as Markdown or JSON. Your work, fully portable.</p>
			</div>
		</div>
	</section>

	<!-- Pricing -->
	<section class="pricing">
		<div class="section-eyebrow">Pricing</div>
		<h2 class="section-title">Simple, transparent.</h2>
		<p class="section-sub">
			All plans include the full canvas experience. Upgrade for cloud sync and sharing.
		</p>

		<div class="plans-grid">
			<div class="plan-card">
				<div class="plan-header">
					<span class="plan-name">Free</span>
					<div class="plan-price">
						<span class="price-amount">$0</span>
					</div>
				</div>
				<ul class="plan-features">
					<li>5 saved conversations</li>
					<li>Local browser storage</li>
					<li>Full canvas features</li>
					<li>OpenAI &amp; Anthropic BYOK</li>
				</ul>
				{#if data.user}
					<a href="/app" class="btn btn-outline plan-cta">Open App</a>
				{:else}
					<a href="/auth/signin" class="btn btn-outline plan-cta">Get started</a>
				{/if}
			</div>

			<div class="plan-card plan-featured">
				<div class="plan-badge">Most popular</div>
				<div class="plan-header">
					<span class="plan-name">Pro</span>
					<div class="plan-price">
						<span class="price-amount">$12</span>
						<span class="price-period">/mo</span>
					</div>
				</div>
				<ul class="plan-features">
					<li>Unlimited conversations</li>
					<li>Cloud sync &amp; backup</li>
					<li>Read-only sharing links</li>
					<li>Markdown &amp; JSON export</li>
					<li>Priority model access</li>
				</ul>
				{#if data.user}
					<a href="/app/settings" class="btn btn-primary plan-cta">Upgrade to Pro</a>
				{:else}
					<a href="/auth/signin" class="btn btn-primary plan-cta">Start free trial</a>
				{/if}
			</div>

			<div class="plan-card">
				<div class="plan-header">
					<span class="plan-name">Team</span>
					<div class="plan-price">
						<span class="price-amount">$29</span>
						<span class="price-period">/seat/mo</span>
					</div>
				</div>
				<ul class="plan-features">
					<li>Everything in Pro</li>
					<li>Shared workspaces</li>
					<li>Team conversation library</li>
					<li>Admin controls</li>
					<li>Priority support</li>
				</ul>
				<a href="mailto:hello@gettraek.com" class="btn btn-outline plan-cta">Contact us</a>
			</div>
		</div>
	</section>

	<!-- Waitlist CTA -->
	<section class="waitlist-section">
		<div class="waitlist-inner">
			<div class="waitlist-copy">
				<h2>Get early access.</h2>
				<p>Playground is launching soon. Join the list and we'll reach out when it's ready.</p>
			</div>

			{#if waitlistStatus === 'done'}
				<div class="waitlist-success">
					<span class="success-dot" aria-hidden="true"></span>
					You're on the list. We'll be in touch.
				</div>
			{:else}
				<form class="waitlist-form" onsubmit={joinWaitlist}>
					<input
						class="waitlist-input"
						type="email"
						bind:value={email}
						placeholder="you@company.com"
						required
						aria-label="Email address"
						disabled={waitlistStatus === 'loading'}
					/>
					<button type="submit" class="btn btn-primary" disabled={waitlistStatus === 'loading'}>
						{waitlistStatus === 'loading' ? 'Joining…' : 'Join waitlist'}
					</button>
				</form>
				{#if waitlistStatus === 'error'}
					<p class="waitlist-error">{waitlistError}</p>
				{/if}
			{/if}
		</div>
	</section>

	<!-- Footer -->
	<footer class="footer">
		<span class="footer-brand">
			<span class="footer-logo">træk</span>
			<span class="footer-sep">/</span>
			Playground
		</span>
		<nav class="footer-links" aria-label="Footer navigation">
			<a href="https://gettraek.com" rel="noreferrer" target="_blank">Library</a>
			<a href="https://docs.gettraek.com" rel="noreferrer" target="_blank">Docs</a>
			<a href="https://github.com/gettraek/traek" rel="noreferrer" target="_blank">GitHub</a>
			<a href="mailto:hello@gettraek.com">Contact</a>
		</nav>
		<span class="footer-copy">© 2026 Traek</span>
	</footer>
</div>

<style>
	/* ------------------------------------------------------------------ */
	/* Page shell                                                           */
	/* ------------------------------------------------------------------ */
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ------------------------------------------------------------------ */
	/* Navigation                                                           */
	/* ------------------------------------------------------------------ */
	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem max(5vw, 1.5rem);
		border-bottom: 1px solid var(--pg-border);
		position: sticky;
		top: 0;
		z-index: 100;
		background: rgba(8, 8, 8, 0.85);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
	}

	:global([data-theme='light']) .nav {
		background: rgba(248, 248, 248, 0.88);
	}

	.logo {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		text-decoration: none;
	}

	.logo-main {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--pg-text);
	}

	.logo-sub {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--pg-text-muted);
		letter-spacing: 0.02em;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.nav-link {
		padding: 0.4rem 0.65rem;
		font-size: 0.85rem;
		color: var(--pg-text-secondary);
		text-decoration: none;
		border-radius: 7px;
		transition:
			color 0.15s,
			background 0.15s;
	}

	.nav-link:hover {
		color: var(--pg-text);
		background: rgba(255, 255, 255, 0.06);
	}

	:global([data-theme='light']) .nav-link:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	/* ------------------------------------------------------------------ */
	/* Buttons                                                              */
	/* ------------------------------------------------------------------ */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.6rem 1.2rem;
		border-radius: 999px;
		font-size: 0.88rem;
		font-weight: 600;
		text-decoration: none;
		border: 1px solid transparent;
		cursor: pointer;
		font-family: inherit;
		transition:
			background 0.15s,
			transform 0.1s,
			box-shadow 0.15s,
			border-color 0.15s;
	}

	.btn:focus-visible {
		outline: 2px solid var(--pg-cyan);
		outline-offset: 2px;
	}

	.btn-primary {
		background: var(--pg-gradient);
		color: #000;
		box-shadow: var(--pg-shadow-btn);
	}

	.btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: var(--pg-shadow-btn-hover);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.btn-ghost {
		background: transparent;
		color: var(--pg-text-secondary);
		border-color: var(--pg-border-strong);
	}

	.btn-ghost:hover {
		background: rgba(255, 255, 255, 0.06);
		color: var(--pg-text);
	}

	:global([data-theme='light']) .btn-ghost:hover {
		background: rgba(0, 0, 0, 0.06);
	}

	.btn-outline {
		background: transparent;
		color: var(--pg-text);
		border-color: var(--pg-border-strong);
	}

	.btn-outline:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.25);
	}

	:global([data-theme='light']) .btn-outline:hover {
		background: rgba(0, 0, 0, 0.04);
		border-color: rgba(0, 0, 0, 0.2);
	}

	.btn-sm {
		padding: 0.4rem 0.9rem;
		font-size: 0.82rem;
		border-radius: 7px;
	}

	.btn-large {
		padding: 0.75rem 1.8rem;
		font-size: 0.95rem;
	}

	/* ------------------------------------------------------------------ */
	/* Section shared                                                       */
	/* ------------------------------------------------------------------ */
	.section-eyebrow {
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--pg-cyan);
		margin-bottom: 0.75rem;
	}

	.section-title {
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.15;
		margin-bottom: 0.75rem;
		color: var(--pg-text);
	}

	.section-sub {
		font-size: 1rem;
		color: var(--pg-text-secondary);
		max-width: 42rem;
		line-height: 1.55;
	}

	/* ------------------------------------------------------------------ */
	/* Hero                                                                 */
	/* ------------------------------------------------------------------ */
	.hero {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 3rem;
		padding: 5rem max(5vw, 1.5rem) 4rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}

	.hero-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pg-cyan);
		margin-bottom: 1.25rem;
	}

	.eyebrow-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--pg-cyan);
		box-shadow: 0 0 8px rgba(0, 216, 255, 0.6);
		animation: dot-pulse 2.5s ease-in-out infinite;
	}

	@keyframes dot-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}

	h1 {
		font-size: clamp(2.6rem, 4.5vw, 3.8rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		line-height: 1.05;
		margin: 0 0 1.25rem;
		color: var(--pg-text-strong);
	}

	.h1-accent {
		background: var(--pg-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-sub {
		font-size: 1.05rem;
		color: var(--pg-text-secondary);
		line-height: 1.6;
		max-width: 38rem;
		margin-bottom: 2rem;
	}

	.hero-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 0.75rem;
	}

	.hero-note {
		font-size: 0.8rem;
		color: var(--pg-text-muted);
		margin-bottom: 1.5rem;
	}

	.hero-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pill {
		display: inline-flex;
		padding: 0.25rem 0.7rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 500;
		background: var(--pg-cyan-soft);
		border: 1px solid var(--pg-cyan-border);
		color: var(--pg-cyan);
	}

	/* Hero SVG illustration */
	.hero-visual {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.graph-svg {
		width: 100%;
		max-width: 420px;
		height: auto;
	}

	.node {
		animation: node-float 4s ease-in-out infinite;
	}

	.node-root {
		animation-delay: 0s;
	}

	.node-left {
		animation-delay: 0.6s;
	}

	.node-right {
		animation-delay: 1.2s;
	}

	.node-leaf {
		animation-delay: 1.8s;
	}

	@keyframes node-float {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}

	.conn {
		stroke-dashoffset: 0;
		animation: dash-flow 3s linear infinite;
	}

	.conn-1 {
		animation-delay: 0.3s;
	}
	.conn-2 {
		animation-delay: 0.6s;
	}
	.conn-3 {
		animation-delay: 0.9s;
	}
	.conn-4 {
		animation-delay: 1.2s;
	}
	.conn-5 {
		animation-delay: 1.5s;
	}
	.conn-6 {
		animation-delay: 1.8s;
	}

	@keyframes dash-flow {
		to {
			stroke-dashoffset: -40;
		}
	}

	.glow-root {
		animation: glow-pulse 3s ease-in-out infinite;
	}

	@keyframes glow-pulse {
		0%,
		100% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
	}

	/* ------------------------------------------------------------------ */
	/* Features                                                             */
	/* ------------------------------------------------------------------ */
	.features {
		padding: 5rem max(5vw, 1.5rem);
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
		border-top: 1px solid var(--pg-border);
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		margin-top: 2.5rem;
	}

	.feature-card {
		padding: 1.5rem;
		background: var(--pg-bg-card);
		border: 1px solid var(--pg-border);
		border-radius: 16px;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.feature-card:hover {
		border-color: var(--pg-border-cyan);
		background: var(--pg-bg-card-hover);
	}

	.feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--pg-cyan-soft);
		color: var(--pg-cyan);
		margin-bottom: 1rem;
	}

	.feature-card h3 {
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin-bottom: 0.5rem;
		color: var(--pg-text);
	}

	.feature-card p {
		font-size: 0.875rem;
		color: var(--pg-text-secondary);
		line-height: 1.55;
		margin: 0;
	}

	/* ------------------------------------------------------------------ */
	/* Pricing                                                              */
	/* ------------------------------------------------------------------ */
	.pricing {
		padding: 5rem max(5vw, 1.5rem);
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
		border-top: 1px solid var(--pg-border);
	}

	.plans-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		margin-top: 2.5rem;
		align-items: start;
	}

	.plan-card {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.75rem;
		background: var(--pg-bg-card);
		border: 1px solid var(--pg-border);
		border-radius: 18px;
		position: relative;
	}

	.plan-featured {
		border-color: var(--pg-border-cyan);
		background: radial-gradient(circle at top left, rgba(0, 216, 255, 0.06), var(--pg-bg-card) 70%);
		box-shadow: var(--pg-shadow-glow);
	}

	.plan-badge {
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--pg-gradient);
		color: #000;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.2rem 0.7rem;
		border-radius: 999px;
		white-space: nowrap;
	}

	.plan-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.plan-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--pg-text);
	}

	.plan-price {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
	}

	.price-amount {
		font-size: 1.75rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		color: var(--pg-text-strong);
	}

	.price-period {
		font-size: 0.8rem;
		color: var(--pg-text-muted);
	}

	.plan-features {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		flex: 1;
	}

	.plan-features li {
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--pg-text-secondary);
		padding-left: 1.2rem;
		position: relative;
	}

	.plan-features li::before {
		content: '✓';
		position: absolute;
		left: 0;
		color: var(--pg-cyan);
		font-weight: 700;
	}

	.plan-cta {
		width: 100%;
		margin-top: 0.25rem;
	}

	/* ------------------------------------------------------------------ */
	/* Waitlist                                                             */
	/* ------------------------------------------------------------------ */
	.waitlist-section {
		margin: 0 max(5vw, 1.5rem);
		margin-bottom: 5rem;
		border-radius: 24px;
		background: radial-gradient(
			ellipse at top left,
			rgba(0, 216, 255, 0.1) 0%,
			rgba(0, 255, 163, 0.04) 50%,
			transparent 70%
		);
		border: 1px solid var(--pg-border-cyan);
		padding: 3.5rem 2.5rem;
	}

	.waitlist-inner {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		gap: 3rem;
		flex-wrap: wrap;
	}

	.waitlist-copy {
		flex: 1;
		min-width: 200px;
	}

	.waitlist-copy h2 {
		font-size: 1.8rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		margin-bottom: 0.5rem;
		color: var(--pg-text-strong);
	}

	.waitlist-copy p {
		font-size: 0.95rem;
		color: var(--pg-text-secondary);
		line-height: 1.55;
		margin: 0;
	}

	.waitlist-form {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.waitlist-input {
		padding: 0.65rem 1.1rem;
		border-radius: 999px;
		background: var(--pg-bg-input);
		border: 1px solid var(--pg-border-strong);
		color: var(--pg-text);
		font-family: inherit;
		font-size: 0.9rem;
		min-width: 220px;
		outline: none;
		transition: border-color 0.15s;
	}

	.waitlist-input:focus {
		border-color: var(--pg-cyan);
	}

	.waitlist-input:disabled {
		opacity: 0.5;
	}

	.waitlist-input::placeholder {
		color: var(--pg-text-muted);
	}

	.waitlist-success {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.95rem;
		color: var(--pg-lime);
		font-weight: 500;
	}

	.success-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--pg-lime);
		box-shadow: 0 0 10px rgba(0, 255, 163, 0.5);
		flex-shrink: 0;
	}

	.waitlist-error {
		margin-top: 0.5rem;
		font-size: 0.82rem;
		color: #ff6b6b;
	}

	/* ------------------------------------------------------------------ */
	/* Footer                                                               */
	/* ------------------------------------------------------------------ */
	.footer {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		flex-wrap: wrap;
		padding: 1.5rem max(5vw, 1.5rem) 2rem;
		border-top: 1px solid var(--pg-border);
		font-size: 0.83rem;
		margin-top: auto;
	}

	.footer-brand {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--pg-text-secondary);
	}

	.footer-logo {
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--pg-text);
	}

	.footer-sep {
		color: var(--pg-text-muted);
	}

	.footer-links {
		display: flex;
		gap: 1rem;
		margin-right: auto;
	}

	.footer-links a {
		color: var(--pg-text-secondary);
		text-decoration: none;
		transition: color 0.15s;
	}

	.footer-links a:hover {
		color: var(--pg-text);
	}

	.footer-copy {
		color: var(--pg-text-muted);
		margin-left: auto;
	}

	/* ------------------------------------------------------------------ */
	/* Responsive                                                           */
	/* ------------------------------------------------------------------ */
	@media (max-width: 900px) {
		.hero {
			grid-template-columns: 1fr;
			padding-top: 3rem;
		}

		.hero-visual {
			order: -1;
		}

		.graph-svg {
			max-width: 320px;
		}

		.feature-grid,
		.plans-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.hero {
			padding-inline: 1.25rem;
		}

		.features,
		.pricing {
			padding-inline: 1.25rem;
		}

		.waitlist-section {
			margin-inline: 1.25rem;
			padding: 2rem 1.5rem;
		}

		.waitlist-inner {
			flex-direction: column;
			gap: 1.5rem;
		}

		.waitlist-form {
			flex-direction: column;
		}

		.waitlist-input {
			min-width: unset;
			width: 100%;
		}

		.hero-actions {
			flex-direction: column;
		}

		.footer {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.footer-copy {
			margin-left: 0;
		}

		h1 {
			font-size: 2.4rem;
		}
	}
</style>
