<script lang="ts">
	import { toastStore } from './toastStore.svelte';
	import Toast from './Toast.svelte';
</script>

{#if toastStore.toasts.length > 0}
	<div class="traek-toast-container">
		{#each toastStore.toasts as t (t.id)}
			<Toast toast={t} />
		{/each}
	</div>
{/if}

<style>
	.traek-toast-container {
		position: fixed;
		bottom: 20px;
		left: 20px;
		z-index: 200;
		display: flex;
		flex-direction: column;
		gap: 8px;
		pointer-events: auto;
	}
</style>
