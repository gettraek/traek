<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SearchBar from './SearchBar.svelte';

	const { Story } = defineMeta({
		title: 'Molecules/SearchBar',
		component: SearchBar,
		tags: ['autodocs'],
		argTypes: {
			onClose: { control: false },
			onSearch: { control: false },
			onNext: { control: false },
			onPrevious: { control: false },
			currentIndex: { control: 'number' },
			totalMatches: { control: 'number' }
		},
		args: {
			currentIndex: 0,
			totalMatches: 0,
			onClose: () => console.log('Close'),
			onSearch: (query) => console.log('Search:', query),
			onNext: () => console.log('Next'),
			onPrevious: () => console.log('Previous')
		}
	});
</script>

<Story asChild name="Default">
	<div style="padding: 20px; background: var(--traek-canvas-bg);">
		<SearchBar
			onClose={() => {}}
			onSearch={(q) => console.log('Search:', q)}
			onNext={() => console.log('Next')}
			onPrevious={() => console.log('Previous')}
		/>
	</div>
</Story>

<Story asChild name="With Matches">
	<div style="padding: 20px; background: var(--traek-canvas-bg);">
		<SearchBar
			onClose={() => {}}
			onSearch={(q) => console.log('Search:', q)}
			onNext={() => console.log('Next')}
			onPrevious={() => console.log('Previous')}
			currentIndex={2}
			totalMatches={5}
		/>
	</div>
</Story>

<Story asChild name="Single Match">
	<div style="padding: 20px; background: var(--traek-canvas-bg);">
		<SearchBar
			onClose={() => {}}
			onSearch={(q) => console.log('Search:', q)}
			onNext={() => console.log('Next')}
			onPrevious={() => console.log('Previous')}
			currentIndex={0}
			totalMatches={1}
		/>
	</div>
</Story>

<Story asChild name="No Matches">
	<div style="padding: 20px; background: var(--traek-canvas-bg);">
		<SearchBar
			onClose={() => {}}
			onSearch={(q) => console.log('Search:', q)}
			onNext={() => console.log('Next')}
			onPrevious={() => console.log('Previous')}
			currentIndex={0}
			totalMatches={0}
		/>
	</div>
</Story>

<Story asChild name="Many Matches">
	<div style="padding: 20px; background: var(--traek-canvas-bg);">
		<SearchBar
			onClose={() => {}}
			onSearch={(q) => console.log('Search:', q)}
			onNext={() => console.log('Next')}
			onPrevious={() => console.log('Previous')}
			currentIndex={42}
			totalMatches={123}
		/>
	</div>
</Story>
