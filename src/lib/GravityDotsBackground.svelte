<script lang="ts">
	import { onMount } from 'svelte';

	let canvasEl = $state<HTMLCanvasElement | null>(null);

	onMount(() => {
		if (!canvasEl) return;
		const canvas: HTMLCanvasElement = canvasEl;

		const DOT_STEP = 32;
		const DOT_RADIUS = 1;
		const GRAVITY_STRENGTH = 24;
		const GRAVITY_RANGE = 100; // only dots within this radius are pulled
		const SMOOTH = 0.08;

		const mouseTarget = { x: 0, y: 0 };
		const mouseSmoothed = { x: 0, y: 0 };
		function handleMove(e: MouseEvent) {
			mouseTarget.x = e.clientX;
			mouseTarget.y = e.clientY;
		}
		function handleLeave() {
			mouseTarget.x = -1e4;
			mouseTarget.y = -1e4;
		}
		function resize() {
			const dpr = Math.min(2, window.devicePixelRatio ?? 1);
			const w = window.innerWidth;
			const h = window.innerHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
			ctx = canvas.getContext('2d');
			if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		let ctx = canvas.getContext('2d');
		let rafId = 0;

		function draw() {
			if (!ctx) return;
			const w = window.innerWidth;
			const h = window.innerHeight;

			// Smooth mouse
			mouseSmoothed.x += (mouseTarget.x - mouseSmoothed.x) * SMOOTH;
			mouseSmoothed.y += (mouseTarget.y - mouseSmoothed.y) * SMOOTH;

			const margin = DOT_STEP * 4;
			ctx.clearRect(-margin, -margin, w + margin * 2, h + margin * 2);
			const mx = mouseSmoothed.x;
			const my = mouseSmoothed.y;

			for (let x = -margin; x <= w + margin; x += DOT_STEP) {
				for (let y = -margin; y <= h + margin; y += DOT_STEP) {
					const dx = mx - x;
					const dy = my - y;
					const dist = Math.sqrt(dx * dx + dy * dy) + 1;
					// Local gravity: only pull within range, smooth falloff to zero at edge
					const pull =
						dist >= GRAVITY_RANGE
							? 0
							: (1 - dist / GRAVITY_RANGE) * (1 - dist / GRAVITY_RANGE);
					const mag = GRAVITY_STRENGTH * pull;
					const ox = (dx / dist) * mag;
					const oy = (dy / dist) * mag;
					const px = x + ox;
					const py = y + oy;
					ctx.beginPath();
					ctx.arc(px, py, DOT_RADIUS, 0, Math.PI * 2);
					ctx.fillStyle = '#333';
					ctx.fill();
				}
			}

			rafId = requestAnimationFrame(draw);
		}

		window.addEventListener('mousemove', handleMove);
		window.addEventListener('mouseleave', handleLeave);
		window.addEventListener('resize', resize);
		resize();
		draw();

		return () => {
			window.removeEventListener('mousemove', handleMove);
			window.removeEventListener('mouseleave', handleLeave);
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(rafId);
		};
	});
</script>

<div class="gravity-dots-bg" aria-hidden="true">
	<canvas bind:this={canvasEl} class="gravity-dots-bg__canvas"></canvas>
</div>

<style>
	.gravity-dots-bg {
		position: fixed;
		inset: 0;
		background: #0b0b0b;
		z-index: 0;
	}
	.gravity-dots-bg__canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		display: block;
	}
</style>
