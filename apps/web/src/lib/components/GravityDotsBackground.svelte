<script lang="ts">
	import { onMount } from 'svelte';

	let canvasEl = $state<HTMLCanvasElement | null>(null);

	onMount(() => {
		if (!canvasEl) return;
		const canvas: HTMLCanvasElement = canvasEl;

		const DOT_STEP = 32;
		const DOT_RADIUS = 1;
		const TENDRIL_RANGE = 120; // radius around cursor where tendrils appear
		const TENDRIL_MAX_LENGTH = 14;
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

		function getThemeColors() {
			const style = getComputedStyle(document.documentElement);
			return {
				dot: style.getPropertyValue('--traek-gravity-dot').trim() || '#262626',
				tendril:
					style.getPropertyValue('--traek-gravity-tendril').trim() || 'rgba(148, 163, 184, 0.35)',
				tendrilBranch:
					style.getPropertyValue('--traek-gravity-tendril-branch').trim() ||
					'rgba(148, 163, 184, 0.22)'
			};
		}

		function draw() {
			if (!ctx) return;
			const colors = getThemeColors();
			const w = window.innerWidth;
			const h = window.innerHeight;
			const scrollX = window.scrollX || 0;
			const scrollY = window.scrollY || 0;

			// Smooth mouse
			mouseSmoothed.x += (mouseTarget.x - mouseSmoothed.x) * SMOOTH;
			mouseSmoothed.y += (mouseTarget.y - mouseSmoothed.y) * SMOOTH;

			const margin = DOT_STEP * 4;
			ctx.clearRect(-margin, -margin, w + margin * 2, h + margin * 2);
			// "World" mouse position so the field scrolls with the page
			const mx = mouseSmoothed.x + scrollX;
			const my = mouseSmoothed.y + scrollY;

			// Base grid: static reference dots
			const mod = (n: number, m: number) => ((n % m) + m) % m;
			const startX = -margin - mod(scrollX, DOT_STEP);
			const startY = -margin - mod(scrollY, DOT_STEP);

			for (let x = startX; x <= w + margin; x += DOT_STEP) {
				for (let y = startY; y <= h + margin; y += DOT_STEP) {
					// Anchor to world coords for stable noise + proper scroll behavior
					const wx = x + scrollX;
					const wy = y + scrollY;

					const dx = mx - wx;
					const dy = my - wy;
					const dist = Math.sqrt(dx * dx + dy * dy) || 1;

					// Always draw a subtle grid dot for orientation
					ctx.beginPath();
					ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
					ctx.fillStyle = colors.dot;
					ctx.fill();

					// Within a local radius, draw short, soft tendrils that orient toward the cursor
					if (dist < TENDRIL_RANGE) {
						const t = 1 - dist / TENDRIL_RANGE;
						const strength = t * t;
						const len = TENDRIL_MAX_LENGTH * strength;
						const nx = dx / dist;
						const ny = dy / dist;

						// Simple deterministic noise based on grid coordinates
						const seed = Math.sin(wx * 12.9898 + wy * 78.233) * 43758.5453;
						const rand = seed - Math.floor(seed); // 0..1

						// Main tendril direction: point to cursor, slightly warped
						const baseAngle = Math.atan2(ny, nx);
						const noiseAngle = (rand - 0.5) * 0.5; // up to ~±14°
						const dirAngle = baseAngle + noiseAngle;
						const dirX = Math.cos(dirAngle);
						const dirY = Math.sin(dirAngle);

						const mainEndX = x + dirX * len;
						const mainEndY = y + dirY * len;

						// Main stroke
						ctx.beginPath();
						ctx.moveTo(x, y);
						ctx.lineTo(mainEndX, mainEndY);
						ctx.strokeStyle = colors.tendril;
						ctx.lineWidth = 1;
						ctx.stroke();

						// Subtle branching near the tip: two small offshoots
						const branchBaseX = x + dirX * (len * 0.6);
						const branchBaseY = y + dirY * (len * 0.6);
						const branchLen = len * 0.45;
						const branchAngleSpread = 0.55; // ~30°

						for (const s of [-1, 1]) {
							const branchAngle = dirAngle + s * branchAngleSpread * (0.7 + rand * 0.3);
							const bx = branchBaseX + Math.cos(branchAngle) * branchLen;
							const by = branchBaseY + Math.sin(branchAngle) * branchLen;

							ctx.beginPath();
							ctx.moveTo(branchBaseX, branchBaseY);
							ctx.lineTo(bx, by);
							ctx.strokeStyle = colors.tendrilBranch;
							ctx.lineWidth = 0.8;
							ctx.stroke();
						}
					}
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
		background: var(--traek-bg-body);
		z-index: -1;
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
