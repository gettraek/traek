<script lang="ts">
	/**
	 * LiveRegion - ARIA live region for screen reader announcements
	 * Automatically manages announcement queue and cleanup
	 */

	let {
		message = $bindable(''),
		politeness = 'polite'
	}: {
		message?: string;
		politeness?: 'polite' | 'assertive';
	} = $props();

	// Queue for managing multiple announcements
	let currentMessage = $state('');
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	// Update current message when prop changes
	$effect(() => {
		if (message) {
			// Clear existing timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			// Set new message
			currentMessage = message;

			// Clear message after 5 seconds
			timeoutId = setTimeout(() => {
				currentMessage = '';
				message = '';
			}, 5000);
		}
	});

	// Cleanup on destroy
	$effect(() => {
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});
</script>

<div class="live-region" role="status" aria-live={politeness} aria-atomic="true">
	{currentMessage}
</div>

<style>
	.live-region {
		position: absolute;
		left: -10000px;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}
</style>
