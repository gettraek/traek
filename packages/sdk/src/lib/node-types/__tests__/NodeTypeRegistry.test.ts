import { describe, it, expect } from 'vitest';
import { NodeTypeRegistry } from '../NodeTypeRegistry.svelte';
import { createDefaultRegistry } from '../index';
import type { NodeTypeDefinition } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockComponent = {} as any;

function makeDef(overrides: Partial<NodeTypeDefinition> & { type: string }): NodeTypeDefinition {
	return {
		label: overrides.type.charAt(0).toUpperCase() + overrides.type.slice(1),
		...overrides
	};
}

describe('NodeTypeRegistry', () => {
	describe('register()', () => {
		it('should add a new type definition', () => {
			expect.assertions(2);
			const registry = new NodeTypeRegistry();
			const def = makeDef({ type: 'custom', component: MockComponent });
			registry.register(def);
			expect(registry.has('custom')).toBe(true);
			expect(registry.get('custom')).toBe(def);
		});

		it('should replace an existing type on re-register', () => {
			expect.assertions(3);
			const registry = new NodeTypeRegistry();
			const original = makeDef({ type: 'text', label: 'Original', icon: 'A' });
			const replacement = makeDef({ type: 'text', label: 'Replacement', icon: 'B' });
			registry.register(original);
			expect(registry.get('text')).toBe(original);
			registry.register(replacement);
			expect(registry.get('text')).toBe(replacement);
			expect(registry.list()).toHaveLength(1);
		});

		it('should allow registering multiple distinct types', () => {
			expect.assertions(3);
			const registry = new NodeTypeRegistry();
			const defA = makeDef({ type: 'alpha', component: MockComponent });
			const defB = makeDef({ type: 'beta', component: MockComponent });
			registry.register(defA);
			registry.register(defB);
			expect(registry.has('alpha')).toBe(true);
			expect(registry.has('beta')).toBe(true);
			expect(registry.list()).toHaveLength(2);
		});
	});

	describe('unregister()', () => {
		it('should remove a registered type and return true', () => {
			expect.assertions(3);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'removable' }));
			expect(registry.has('removable')).toBe(true);
			const result = registry.unregister('removable');
			expect(result).toBe(true);
			expect(registry.has('removable')).toBe(false);
		});

		it('should return false when removing a non-existent type', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			const result = registry.unregister('does-not-exist');
			expect(result).toBe(false);
		});

		it('should not affect other registered types', () => {
			expect.assertions(2);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'keep' }));
			registry.register(makeDef({ type: 'remove' }));
			registry.unregister('remove');
			expect(registry.has('keep')).toBe(true);
			expect(registry.has('remove')).toBe(false);
		});
	});

	describe('get()', () => {
		it('should retrieve a registered type definition', () => {
			expect.assertions(2);
			const registry = new NodeTypeRegistry();
			const def = makeDef({ type: 'widget', icon: 'W', component: MockComponent });
			registry.register(def);
			const retrieved = registry.get('widget');
			expect(retrieved).toBe(def);
			expect(retrieved?.icon).toBe('W');
		});

		it('should return undefined for a non-existent type', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			expect(registry.get('nonexistent')).toBeUndefined();
		});

		it('should return undefined after a type is unregistered', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'temp' }));
			registry.unregister('temp');
			expect(registry.get('temp')).toBeUndefined();
		});
	});

	describe('has()', () => {
		it('should return true for a registered type', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'present' }));
			expect(registry.has('present')).toBe(true);
		});

		it('should return false for a non-registered type', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			expect(registry.has('absent')).toBe(false);
		});

		it('should return false on an empty registry', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			expect(registry.has('anything')).toBe(false);
		});

		it('should return false after a type is unregistered', () => {
			expect.assertions(2);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'transient' }));
			expect(registry.has('transient')).toBe(true);
			registry.unregister('transient');
			expect(registry.has('transient')).toBe(false);
		});
	});

	describe('list()', () => {
		it('should return all registered definitions', () => {
			expect.assertions(3);
			const registry = new NodeTypeRegistry();
			const defA = makeDef({ type: 'a' });
			const defB = makeDef({ type: 'b' });
			registry.register(defA);
			registry.register(defB);
			const items = registry.list();
			expect(items).toHaveLength(2);
			expect(items).toContain(defA);
			expect(items).toContain(defB);
		});

		it('should return an empty list for an empty registry', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			expect(registry.list()).toEqual([]);
		});

		it('should reflect removals', () => {
			expect.assertions(2);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'x' }));
			registry.register(makeDef({ type: 'y' }));
			registry.unregister('x');
			const items = registry.list();
			expect(items).toHaveLength(1);
			expect(items[0].type).toBe('y');
		});

		it('should return a new array instance on each call', () => {
			expect.assertions(1);
			const registry = new NodeTypeRegistry();
			registry.register(makeDef({ type: 'z' }));
			const first = registry.list();
			const second = registry.list();
			expect(first).not.toBe(second);
		});
	});

	describe('createDefaultRegistry()', () => {
		it('should return a registry with built-in types pre-registered', () => {
			expect.assertions(2);
			const registry = createDefaultRegistry();
			expect(registry.has('text')).toBe(true);
			expect(registry.has('thought')).toBe(true);
		});

		it('should have exactly 2 built-in types registered', () => {
			expect.assertions(1);
			const registry = createDefaultRegistry();
			expect(registry.list()).toHaveLength(2);
		});

		it('should register text definition with correct properties', () => {
			expect.assertions(3);
			const registry = createDefaultRegistry();
			const textDef = registry.get('text');
			expect(textDef?.label).toBe('Text');
			expect(textDef?.icon).toBe('T');
			expect(textDef?.selfWrapping).toBe(true);
		});

		it('should register thought definition with correct properties', () => {
			expect.assertions(3);
			const registry = createDefaultRegistry();
			const thoughtDef = registry.get('thought');
			expect(thoughtDef?.label).toBe('Thought');
			expect(thoughtDef?.icon).toBe('\u{1F4AD}');
			expect(thoughtDef?.component).toBeUndefined();
		});

		it('should return independent registry instances', () => {
			expect.assertions(2);
			const registryA = createDefaultRegistry();
			const registryB = createDefaultRegistry();
			registryA.register(makeDef({ type: 'extra' }));
			expect(registryA.has('extra')).toBe(true);
			expect(registryB.has('extra')).toBe(false);
		});
	});
});
