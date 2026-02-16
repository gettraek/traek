---
name: dev
description: Elite Svelte and TypeScript development skill for top 0.001% developers. Focuses on creating clean, modular, reusable code with exceptional architecture, type safety, and performance. Use when building Svelte applications, creating components, or refactoring existing code for maximum maintainability and scalability.
---

# Svelte Elite Developer

A skill for writing production-grade Svelte and TypeScript code that exemplifies clean architecture, modularity, and reusability.

## Core Principles

### 1. Type Safety First

- **Strict TypeScript everywhere**: Enable `strict: true` in tsconfig.json
- **No implicit any**: Every value has an explicit, meaningful type
- **Generic utilities**: Create reusable type utilities for common patterns
- **Type inference**: Leverage TypeScript's inference but guide it with explicit types at boundaries
- **Discriminated unions**: Use for state management and conditional rendering

### 2. Component Architecture

- **Single Responsibility**: Each component does one thing exceptionally well
- **Composition over configuration**: Build complex UIs from simple, composable pieces
- **Prop drilling prevention**: Use context API and stores appropriately
- **Container/Presentational**: Separate logic (container) from UI (presentational)
- **Slot-driven flexibility**: Design components with slots for maximum reusability

### 3. State Management Strategy

- **Derived stores**: Compute values reactively rather than duplicating state
- **Custom stores**: Encapsulate business logic in dedicated store files
- **Store composition**: Combine stores to create higher-level abstractions
- **Immutable updates**: Always return new objects/arrays from store update functions
- **Type-safe stores**: Every store has explicit TypeScript interfaces

### 4. Code Organization

```
src/
├── lib/
│   ├── components/
│   │   ├── ui/           # Pure presentational components
│   │   ├── domain/       # Business-specific components
│   │   └── layouts/      # Layout components
│   ├── stores/           # Svelte stores with business logic
│   ├── actions/          # Svelte actions (reusable directives)
│   ├── utils/            # Pure utility functions
│   ├── types/            # TypeScript type definitions
│   ├── services/         # API clients, external integrations
│   └── constants/        # App-wide constants
├── routes/               # SvelteKit routes
└── app.d.ts              # Global type augmentation
```

## Best Practices

### Component Design Patterns

#### **Props Interface Pattern**

```typescript
<script lang="ts">
  // Always define props interface explicitly
  interface Props {
    items: readonly Item[];
    onSelect?: (item: Item) => void;
    disabled?: boolean;
    class?: string;
  }

  let {
    items,
    onSelect,
    disabled = false,
    class: className = ''
  }: Props = $props();
</script>
```

#### **Slot Props Pattern**

```typescript
<script lang="ts" generics="T">
  interface Props<T> {
    items: readonly T[];
    renderKey: (item: T) => string | number;
  }

  let { items, renderKey }: Props<T> = $props();
</script>

{#each items as item (renderKey(item))}
  <slot {item} />
{/each}
```

#### **Event Handler Pattern**

```typescript
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Type-safe event dispatcher
  type Events = {
    select: { id: string; value: unknown };
    cancel: void;
  };

  const dispatch = createEventDispatcher<Events>();

  function handleSelect(id: string, value: unknown) {
    dispatch('select', { id, value });
  }
</script>
```

### Store Patterns

#### **Custom Store with Encapsulation**

```typescript
// stores/counter.ts
import { writable, type Readable } from 'svelte/store';

interface CounterState {
	readonly count: number;
	readonly history: readonly number[];
}

interface CounterStore extends Readable<CounterState> {
	increment: () => void;
	decrement: () => void;
	reset: () => void;
	setCount: (value: number) => void;
}

function createCounter(initialValue = 0): CounterStore {
	const { subscribe, update } = writable<CounterState>({
		count: initialValue,
		history: [initialValue]
	});

	return {
		subscribe,
		increment: () =>
			update((state) => ({
				count: state.count + 1,
				history: [...state.history, state.count + 1]
			})),
		decrement: () =>
			update((state) => ({
				count: state.count - 1,
				history: [...state.history, state.count - 1]
			})),
		reset: () =>
			update(() => ({
				count: initialValue,
				history: [initialValue]
			})),
		setCount: (value: number) =>
			update((state) => ({
				count: value,
				history: [...state.history, value]
			}))
	};
}

export const counter = createCounter();
```

#### **Derived Store Pattern**

```typescript
// stores/derived-example.ts
import { derived, type Readable } from 'svelte/store';
import { users } from './users';
import { filters } from './filters';

interface FilteredUser {
	readonly id: string;
	readonly name: string;
	readonly active: boolean;
}

export const filteredUsers: Readable<readonly FilteredUser[]> = derived(
	[users, filters],
	([$users, $filters]) => {
		return $users.filter((user) => {
			if ($filters.activeOnly && !user.active) return false;
			if (
				$filters.searchTerm &&
				!user.name.toLowerCase().includes($filters.searchTerm.toLowerCase())
			) {
				return false;
			}
			return true;
		});
	}
);
```

### Action Patterns

#### **Reusable Action with TypeScript**

```typescript
// actions/click-outside.ts
import type { Action } from 'svelte/action';

interface ClickOutsideParams {
	enabled?: boolean;
	callback: () => void;
}

export const clickOutside: Action<HTMLElement, ClickOutsideParams> = (node, params) => {
	const { enabled = true, callback } = params;

	function handleClick(event: MouseEvent) {
		if (!enabled) return;
		if (node && !node.contains(event.target as Node)) {
			callback();
		}
	}

	document.addEventListener('click', handleClick, true);

	return {
		update(newParams) {
			params = newParams;
		},
		destroy() {
			document.removeEventListener('click', handleClick, true);
		}
	};
};
```

### Type Utility Patterns

#### **Common Type Utilities**

```typescript
// types/utils.ts

// Make specific properties required
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Make specific properties optional
export type PartialKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Extract readonly array element type
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

// Ensure at least one property is defined
export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

// Create discriminated union from object
export type DiscriminatedUnion<T extends Record<string, unknown>> = {
	[K in keyof T]: { type: K; payload: T[K] };
}[keyof T];
```

### Performance Optimization

#### **Memoization Pattern**

```typescript
<script lang="ts">
  import { derived } from 'svelte/store';

  interface Props {
    items: readonly Item[];
    computeExpensive: (items: readonly Item[]) => Result;
  }

  let { items, computeExpensive }: Props = $props();

  // Use derived for expensive computations
  const result = $derived.by(() => computeExpensive(items));
</script>
```

#### **Virtual Scrolling for Large Lists**

```typescript
<script lang="ts">
  import { tick } from 'svelte';

  interface Props {
    items: readonly Item[];
    itemHeight: number;
    containerHeight: number;
  }

  let { items, itemHeight, containerHeight }: Props = $props();
  let scrollTop = $state(0);

  const visibleStart = $derived(Math.floor(scrollTop / itemHeight));
  const visibleEnd = $derived(Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  ));
  const visibleItems = $derived(items.slice(visibleStart, visibleEnd));
  const offsetY = $derived(visibleStart * itemHeight);
</script>

<div
  style="height: {containerHeight}px; overflow-y: auto;"
  onscroll={(e) => scrollTop = e.currentTarget.scrollTop}
>
  <div style="height: {items.length * itemHeight}px; position: relative;">
    <div style="transform: translateY({offsetY}px);">
      {#each visibleItems as item}
        <slot {item} />
      {/each}
    </div>
  </div>
</div>
```

## Code Quality Standards

### Naming Conventions

- **Components**: PascalCase (`UserProfile.svelte`, `DataTable.svelte`)
- **Stores**: camelCase with descriptive names (`userSession`, `shoppingCart`)
- **Actions**: camelCase verbs (`clickOutside`, `trapFocus`)
- **Types/Interfaces**: PascalCase (`UserData`, `ApiResponse`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`, `MAX_RETRIES`)

### Documentation

- **Component props**: Always include JSDoc for non-obvious props
- **Store methods**: Document side effects and return types
- **Complex logic**: Add inline comments explaining the "why", not the "what"
- **Public APIs**: Full JSDoc with examples

### Testing Strategy

- **Unit tests**: Test stores and utility functions in isolation
- **Component tests**: Test component behavior with Vitest + Testing Library
- **Integration tests**: Test user workflows with Playwright
- **Type tests**: Use `expectType` from `tsd` for complex type utilities

## Anti-Patterns to Avoid

### ❌ Don't

```typescript
// Mutating props directly
let { items }: Props = $props();
items.push(newItem); // BAD

// Using $: for complex logic
$: filteredItems = items.filter(i => {
  // 50 lines of complex logic
}); // BAD - use a function or derived store

// Mixing concerns in one component
<script>
  // API calls, state management, UI logic all in one component // BAD
</script>

// Using any type
function processData(data: any) {} // BAD
```

### ✅ Do

```typescript
// Create new array
let { items }: Props = $props();
const updatedItems = [...items, newItem]; // GOOD

// Extract to function or store
const filteredItems = $derived(filterItems(items, filters)); // GOOD

// Separate concerns
// DataContainer.svelte - handles data
// DataPresenter.svelte - handles UI
// GOOD

// Explicit types
function processData(data: UserData): ProcessedData {} // GOOD
```

## Advanced Patterns

### **Context API for Dependency Injection**

```typescript
// lib/contexts/theme.ts
import { setContext, getContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

const THEME_KEY = Symbol('theme');

export interface ThemeContext {
	theme: Writable<'light' | 'dark'>;
	toggle: () => void;
}

export function setThemeContext(): ThemeContext {
	const theme = writable<'light' | 'dark'>('light');

	const context: ThemeContext = {
		theme,
		toggle: () => theme.update((t) => (t === 'light' ? 'dark' : 'light'))
	};

	setContext(THEME_KEY, context);
	return context;
}

export function getThemeContext(): ThemeContext {
	const context = getContext<ThemeContext>(THEME_KEY);
	if (!context) {
		throw new Error('Theme context not found. Did you forget to call setThemeContext?');
	}
	return context;
}
```

### **Form Validation Pattern**

```typescript
// lib/stores/form-validator.ts
import { writable, derived, type Readable } from 'svelte/store';

type ValidationRule<T> = (value: T) => string | null;

interface FieldState<T> {
	value: T;
	error: string | null;
	touched: boolean;
}

export function createFormField<T>(initialValue: T, validators: readonly ValidationRule<T>[] = []) {
	const state = writable<FieldState<T>>({
		value: initialValue,
		error: null,
		touched: false
	});

	const { subscribe, update } = state;

	function validate(value: T): string | null {
		for (const validator of validators) {
			const error = validator(value);
			if (error) return error;
		}
		return null;
	}

	return {
		subscribe,
		setValue: (value: T) =>
			update((s) => ({
				...s,
				value,
				error: validate(value)
			})),
		touch: () => update((s) => ({ ...s, touched: true })),
		reset: () =>
			update(() => ({
				value: initialValue,
				error: null,
				touched: false
			}))
	};
}
```

## Decision Framework

### When to create a new component?

1. **Reusability**: Will this be used in 2+ places?
2. **Complexity**: Is the logic complex enough to warrant isolation?
3. **Single Responsibility**: Does it do one clear thing?
4. If yes to any → Create component

### When to use a store?

1. **Shared state**: Needed across multiple components?
2. **Complex logic**: State updates involve business logic?
3. **Persistence**: Needs to survive component unmounts?
4. If yes to any → Use store

### When to use context vs props?

1. **Depth**: Passing through 3+ levels? → Context
2. **Scope**: Only parent-child? → Props
3. **Type**: Configuration/theme data? → Context
4. **Type**: Component-specific data? → Props

## Output Expectations

When writing Svelte code, always:

1. **Start with types**: Define interfaces before implementation
2. **Plan component API**: Think about props, events, and slots first
3. **Extract early**: Don't wait for duplication—extract when you see potential reuse
4. **Test boundaries**: Write tests for public APIs and edge cases
5. **Document decisions**: Comment non-obvious architectural choices
6. **Review imports**: Ensure clean dependency graph, avoid circular dependencies
7. **Storybook**: Create stories for all core library components to verify states and documentation

## File Templates

### Component Template

````svelte
<script lang="ts">
	/**
	 * [Component description]
	 *
	 * @example
	 * ```svelte
	 * <ComponentName prop1="value" on:event={handler} />
	 * ```
	 */

	import type { ComponentType } from 'svelte';

	interface Props {
		// Define all props with types
	}

	let {
		// Destructure with defaults
	}: Props = $props();

	// Derived state

	// Event handlers

	// Lifecycle (if needed)
</script>

<!-- Template -->

<style>
	/* Scoped styles */
</style>
````

### Store Template

````typescript
/**
 * [Store description]
 *
 * @example
 * ```typescript
 * import { myStore } from './my-store';
 *
 * myStore.doSomething();
 * ```
 */

import { writable, type Readable } from 'svelte/store';

interface State {
	// Define state shape
}

interface Store extends Readable<State> {
	// Define methods
}

function createStore(initialState: State): Store {
	const { subscribe, update, set } = writable<State>(initialState);

	return {
		subscribe
		// Implement methods
	};
}

export const myStore = createStore({
	// Initial state
});
````

### Storybook Story Template

```typescript
import type { Meta, StoryObj } from '@storybook/svelte';
import ComponentName from './ComponentName.svelte';

const meta = {
	title: 'Domain/ComponentName',
	component: ComponentName,
	tags: ['autodocs'],
	argTypes: {
		// Define controls for props
		variant: {
			control: { type: 'select' },
			options: ['primary', 'secondary']
		},
		disabled: { control: 'boolean' }
	}
} satisfies Meta<ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		// Default props
		label: 'Button',
		disabled: false
	}
};

export const WithVariant: Story = {
	args: {
		label: 'Secondary Button',
		variant: 'secondary'
	}
};
```

## Critical Reminders

1. **Immutability**: Always create new objects/arrays for store updates
2. **Type exports**: Export types/interfaces from modules for consumer use
3. **Error boundaries**: Handle errors gracefully with try-catch and error states
4. **Accessibility**: Include ARIA attributes, keyboard navigation, and semantic HTML
5. **Performance**: Profile before optimizing—measure, don't assume
6. **Bundle size**: Import only what you need (`import { specific } from 'module'`)
7. **Backwards compatibility**: When updating stores/components, maintain API compatibility

## Integration with Other Tools

### **SvelteKit Integration**

- Use `$app/stores` for navigation state
- Leverage `load` functions for data fetching
- Type `PageData` and `LayoutData` explicitly
- Use `invalidate` and `invalidateAll` for cache management

### **Tailwind CSS Integration**

- Use `@apply` sparingly—prefer utility classes
- Extract common patterns to components, not CSS
- Use Tailwind's `theme()` function for consistency

### **Vitest Integration**

- Mock stores using `vi.mock()`
- Test reactive statements with `tick()`
- Use `render` from @testing-library/svelte

### **Storybook Integration**

- **Mandatory for Core**: All core library components must have accompanying stories
- **Visual Testing**: Use stories to verify all component states (loading, error, empty)
- **Documentation**: Leverage `autodocs` for auto-generated documentation
- **Interaction**: Use the play function for interaction tests within Storybook

---

## Example: Complete Feature Module

Here's how all patterns come together:

```
lib/features/todo/
├── components/
│   ├── TodoList.svelte          # Container component
│   ├── TodoItem.svelte           # Presentational component
│   └── TodoForm.svelte           # Form component
├── stores/
│   └── todos.ts                  # Custom store with methods
├── types/
│   └── index.ts                  # Type definitions
├── actions/
│   └── auto-focus.ts             # Reusable action
└── index.ts                      # Public API barrel export
```

This structure ensures:

- ✅ Clear separation of concerns
- ✅ Easy to test in isolation
- ✅ Reusable across projects
- ✅ Type-safe throughout
- ✅ Scalable and maintainable

---

**Remember**: The best code is code that doesn't need comments because it's self-documenting through clear types, meaningful names, and obvious structure. Write code that your future self will thank you for.
