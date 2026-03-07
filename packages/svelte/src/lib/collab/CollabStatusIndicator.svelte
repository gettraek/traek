<script lang="ts">
	import type { CollabProvider, CollabStatus } from '@traek/collab';

	let { provider }: { provider: CollabProvider } = $props();

	let status = $state<CollabStatus>('connecting');
	let peerCount = $state(0);

	$effect(() => {
		const unsubStatus = provider.onStatusChange((s) => {
			status = s;
		});
		const unsubPresence = provider.onPresenceChange((peers) => {
			peerCount = peers.size;
		});
		status = provider.status;
		peerCount = provider.peers.size;
		return () => {
			unsubStatus();
			unsubPresence();
		};
	});

	const label = $derived.by(() => {
		if (status === 'connecting') return 'Connecting…';
		if (status === 'error') return 'Connection error';
		if (status === 'disconnected') return 'Disconnected';
		if (peerCount === 0) return 'Live';
		return peerCount === 1 ? '1 peer' : `${peerCount} peers`;
	});
</script>

<!--
	CollabStatusIndicator — compact dot + label showing WebSocket connection status.
	Designed for placement in a toolbar or the top-right controls area.
-->
<div
	class="status-indicator"
	class:status-connecting={status === 'connecting'}
	class:status-connected={status === 'connected'}
	class:status-disconnected={status === 'disconnected'}
	class:status-error={status === 'error'}
	role="status"
	aria-live="polite"
	aria-label="Collaboration status: {label}"
	title="Collaboration status: {label}"
>
	<span class="status-dot" aria-hidden="true"></span>
	<span class="status-label">{label}</span>
</div>

<style>
	.status-indicator {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 8px;
		border-radius: 20px;
		background: var(--traek-status-bg, rgba(255, 255, 255, 0.06));
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.01em;
		white-space: nowrap;
		transition: background 0.2s;
		color: var(--traek-text-secondary, #888);
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
		transition: background 0.2s;
	}

	/* Connecting — pulsing amber */
	.status-connecting .status-dot {
		background: #f59e0b;
		animation: pulse 1.2s ease-in-out infinite;
	}

	/* Connected — steady green */
	.status-connected .status-dot {
		background: #10b981;
	}

	/* Disconnected — grey */
	.status-disconnected .status-dot {
		background: #6b7280;
	}

	/* Error — red */
	.status-error .status-dot {
		background: #ef4444;
	}

	.status-error {
		color: #ef4444;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}
</style>
