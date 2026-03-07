<script lang="ts">
	import type { CollabProvider, PresenceState } from '@traek/collab';

	let {
		provider,
		scale,
		offset
	}: {
		provider: CollabProvider;
		scale: number;
		offset: { x: number; y: number };
	} = $props();

	let peers = $state<Map<number, PresenceState>>(new Map());

	$effect(() => {
		peers = new Map(provider.peers);
		const unsub = provider.onPresenceChange((updated) => {
			peers = new Map(updated);
		});
		return unsub;
	});

	function toScreen(x: number, y: number) {
		return {
			sx: x * scale + offset.x,
			sy: y * scale + offset.y
		};
	}
</script>

<!--
	CollabCursorsOverlay — renders remote user cursors on top of the canvas viewport.
	Position this as an absolute overlay inside the viewport element (same level as canvas-space).
	Pointer-events are disabled so it never blocks canvas interactions.
-->
<div class="cursors-overlay" aria-hidden="true">
	{#each [...peers.values()] as peer (peer.user.id)}
		{#if peer.cursor}
			{@const { sx, sy } = toScreen(peer.cursor.x, peer.cursor.y)}
			<div
				class="cursor-root"
				style:left="{sx}px"
				style:top="{sy}px"
				style:--cursor-color={peer.user.color}
			>
				<!-- Arrow cursor SVG -->
				<svg
					class="cursor-arrow"
					width="16"
					height="20"
					viewBox="0 0 16 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M0.5 0.5L0.5 15.5L4.5 11.5L7.5 18.5L9.5 17.5L6.5 10.5L11.5 10.5L0.5 0.5Z"
						fill="var(--cursor-color)"
						stroke="white"
						stroke-width="1"
						stroke-linejoin="round"
					/>
				</svg>
				<span class="cursor-label" style:background={peer.user.color}>
					{peer.user.name}
				</span>
			</div>
		{/if}
	{/each}
</div>

<style>
	.cursors-overlay {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		z-index: 40;
	}

	.cursor-root {
		position: absolute;
		transform: translate(0, 0);
		display: flex;
		align-items: flex-start;
		gap: 4px;
	}

	.cursor-arrow {
		flex-shrink: 0;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
	}

	.cursor-label {
		margin-top: 16px;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
		line-height: 1.5;
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
		letter-spacing: 0.01em;
	}
</style>
