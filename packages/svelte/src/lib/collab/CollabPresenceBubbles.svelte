<script lang="ts">
	import type { CollabProvider, PresenceState } from '@traek/collab';

	let {
		provider,
		onPeerClick
	}: {
		provider: CollabProvider;
		/** Optional: called when the user clicks a peer's avatar, e.g. to pan to their active node. */
		onPeerClick?: (peer: PresenceState) => void;
	} = $props();

	let peers = $state<PresenceState[]>([]);

	$effect(() => {
		peers = [...provider.peers.values()];
		const unsub = provider.onPresenceChange((updated) => {
			peers = [...updated.values()];
		});
		return unsub;
	});

	function initials(name: string): string {
		return name
			.split(' ')
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('');
	}
</script>

<!--
	CollabPresenceBubbles — stacked avatar bubbles showing who is in the session.
	Drop this in a toolbar or floating HUD. Each bubble shows the peer's initials
	with their assigned color. Clicking a bubble triggers onPeerClick (e.g. pan to them).
-->
<div class="presence-bubbles" role="list" aria-label="Connected collaborators">
	{#each peers as peer (peer.user.id)}
		<div role="listitem" class="bubble-wrapper">
			<button
				type="button"
				class="bubble"
				style:background={peer.user.color}
				aria-label={peer.user.name}
				onclick={() => onPeerClick?.(peer)}
				disabled={!onPeerClick}
			>
				{initials(peer.user.name)}
			</button>
			<div class="tooltip" role="tooltip">{peer.user.name}</div>
		</div>
	{/each}
</div>

<style>
	.presence-bubbles {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: -6px; /* bubbles overlap slightly */
	}

	.bubble-wrapper {
		position: relative;
		margin-left: -6px;
	}

	.bubble-wrapper:first-child {
		margin-left: 0;
	}

	.bubble {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--traek-canvas-bg, #0b0b0b);
		color: #fff;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.15s;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
		font-family: inherit;
		line-height: 1;
		padding: 0;
	}

	.bubble:disabled {
		cursor: default;
	}

	.bubble:not(:disabled):hover {
		transform: scale(1.15) translateY(-2px);
		z-index: 1;
	}

	.bubble:focus-visible {
		outline: 2px solid #fff;
		outline-offset: 2px;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--traek-tooltip-bg, rgba(0, 0, 0, 0.85));
		color: var(--traek-tooltip-text, #fff);
		font-size: 11px;
		font-weight: 500;
		padding: 3px 8px;
		border-radius: 4px;
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.15s;
		z-index: 100;
	}

	.bubble-wrapper:hover .tooltip {
		opacity: 1;
	}
</style>
