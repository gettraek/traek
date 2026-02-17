<script lang="ts">
	import { getTraekI18n } from './i18n/index';

	const t = getTraekI18n();
</script>

<div class="demo-intro-overlay">
	<div class="demo-intro-pill">
		<span class="demo-intro-dot"></span>
		<span>{t.loading.preparingCanvas}</span>
	</div>
</div>

<style>
	@layer base {
		.demo-intro-overlay {
			position: relative;
			inset: 0;
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			background: radial-gradient(
				circle at top,
				var(--traek-overlay-gradient-1, rgba(0, 0, 0, 0.7)),
				var(--traek-overlay-gradient-2, rgba(0, 0, 0, 0.9)) 60%,
				var(--traek-overlay-gradient-3, rgba(0, 0, 0, 1))
			);
			backdrop-filter: blur(22px);
		}

		.demo-intro-pill {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.5rem 1rem;
			border-radius: 999px;
			background: var(--traek-overlay-card-bg, rgba(15, 15, 15, 0.9));
			border: 1px solid var(--traek-overlay-card-border, rgba(255, 255, 255, 0.08));
			box-shadow: 0 18px 48px var(--traek-overlay-card-shadow, rgba(0, 0, 0, 0.8));
			color: var(--traek-overlay-text, #e5e5e5);
			font-size: 0.9rem;
		}

		.demo-intro-dot {
			width: 8px;
			height: 8px;
			border-radius: 999px;
			background: var(--traek-overlay-pill-bg, #00d8ff);
			box-shadow: 0 0 16px var(--traek-overlay-pill-shadow, rgba(0, 216, 255, 0.7));
		}
	}
</style>
