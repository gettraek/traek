<script lang="ts">
	let email = $state('');
	let status = $state<'idle' | 'loading' | 'sent' | 'error'>('idle');
	let errorMsg = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		status = 'loading';
		errorMsg = '';
		try {
			const res = await fetch('/api/auth/magic-link', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body.error ?? 'Something went wrong';
				status = 'error';
			} else {
				status = 'sent';
			}
		} catch {
			errorMsg = 'Network error — please try again';
			status = 'error';
		}
	}
</script>

<svelte:head>
	<title>Sign in — Traek Playground</title>
</svelte:head>

<div class="page">
	<div class="card">
		<a href="/" class="logo">træk</a>
		<h1>Sign in</h1>
		<p class="subtitle">We'll send a magic link to your email.</p>

		{#if status === 'sent'}
			<div class="success">
				<div class="success-icon">✉️</div>
				<p>Check your inbox for a sign-in link. It expires in 15 minutes.</p>
				<button
					class="btn-link"
					onclick={() => {
						status = 'idle';
						email = '';
					}}
				>
					Use a different email
				</button>
			</div>
		{:else}
			<form onsubmit={submit}>
				<label for="email">Email address</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					placeholder="you@example.com"
					required
					disabled={status === 'loading'}
					autocomplete="email"
				/>
				{#if status === 'error'}
					<p class="error">{errorMsg}</p>
				{/if}
				<button type="submit" class="btn btn-primary" disabled={status === 'loading'}>
					{status === 'loading' ? 'Sending...' : 'Send magic link'}
				</button>
			</form>
			<p class="terms">
				By signing in you agree to our <a href="/terms">Terms</a> and
				<a href="/privacy">Privacy Policy</a>.
			</p>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}

	.card {
		width: 100%;
		max-width: 400px;
		background: var(--pg-surface);
		border: 1px solid var(--pg-border);
		border-radius: calc(var(--pg-radius) * 1.5);
		padding: 40px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.logo {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--pg-text);
		letter-spacing: -0.03em;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.subtitle {
		color: var(--pg-text-muted);
		font-size: 0.9rem;
		margin-top: -12px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--pg-text-muted);
	}

	input {
		padding: 10px 14px;
		background: var(--pg-bg);
		border: 1px solid var(--pg-border);
		border-radius: var(--pg-radius);
		color: var(--pg-text);
		font-size: 0.95rem;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: var(--pg-accent);
	}

	.error {
		font-size: 0.85rem;
		color: var(--pg-danger);
	}

	.btn {
		padding: 12px;
		border-radius: var(--pg-radius);
		font-size: 0.95rem;
		font-weight: 600;
		border: none;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-primary {
		background: var(--pg-accent);
		color: white;
		margin-top: 4px;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--pg-accent-hover);
	}

	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.terms {
		font-size: 0.8rem;
		color: var(--pg-text-muted);
		text-align: center;
		line-height: 1.5;
	}

	.success {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		text-align: center;
		padding: 16px 0;
	}

	.success-icon {
		font-size: 2rem;
	}

	.success p {
		color: var(--pg-text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--pg-accent);
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0;
	}

	.btn-link:hover {
		text-decoration: underline;
	}
</style>
