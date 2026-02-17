import type { NodeTypeDefinition } from './types';
import TextNode from '../TextNode.svelte';

export const textNodeDefinition: NodeTypeDefinition<string> = {
	type: 'text',
	label: 'Text',
	component: TextNode,
	icon: 'T',
	selfWrapping: true
};

export const thoughtNodeDefinition: NodeTypeDefinition = {
	type: 'thought',
	label: 'Thought',
	icon: '💭'
	// No component — thought rendering stays inside TraekNodeWrapper
};
