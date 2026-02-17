<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Toast from './Toast.svelte';
	import type { Toast as ToastType } from './toastStore.svelte';

	const { Story } = defineMeta({
		title: 'Atoms/Toast',
		component: Toast,
		tags: ['autodocs'],
		argTypes: {
			toast: { control: false }
		}
	});
</script>

<Story asChild name="Success">
	{@const toast: ToastType = {
		id: '1',
		message: 'Changes saved successfully',
		type: 'success',
		duration: 5000
	}}
	<div style="padding: 20px; background: var(--traek-canvas-bg); height: 120px;">
		<Toast {toast} />
	</div>
</Story>

<Story asChild name="Error">
	{@const toast: ToastType = {
		id: '2',
		message: 'Failed to save changes',
		type: 'error',
		duration: 5000
	}}
	<div style="padding: 20px; background: var(--traek-canvas-bg); height: 120px;">
		<Toast {toast} />
	</div>
</Story>

<Story asChild name="Info">
	{@const toast: ToastType = {
		id: '3',
		message: 'Your session will expire in 5 minutes',
		type: 'info',
		duration: 5000
	}}
	<div style="padding: 20px; background: var(--traek-canvas-bg); height: 120px;">
		<Toast {toast} />
	</div>
</Story>

<Story asChild name="Undo">
	{@const toast: ToastType = {
		id: '4',
		message: 'Node deleted',
		type: 'undo',
		duration: 5000,
		onUndo: () => console.log('Undo clicked')
	}}
	<div style="padding: 20px; background: var(--traek-canvas-bg); height: 120px;">
		<Toast {toast} />
	</div>
</Story>

<Story asChild name="Long Message">
	{@const toast: ToastType = {
		id: '5',
		message: 'This is a very long toast message that might wrap to multiple lines. It contains important information that the user needs to see.',
		type: 'info',
		duration: 5000
	}}
	<div style="padding: 20px; background: var(--traek-canvas-bg); height: 140px;">
		<Toast {toast} />
	</div>
</Story>
