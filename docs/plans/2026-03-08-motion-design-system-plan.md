# Motion Design System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a cohesive motion design system with animation tokens, centralized transition factories, micro-animations on key UI interactions, and a Storybook showcase — all under 5KB bundle delta.

**Architecture:** Extend the existing `tokens.json`/`tokens.ts`/`themes.ts` pipeline with easing curves, delays, and an `instant` duration; expose them as `--traek-ease-*` and `--traek-delay-*` CSS custom properties via `ThemeProvider.svelte`. All Svelte transition logic is centralised in a new `motion.ts` module that reads from those CSS vars and respects `prefers-reduced-motion` automatically.

**Tech Stack:** Svelte 5 runes, TypeScript strict, Zod v3, Vitest (logic-extraction tests only — no jsdom component rendering), Storybook for visual showcase.

**Design spec:** `docs/plans/2026-03-08-motion-design-system.md`

---

## Task 1: Extend `tokens.json` with easing, delay, and instant duration

**Files:**
- Modify: `packages/svelte/src/lib/theme/tokens.json`

### Step 1: Add animation token additions to `tokens.json`

Inside the existing `"animation"` → `"duration"` block, add one entry. Then add two new sibling blocks `"easing"` and `"delay"`. Open the file and add after the `"slow"` duration entry:

```json
"instant": {
  "$value": "80ms",
  "$description": "Instant micro hover feedback (colour, border flicker)",
  "$extensions": { "traek": { "cssVar": "--traek-duration-instant" } }
}
```

Then add after the closing `}` of `"duration"`, before the outer closing `}` of `"animation"`:

```json
"easing": {
  "$type": "custom-easing",
  "standard": {
    "$value": "cubic-bezier(0.2, 0, 0, 1)",
    "$description": "Default UI transitions — balanced in/out",
    "$extensions": { "traek": { "cssVar": "--traek-ease-standard" } }
  },
  "decelerate": {
    "$value": "cubic-bezier(0, 0, 0.2, 1)",
    "$description": "Entering elements — fast start, soft landing",
    "$extensions": { "traek": { "cssVar": "--traek-ease-decelerate" } }
  },
  "accelerate": {
    "$value": "cubic-bezier(0.4, 0, 1, 1)",
    "$description": "Exiting elements — slow start, fast exit",
    "$extensions": { "traek": { "cssVar": "--traek-ease-accelerate" } }
  },
  "spring": {
    "$value": "cubic-bezier(0.34, 1.56, 0.64, 1)",
    "$description": "Springy emphasis — slight overshoot for delightful interactions",
    "$extensions": { "traek": { "cssVar": "--traek-ease-spring" } }
  },
  "linear": {
    "$value": "linear",
    "$description": "Constant speed — infinite loops, progress bars",
    "$extensions": { "traek": { "cssVar": "--traek-ease-linear" } }
  }
},
"delay": {
  "$type": "duration",
  "none": {
    "$value": "0ms",
    "$description": "No delay",
    "$extensions": { "traek": { "cssVar": "--traek-delay-none" } }
  },
  "short": {
    "$value": "50ms",
    "$description": "Short stagger delay — first sequential item",
    "$extensions": { "traek": { "cssVar": "--traek-delay-short" } }
  },
  "medium": {
    "$value": "100ms",
    "$description": "Medium stagger delay — second sequential item",
    "$extensions": { "traek": { "cssVar": "--traek-delay-medium" } }
  },
  "long": {
    "$value": "200ms",
    "$description": "Long delay — deferred secondary content",
    "$extensions": { "traek": { "cssVar": "--traek-delay-long" } }
  }
}
```

### Step 2: Commit

```bash
git add packages/svelte/src/lib/theme/tokens.json
git commit -m "feat(tokens): add easing curves, delay tokens, and instant duration"
```

---

## Task 2: Update Zod schemas in `tokens.ts`

**Files:**
- Modify: `packages/svelte/src/lib/theme/tokens.ts`

### Step 1: Write failing test

In `packages/svelte/src/lib/theme/tokens.test.ts` (already exists), add:

```typescript
import { TraekThemeAnimationSchema } from './tokens';

it('validates easing curves in animation schema', () => {
  const result = TraekThemeAnimationSchema.safeParse({
    fast: 120, normal: 220, slow: 380, instant: 80,
    easing: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      linear: 'linear',
    },
    delay: { none: 0, short: 50, medium: 100, long: 200 },
  });
  expect(result.success).toBe(true);
});
```

### Step 2: Run test to confirm it fails

```bash
cd packages/svelte && npx vitest run src/lib/theme/tokens.test.ts
```
Expected: FAIL — `TraekThemeAnimationSchema` doesn't include `easing` or `delay` yet.

### Step 3: Add Zod schemas to `tokens.ts`

After the existing `durationSchema` line, add:

```typescript
const easingSchema = z.string().min(1);
```

After `TraekThemeAnimationSchema`, add two new schemas and update the animation schema:

```typescript
export const TraekThemeAnimationEasingSchema = z.object({
  standard: easingSchema,
  decelerate: easingSchema,
  accelerate: easingSchema,
  spring: easingSchema,
  linear: easingSchema,
});

export const TraekThemeAnimationDelaySchema = z.object({
  none: durationSchema,
  short: durationSchema,
  medium: durationSchema,
  long: durationSchema,
});
```

Replace the existing `TraekThemeAnimationSchema` with:

```typescript
export const TraekThemeAnimationSchema = z.object({
  fast: durationSchema,
  normal: durationSchema,
  slow: durationSchema,
  instant: durationSchema,
  easing: TraekThemeAnimationEasingSchema,
  delay: TraekThemeAnimationDelaySchema,
});
```

Add the corresponding exported types at the bottom of the file:

```typescript
export type TraekThemeAnimationEasing = z.infer<typeof TraekThemeAnimationEasingSchema>;
export type TraekThemeAnimationDelay = z.infer<typeof TraekThemeAnimationDelaySchema>;
```

### Step 4: Run test to confirm it passes

```bash
cd packages/svelte && npx vitest run src/lib/theme/tokens.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add packages/svelte/src/lib/theme/tokens.ts packages/svelte/src/lib/theme/tokens.test.ts
git commit -m "feat(tokens): add Zod schemas for easing curves and delay tokens"
```

---

## Task 3: Update `themes.ts` with new animation fields

**Files:**
- Modify: `packages/svelte/src/lib/theme/themes.ts`

### Step 1: Inspect current animation blocks in themes.ts

Read the file to find all `animation:` objects in the dark/light/high-contrast theme definitions.

### Step 2: Add new fields to every theme

For each theme's `animation:` block, add:

```typescript
instant: 80,
easing: {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  linear: 'linear',
},
delay: { none: 0, short: 50, medium: 100, long: 200 },
```

All themes share the same motion values (easing is perceptual, not brand-specific).

### Step 3: Run type-check

```bash
cd packages/svelte && npx svelte-check --tsconfig tsconfig.json 2>&1 | head -40
```
Expected: 0 errors.

### Step 4: Commit

```bash
git add packages/svelte/src/lib/theme/themes.ts
git commit -m "feat(themes): add instant duration, easing, and delay to all themes"
```

---

## Task 4: Set CSS custom properties in `ThemeProvider.svelte`

**Files:**
- Modify: `packages/svelte/src/lib/theme/ThemeProvider.svelte`

### Step 1: Read current setProperty calls

Read the file to find where `--traek-duration-fast` etc. are set. They will be inside a function called by the theme application logic.

### Step 2: Add new CSS variable assignments

After the existing duration setProperty calls, add:

```typescript
root.style.setProperty('--traek-duration-instant', `${theme.animation.instant}ms`);
root.style.setProperty('--traek-ease-standard', theme.animation.easing.standard);
root.style.setProperty('--traek-ease-decelerate', theme.animation.easing.decelerate);
root.style.setProperty('--traek-ease-accelerate', theme.animation.easing.accelerate);
root.style.setProperty('--traek-ease-spring', theme.animation.easing.spring);
root.style.setProperty('--traek-ease-linear', theme.animation.easing.linear);
root.style.setProperty('--traek-delay-none', `${theme.animation.delay.none}ms`);
root.style.setProperty('--traek-delay-short', `${theme.animation.delay.short}ms`);
root.style.setProperty('--traek-delay-medium', `${theme.animation.delay.medium}ms`);
root.style.setProperty('--traek-delay-long', `${theme.animation.delay.long}ms`);
```

### Step 3: Write test for ThemeProvider

Check `packages/svelte/src/lib/theme/ThemeProvider.test.ts` to see the test pattern (it tests `applyTheme` function or equivalent). Add a test that verifies `--traek-ease-standard` is set. If the test file only tests by inspecting `style.setProperty` calls via a mock, follow the same pattern.

```typescript
it('sets easing CSS vars when theme is applied', () => {
  // follow existing test pattern in ThemeProvider.test.ts
  // assert --traek-ease-standard, --traek-ease-decelerate are set
});
```

### Step 4: Run tests

```bash
cd packages/svelte && npx vitest run src/lib/theme/ThemeProvider.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add packages/svelte/src/lib/theme/ThemeProvider.svelte packages/svelte/src/lib/theme/ThemeProvider.test.ts
git commit -m "feat(theme): expose easing and delay tokens as CSS custom properties"
```

---

## Task 5: Create `motion.ts` — centralized transition factory

**Files:**
- Create: `packages/svelte/src/lib/motion.ts`
- Create: `packages/svelte/src/lib/motion.test.ts`

### Step 1: Write failing tests

Create `packages/svelte/src/lib/motion.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock window.matchMedia for reduced-motion tests
const mockMatchMedia = (matches: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
};

describe('prefersReducedMotion', () => {
  it('returns false when no reduced motion preference', () => {
    mockMatchMedia(false);
    const { prefersReducedMotion } = await import('./motion');
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { prefersReducedMotion } = await import('./motion');
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false in SSR (no window)', () => {
    vi.stubGlobal('window', undefined);
    const { prefersReducedMotion } = await import('./motion');
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('getMotionDuration', () => {
  it('returns full duration when not reduced motion', () => {
    mockMatchMedia(false);
    const { getMotionDuration } = await import('./motion');
    expect(getMotionDuration(300)).toBe(300);
  });

  it('returns 1ms when reduced motion preferred', () => {
    mockMatchMedia(true);
    const { getMotionDuration } = await import('./motion');
    expect(getMotionDuration(300)).toBe(1);
  });
});

describe('getEasing', () => {
  it('returns CSS var with fallback', () => {
    const { getEasing } = await import('./motion');
    const result = getEasing('standard', 'cubic-bezier(0.2, 0, 0, 1)');
    expect(result).toBe('var(--traek-ease-standard, cubic-bezier(0.2, 0, 0, 1))');
  });
});
```

### Step 2: Run tests to confirm they fail

```bash
cd packages/svelte && npx vitest run src/lib/motion.test.ts
```
Expected: FAIL — module not found.

### Step 3: Create `motion.ts`

Create `packages/svelte/src/lib/motion.ts`:

```typescript
import { cubicOut, cubicInOut } from 'svelte/easing';
import type { EasingFunction, TransitionConfig } from 'svelte/transition';

// ── Reduced motion ────────────────────────────────────────────────────────────

export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Returns the given duration unless the user prefers reduced motion,
 * in which case returns 1ms (effectively instant, while still firing transition events).
 */
export function getMotionDuration(ms: number): number {
	return prefersReducedMotion() ? 1 : ms;
}

// ── CSS var helpers ───────────────────────────────────────────────────────────

/**
 * Returns a CSS var() referencing a --traek-ease-* token with a fallback value.
 * Usage in CSS: just use the var directly. Usage in JS (e.g. Web Animations): call this.
 */
export function getEasing(name: string, fallback: string): string {
	return `var(--traek-ease-${name}, ${fallback})`;
}

// ── Transition: nodeAppear ────────────────────────────────────────────────────

export interface NodeAppearParams {
	delay?: number;
	duration?: number;
}

/**
 * Svelte intro/outro transition for a new node appearing on the canvas.
 * Combines opacity fade + slight scale-up + small translateY lift.
 * Respects prefers-reduced-motion (opacity only, 50ms).
 */
export function nodeAppear(
	_node: Element,
	{ delay = 0, duration = 220 }: NodeAppearParams = {}
): TransitionConfig {
	const reduced = prefersReducedMotion();
	const actualDuration = reduced ? 50 : duration;

	return {
		delay,
		duration: actualDuration,
		easing: cubicOut,
		css: (t) => {
			if (reduced) return `opacity: ${t};`;
			const scale = 0.95 + 0.05 * t;
			const translateY = (1 - t) * 4;
			return `
				opacity: ${t};
				transform: scale(${scale}) translateY(${translateY}px);
			`;
		},
	};
}

// ── Transition: panelSlide ────────────────────────────────────────────────────

export interface PanelSlideParams {
	delay?: number;
	duration?: number;
	axis?: 'x' | 'y';
}

/**
 * Height (or width) + opacity transition for collapsible panels.
 * A token-aware alternative to Svelte's built-in `slide` that respects
 * prefers-reduced-motion and reads --traek-duration-* CSS vars as hints.
 */
export function panelSlide(
	node: Element,
	{ delay = 0, duration = 180, axis = 'y' }: PanelSlideParams = {}
): TransitionConfig {
	const reduced = prefersReducedMotion();
	const actualDuration = reduced ? 1 : duration;
	const style = getComputedStyle(node) as unknown as Record<string, string>;
	const primary = axis === 'y' ? 'height' : 'width';
	const size = parseFloat(style[primary] || '0');
	const paddingStart = parseFloat(axis === 'y' ? style.paddingTop : style.paddingLeft || '0');
	const paddingEnd = parseFloat(axis === 'y' ? style.paddingBottom : style.paddingRight || '0');
	const marginStart = parseFloat(axis === 'y' ? style.marginTop : style.marginLeft || '0');
	const marginEnd = parseFloat(axis === 'y' ? style.marginBottom : style.marginRight || '0');

	return {
		delay,
		duration: actualDuration,
		easing: cubicInOut,
		css: (t) =>
			`overflow:hidden;` +
			`opacity:${reduced ? 1 : t};` +
			`${primary}:${t * size}px;` +
			(axis === 'y'
				? `padding-top:${t * paddingStart}px;padding-bottom:${t * paddingEnd}px;` +
					`margin-top:${t * marginStart}px;margin-bottom:${t * marginEnd}px;`
				: `padding-left:${t * paddingStart}px;padding-right:${t * paddingEnd}px;` +
					`margin-left:${t * marginStart}px;margin-right:${t * marginEnd}px;`) +
			`min-${primary}:0`,
	};
}

// ── Transition: connectionDraw ────────────────────────────────────────────────

export interface ConnectionDrawParams {
	delay?: number;
	duration?: number;
}

/**
 * SVG stroke-dashoffset draw-on animation for connection lines.
 * Requires the SVG path element to have its `stroke-dasharray` set to its
 * total path length (use getTotalLength() on the SVGPathElement).
 * Respects prefers-reduced-motion (shows immediately).
 */
export function connectionDraw(
	node: Element,
	{ delay = 0, duration = 380 }: ConnectionDrawParams = {}
): TransitionConfig {
	const reduced = prefersReducedMotion();
	if (reduced) {
		return { delay: 0, duration: 1, css: () => '' };
	}

	const path = node as SVGPathElement;
	const length = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 200;

	return {
		delay,
		duration,
		easing: cubicOut,
		css: (t) =>
			`stroke-dasharray: ${length}; stroke-dashoffset: ${(1 - t) * length};`,
	};
}

// ── Easing function references (for JS usage) ─────────────────────────────────

export { cubicOut, cubicInOut };
export type { EasingFunction, TransitionConfig };
```

### Step 4: Run tests to confirm they pass

```bash
cd packages/svelte && npx vitest run src/lib/motion.test.ts
```
Expected: PASS.

### Step 5: Commit

```bash
git add packages/svelte/src/lib/motion.ts packages/svelte/src/lib/motion.test.ts
git commit -m "feat(motion): add centralized transition factory module"
```

---

## Task 6: Export `motion.ts` from library index

**Files:**
- Modify: `packages/svelte/src/lib/index.ts`

### Step 1: Add export

Open `packages/svelte/src/lib/index.ts` and add:

```typescript
export { nodeAppear, panelSlide, connectionDraw, getMotionDuration, prefersReducedMotion, getEasing } from './motion.js';
export type { NodeAppearParams, PanelSlideParams, ConnectionDrawParams } from './motion.js';
```

### Step 2: Type-check

```bash
cd packages/svelte && npx svelte-check --tsconfig tsconfig.json 2>&1 | head -40
```
Expected: 0 errors.

### Step 3: Commit

```bash
git add packages/svelte/src/lib/index.ts
git commit -m "feat(exports): export motion transition factories from library index"
```

---

## Task 7: Refactor `TraekNodeWrapper.svelte` to consume motion tokens

**Files:**
- Modify: `packages/svelte/src/lib/TraekNodeWrapper.svelte`

### Step 1: Replace hardcoded transition values with CSS var references

Search for all hardcoded `transition:` CSS properties in TraekNodeWrapper.svelte that use literal values like `0.1s ease`, `0.2s ease`, etc. Replace them to use the new CSS vars:

| Old value | New value |
|---|---|
| `transition: box-shadow 0.1s ease` | `transition: box-shadow var(--traek-duration-instant, 80ms) var(--traek-ease-standard, cubic-bezier(0.2,0,0,1))` |
| `transition: ... 0.2s ease` (hover states) | `transition: ... var(--traek-duration-fast, 120ms) var(--traek-ease-standard, cubic-bezier(0.2,0,0,1))` |
| `transition: transform 0.2s` | `transition: transform var(--traek-duration-fast, 120ms) var(--traek-ease-standard, cubic-bezier(0.2,0,0,1))` |

### Step 2: Replace `node-appear` keyframe animation

Find the existing `@keyframes node-appear` block and the class using it. Replace with the `nodeAppear` Svelte transition on the wrapper element using `in:nodeAppear`:

```svelte
<script>
  import { nodeAppear } from './motion.js';
</script>
```

Add `in:nodeAppear` to the top-level wrapper `<div>` that renders the node card.

Remove the old `@keyframes node-appear` CSS block and its associated class.

### Step 3: Update stream-complete pulse easing

Find `@keyframes stream-complete-pulse` and its animation declaration. Change the `animation-timing-function` to use the spring token:

```css
animation: stream-complete-pulse 600ms var(--traek-ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
```

Add reduced-motion suppression inside the existing `@media (prefers-reduced-motion: reduce)` block (or create one if absent):

```css
@media (prefers-reduced-motion: reduce) {
  .stream-complete-pulse {
    animation: none;
  }
  /* Also disable node-appear, header-spin etc. */
  .node-appear, .header-spin, .thought-pulse, .thought-spin {
    animation: none;
  }
}
```

### Step 4: Replace panelSlide usage

Find existing `transition:slide={{ duration: 180 }}` on the thought panel `div.thought-detail`. Replace with:

```svelte
import { panelSlide } from './motion.js';
...
<div class="thought-detail" transition:panelSlide={{ duration: 180 }}>
```

Remove the `slide` import from `svelte/transition` if it's no longer used elsewhere in this file.

### Step 5: Lint and type-check

```bash
cd packages/svelte && npx svelte-check --tsconfig tsconfig.json 2>&1 | head -40
pnpm run lint 2>&1 | tail -20
```
Expected: 0 errors, 0 warnings.

### Step 6: Commit

```bash
git add packages/svelte/src/lib/TraekNodeWrapper.svelte
git commit -m "refactor(node-wrapper): use motion tokens and centralized transitions"
```

---

## Task 8: Add connection draw animation to `ConnectionLayer.svelte`

**Files:**
- Modify: `packages/svelte/src/lib/canvas/ConnectionLayer.svelte`

### Step 1: Read the file

Read `packages/svelte/src/lib/canvas/ConnectionLayer.svelte` fully to understand how SVG paths are rendered for connections.

### Step 2: Add `connectionDraw` transition to path elements

Import `connectionDraw` from `'../motion.js'` and add `in:connectionDraw` to the SVG `<path>` element that renders connection lines. If the path doesn't have `getTotalLength` (e.g., it's a polyline or has dynamic `d` attribute), wrap the transition call so it retrieves the length via a Svelte action or `onMount`.

Example pattern:
```svelte
<path
  {d}
  in:connectionDraw={{ duration: 380, delay: 50 }}
  stroke="..."
  ...
/>
```

Note: The `connectionDraw` transition uses `getTotalLength()` internally, which works on SVGPathElement. Ensure the transition fires only when the path first enters the DOM (new connection), not on every re-render.

### Step 3: Type-check

```bash
cd packages/svelte && npx svelte-check --tsconfig tsconfig.json 2>&1 | head -40
```
Expected: 0 errors.

### Step 4: Commit

```bash
git add packages/svelte/src/lib/canvas/ConnectionLayer.svelte
git commit -m "feat(canvas): add stroke draw-on animation for new connection lines"
```

---

## Task 9: Create `MotionSystem.stories.svelte` Storybook showcase

**Files:**
- Create: `packages/svelte/src/lib/stories/MotionSystem.stories.svelte`

### Step 1: Read an existing story for patterns

Read `packages/svelte/src/lib/stories/TraekCanvas.stories.svelte` to understand the Storybook story structure used in this project (meta, Story, etc.).

### Step 2: Create the motion showcase story

Create `packages/svelte/src/lib/stories/MotionSystem.stories.svelte`:

```svelte
<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  const { Story } = defineMeta({
    title: 'Design System/Motion',
    parameters: { layout: 'padded' },
  });
</script>

<script lang="ts">
  import { nodeAppear, panelSlide, connectionDraw } from '../motion.js';
  let showNode = $state(false);
  let showPanel = $state(false);
  let showConnection = $state(false);
  let reducedMotionSim = $state(false);

  function toggleNode() { showNode = false; setTimeout(() => { showNode = true; }, 16); }
  function togglePanel() { showPanel = !showPanel; }
  function toggleConnection() { showConnection = false; setTimeout(() => { showConnection = true; }, 16); }
</script>

<Story name="Duration Scale">
  <div style="font-family: var(--traek-font-mono, monospace); padding: 24px;">
    <h3 style="margin-bottom: 16px; font-size: 14px; color: #71717a;">Duration Tokens</h3>
    {#each [
      { name: '--traek-duration-instant', ms: 80, label: 'instant' },
      { name: '--traek-duration-fast', ms: 120, label: 'fast' },
      { name: '--traek-duration-normal', ms: 220, label: 'normal' },
      { name: '--traek-duration-slow', ms: 380, label: 'slow' },
    ] as token}
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <span style="width: 200px; font-size: 11px; color: #52525b;">{token.name}</span>
        <div style="height: 4px; background: #00d8ff; border-radius: 2px; width: {token.ms}px; transition: width 0.3s;"></div>
        <span style="font-size: 11px; color: #71717a;">{token.ms}ms</span>
      </div>
    {/each}
  </div>
</Story>

<Story name="Easing Gallery">
  <div style="font-family: var(--traek-font-mono, monospace); padding: 24px;">
    <h3 style="margin-bottom: 16px; font-size: 14px; color: #71717a;">Easing Curves</h3>
    {#each [
      { name: 'standard', label: 'Standard', value: 'cubic-bezier(0.2, 0, 0, 1)' },
      { name: 'decelerate', label: 'Decelerate (enter)', value: 'cubic-bezier(0, 0, 0.2, 1)' },
      { name: 'accelerate', label: 'Accelerate (exit)', value: 'cubic-bezier(0.4, 0, 1, 1)' },
      { name: 'spring', label: 'Spring (emphasis)', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      { name: 'linear', label: 'Linear (loops)', value: 'linear' },
    ] as curve}
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
        <span style="width: 180px; font-size: 11px; color: #52525b;">--traek-ease-{curve.name}</span>
        <div
          style="
            width: 16px; height: 16px; border-radius: 50%; background: #00d8ff;
            animation: ease-demo-{curve.name} 1.8s var(--traek-ease-{curve.name}, {curve.value}) infinite alternate;
          "
        ></div>
        <span style="font-size: 11px; color: #71717a;">{curve.label}</span>
      </div>
    {/each}
  </div>
  <style>
    @keyframes ease-demo-standard { from { transform: translateX(0); } to { transform: translateX(200px); } }
    @keyframes ease-demo-decelerate { from { transform: translateX(0); } to { transform: translateX(200px); } }
    @keyframes ease-demo-accelerate { from { transform: translateX(0); } to { transform: translateX(200px); } }
    @keyframes ease-demo-spring { from { transform: translateX(0); } to { transform: translateX(200px); } }
    @keyframes ease-demo-linear { from { transform: translateX(0); } to { transform: translateX(200px); } }
  </style>
</Story>

<Story name="Node Appear">
  <div style="padding: 32px;">
    <button onclick={toggleNode} style="margin-bottom: 24px; padding: 8px 16px; background: #00d8ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
      Trigger nodeAppear
    </button>
    {#if showNode}
      <div
        in:nodeAppear={{ duration: 220 }}
        style="
          background: #0e0e10; border: 1px solid #1f1f24; border-radius: 12px;
          padding: 20px; width: 280px; color: #e4e4e7; font-family: system-ui, sans-serif;
        "
      >
        <div style="font-size: 12px; color: #52525b; margin-bottom: 8px;">assistant</div>
        <p style="margin: 0; font-size: 14px;">This node appeared with the nodeAppear transition.</p>
      </div>
    {/if}
  </div>
</Story>

<Story name="Panel Expand/Collapse">
  <div style="padding: 32px; width: 300px;">
    <button onclick={togglePanel} style="width: 100%; padding: 10px 16px; background: #0e0e10; border: 1px solid #1f1f24; border-radius: 8px; color: #e4e4e7; cursor: pointer; font-size: 13px; text-align: left;">
      {showPanel ? '▼' : '▶'} Thought Process
    </button>
    {#if showPanel}
      <div
        transition:panelSlide={{ duration: 180 }}
        style="background: #111113; border: 1px solid #1f1f24; border-top: none; border-radius: 0 0 8px 8px; padding: 16px; color: #71717a; font-size: 13px;"
      >
        The model reasoned through this response using chain-of-thought analysis across three dimensions…
      </div>
    {/if}
  </div>
</Story>

<Story name="Connection Draw">
  <div style="padding: 32px;">
    <button onclick={toggleConnection} style="margin-bottom: 24px; padding: 8px 16px; background: #00d8ff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
      Draw connection
    </button>
    <svg width="300" height="120" style="overflow: visible;">
      <circle cx="40" cy="60" r="20" fill="#0e0e10" stroke="#1f1f24" stroke-width="1.5"/>
      <circle cx="260" cy="60" r="20" fill="#0e0e10" stroke="#1f1f24" stroke-width="1.5"/>
      {#if showConnection}
        <path
          d="M 60 60 C 140 60, 140 60, 240 60"
          fill="none"
          stroke="#00d8ff"
          stroke-width="1.5"
          in:connectionDraw={{ duration: 380 }}
        />
      {/if}
    </svg>
  </div>
</Story>

<Story name="Hover States">
  <div style="padding: 32px; display: flex; gap: 16px; flex-wrap: wrap;">
    {#each ['Node card', 'Button', 'Badge'] as label}
      <div
        style="
          background: #0e0e10; border: 1px solid #1f1f24; border-radius: 12px; padding: 16px 20px;
          color: #e4e4e7; font-size: 13px; cursor: pointer;
          transition:
            border-color var(--traek-duration-instant, 80ms) var(--traek-ease-standard, cubic-bezier(0.2,0,0,1)),
            box-shadow var(--traek-duration-instant, 80ms) var(--traek-ease-standard, cubic-bezier(0.2,0,0,1));
        "
        role="button"
        tabindex="0"
        onmouseenter={(e) => { (e.target as HTMLElement).style.borderColor = '#00d8ff'; (e.target as HTMLElement).style.boxShadow = '0 0 0 1px rgba(0,216,255,0.15)'; }}
        onmouseleave={(e) => { (e.target as HTMLElement).style.borderColor = '#1f1f24'; (e.target as HTMLElement).style.boxShadow = 'none'; }}
      >
        {label}
      </div>
    {/each}
  </div>
</Story>
```

### Step 3: Verify Storybook compiles

```bash
cd packages/svelte && pnpm run storybook --ci 2>&1 | head -30
```

If Storybook doesn't support `--ci`, just run the type-check:

```bash
cd packages/svelte && npx svelte-check --tsconfig tsconfig.json 2>&1 | head -40
```
Expected: 0 errors.

### Step 4: Commit

```bash
git add packages/svelte/src/lib/stories/MotionSystem.stories.svelte
git commit -m "feat(storybook): add MotionSystem showcase with all animation categories"
```

---

## Task 10: Full quality gate

**Files:** None — verification only.

### Step 1: Run full lint + type-check + test suite

```bash
cd packages/svelte && pnpm run lint && pnpm run check && pnpm run test
```
Expected: 0 lint errors, 0 type errors, all tests pass.

### Step 2: Check bundle size delta

```bash
cd packages/svelte && pnpm run build 2>&1 | tail -20
```

Check the output for any `motion` chunk. The `motion.ts` file should contribute < 1KB gzipped.

### Step 3: Verify `prefers-reduced-motion` in DevTools

Open the Storybook `Node Appear` story, open Chrome DevTools → Rendering panel → enable "Emulate CSS media feature prefers-reduced-motion: reduce". Trigger the animation — it should be near-instant (50ms opacity only, no scale/translate).

### Step 4: Final commit if any minor fixes

```bash
git add -p
git commit -m "fix(motion): address any lint/type issues from full quality gate"
```

---

## Summary

| Task | Key output |
|---|---|
| 1 | `tokens.json` + easing/delay/instant |
| 2 | Zod schemas for new tokens |
| 3 | `themes.ts` updated for all themes |
| 4 | CSS vars in `ThemeProvider.svelte` |
| 5 | `motion.ts` with 3 transition factories |
| 6 | Library index exports |
| 7 | `TraekNodeWrapper.svelte` refactored |
| 8 | `ConnectionLayer.svelte` draw animation |
| 9 | Storybook motion showcase |
| 10 | Quality gate pass |

**Estimated bundle delta:** ~700B (gzipped). Well under 5KB.
