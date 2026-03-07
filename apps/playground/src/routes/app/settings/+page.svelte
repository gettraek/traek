<script lang="ts">
	let openaiKey = $state('');
	let anthropicKey = $state('');
	let saving = $state<Record<string, boolean>>({});
	let saved = $state<Record<string, boolean>>({});
	let errors = $state<Record<string, string>>({});

	async function saveKey(provider: 'openai' | 'anthropic') {
		const key = provider === 'openai' ? openaiKey : anthropicKey;
		if (!key.trim()) return;
		saving[provider] = true;
		errors[provider] = '';
		try {
			const res = await fetch('/api/keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider, key: key.trim() })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errors[provider] = body.error ?? 'Failed to save';
			} else {
				saved[provider] = true;
				if (provider === 'openai') openaiKey = '';
				else anthropicKey = '';
				setTimeout(() => (saved[provider] = false), 2000);
			}
		} catch {
			errors[provider] = 'Network error';
		} finally {
			saving[provider] = false;
		}
	}

	async function deleteKey(provider: 'openai' | 'anthropic') {
		const res = await fetch('/api/keys', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ provider })
		});
		if (res.ok) saved[provider] = false;
	}

	async function manageSubscription() {
		const res = await fetch('/api/stripe/portal', { method: 'POST' });
		if (res.ok) {
			const { url } = await res.json();
			window.location.href = url;
		}
	}

	async function upgrade() {
		const res = await fetch('/api/stripe/checkout', { method: 'POST' });
		if (res.ok) {
			const { url } = await res.json();
			window.location.href = url;
		}
	}
</script>

<svelte:head>
	<title>Settings — Traek Playground</title>
</svelte:head>

<div class="settings-layout">
	<header class="settings-header">
		<a href="/app" class="back">← Back</a>
		<h1>Settings</h1>
	</header>

	<section class="section">
		<h2>API Keys</h2>
		<p class="section-desc">
			Your keys are encrypted with AES-256 before storage and never returned to the client.
		</p>

		<div class="key-row">
			<label for="openai-key">OpenAI API Key</label>
			<div class="key-input-row">
				<input
					type="password"
					id="openai-key"
					bind:value={openaiKey}
					placeholder="sk-..."
					autocomplete="off"
					spellcheck={false}
				/>
				<button
					class="btn btn-primary"
					onclick={() => saveKey('openai')}
					disabled={saving.openai || !openaiKey.trim()}
				>
					{saving.openai ? 'Saving...' : saved.openai ? 'Saved ✓' : 'Save'}
				</button>
				<button class="btn btn-outline btn-danger" onclick={() => deleteKey('openai')}>
					Remove
				</button>
			</div>
			{#if errors.openai}
				<p class="error">{errors.openai}</p>
			{/if}
		</div>

		<div class="key-row">
			<label for="anthropic-key">Anthropic API Key</label>
			<div class="key-input-row">
				<input
					type="password"
					id="anthropic-key"
					bind:value={anthropicKey}
					placeholder="sk-ant-..."
					autocomplete="off"
					spellcheck={false}
				/>
				<button
					class="btn btn-primary"
					onclick={() => saveKey('anthropic')}
					disabled={saving.anthropic || !anthropicKey.trim()}
				>
					{saving.anthropic ? 'Saving...' : saved.anthropic ? 'Saved ✓' : 'Save'}
				</button>
				<button class="btn btn-outline btn-danger" onclick={() => deleteKey('anthropic')}>
					Remove
				</button>
			</div>
			{#if errors.anthropic}
				<p class="error">{errors.anthropic}</p>
			{/if}
		</div>
	</section>

	<section class="section">
		<h2>Subscription</h2>
		<p class="section-desc">Manage your plan and billing.</p>
		<div class="plan-actions">
			<button class="btn btn-primary" onclick={upgrade}>Upgrade to Pro — $12/mo</button>
			<button class="btn btn-outline" onclick={manageSubscription}>Manage billing</button>
		</div>
	</section>

	<section class="section danger-zone">
		<h2>Account</h2>
		<form method="POST" action="/auth/signout">
			<button type="submit" class="btn btn-outline btn-danger">Sign out</button>
		</form>
	</section>
</div>

<style>
	.settings-layout {
		max-width: 640px;
		margin: 0 auto;
		padding: 40px 24px;
		display: flex;
		flex-direction: column;
		gap: 40px;
	}

	.settings-header {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.back {
		font-size: 0.85rem;
		color: var(--pg-text-muted);
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.03em;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.section-desc {
		font-size: 0.875rem;
		color: var(--pg-text-muted);
		margin-top: -8px;
		line-height: 1.5;
	}

	.key-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--pg-text-muted);
	}

	.key-input-row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	input {
		flex: 1;
		padding: 10px 14px;
		background: var(--pg-surface);
		border: 1px solid var(--pg-border);
		border-radius: var(--pg-radius);
		color: var(--pg-text);
		font-size: 0.875rem;
		outline: none;
		font-family: monospace;
	}

	input:focus {
		border-color: var(--pg-accent);
	}

	.btn {
		padding: 10px 16px;
		border-radius: var(--pg-radius);
		font-size: 0.875rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s;
	}

	.btn-primary {
		background: var(--pg-accent);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--pg-accent-hover);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-outline {
		background: transparent;
		color: var(--pg-text);
		border: 1px solid var(--pg-border);
	}

	.btn-outline:hover {
		border-color: var(--pg-text-muted);
	}

	.btn-danger {
		color: var(--pg-danger);
		border-color: color-mix(in srgb, var(--pg-danger) 30%, transparent);
	}

	.btn-danger:hover {
		border-color: var(--pg-danger);
	}

	.error {
		font-size: 0.8rem;
		color: var(--pg-danger);
	}

	.plan-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.danger-zone {
		border-top: 1px solid var(--pg-border);
		padding-top: 40px;
	}
</style>
