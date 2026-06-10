# Repo Audit — Optimization TODO

Findings from a full repo audit (security, performance, a11y, UX, i18n, infrastructure).
Organized into parallel workstreams with strict file ownership. Severity: **H**igh / **M**edium / **L**ow.

> **Status: all checklist items implemented** (see Deferred section for intentional exceptions).
> Verified: `pnpm run lint` ✅ · `pnpm run check` ✅ (svelte-check 0 errors/0 warnings) · 810 SDK unit tests ✅.
> Playwright e2e not runnable in the sandbox (browser download blocked by network policy).

---

## WS1 — Web app security & robustness (`apps/web/**`)

- [x] **H** `api/chat/+server.ts:16` — `role: z.string()` accepts arbitrary roles incl. `system`; restrict to `z.enum(['user', 'assistant'])` and prepend a server-controlled system prompt.
- [x] **H** `api/chat/+server.ts:12-21` — no `.max()` on message count/content length → cost abuse. Bound messages (≤40), content (≤8k chars).
- [x] **H** `api/image/+server.ts:45-63` — no Zod validation at all; `prompt` unbounded, `size` passed through verbatim. Add Zod schema with prompt max length and `size` enum.
- [x] **H** `api/resolve-actions/+server.ts:13-19` — unbounded `actions` array/description length interpolated into prompt. Cap (≤20 actions, ≤200 chars description).
- [x] **H** `lib/server/rate-limit.ts:20` — rate-limit key shared across all three endpoints (chat/image/resolve-actions pollute each other's quota). Namespace key as `${route}:${ip}`.
- [x] **H** rate limiting broken behind reverse proxies (`getClientAddress()` returns proxy IP). Document `ADDRESS_HEADER`/`XFF_DEPTH` in `.env.example` and README deploy notes.
- [x] **M** `api/chat/+server.ts:76,104-133` — no abort propagation (`signal: request.signal`) and no `cancel()` on the ReadableStream → OpenAI keeps generating after client disconnect.
- [x] **M** `api/chat/+server.ts:106-131` — stream read errors swallowed by `try/finally` → truncated content marked `done`. Add `catch` → `controller.error(e)`.
- [x] **M** upstream OpenAI error bodies echoed verbatim to clients (chat:93, image:80-84, resolve-actions:99-100,122-128) → leaks org/billing details. Log server-side, return generic error.
- [x] **M** `api/resolve-actions/+server.ts:111-117` — model output `JSON.parse`d and returned unvalidated; filter `actionIds` against submitted action ids with Zod.
- [x] **M** `lib/server/rate-limit.ts:6,24-26` — Map grows unboundedly within a day (IPv6 abuse). Cap entries (simple max-size eviction).
- [x] **M** no security headers / CSP. Add `hooks.server.ts` with `X-Content-Type-Options`, `Referrer-Policy`, and configure `kit.csp` (script-src self + umami host).
- [x] **M** `demo/[id]/+page.svelte:100-141` + `demo/+page.svelte:12` — unhandled promise rejections in init → infinite spinner. Wrap in try/catch, set error state.
- [x] **L** quota consumed before body validation (all 3 endpoints) — validate first, then consume rate-limit token.
- [x] **L** `demo/[id]/+page.svelte:116-121` — unknown URL id silently saves under client-chosen key; redirect to the new id instead.

## WS2 — SDK rendering security (`packages/sdk/src/lib/utils.ts`, `TextNode.svelte`)

- [x] **H** `utils.ts:31-35` + `TextNode.svelte:116,123,276` — markdown rendered via `{@html}` with **no sanitization**; `dompurify` is declared but never imported. Sanitize `marked.parse()` output with DOMPurify (keep `target`/`rel` attrs).
- [x] **H** `utils.ts:33` — `javascript:`/`data:` href schemes not blocked (covered by DOMPurify defaults; verify).
- [x] **H** `utils.ts:3` — full `highlight.js` import (~1 MB) although only 3 languages are registered; switch to `highlight.js/lib/core`.
- [x] **L** add marked link renderer: `target="_blank" rel="noopener noreferrer"` on links.
- [x] **M** `TextNode.svelte:263` — `<div>` with dblclick handler lacks ARIA role (compiler a11y warning); textarea in edit mode (239-251) lacks `aria-label`.
- [x] **M** `TextNode.svelte:386` — `.scroll-hint` default `#444` on dark ≈ 2.2:1 contrast; raise default.
- [x] **L** `TextNode.svelte:407-411` — `blink` animation lacks `prefers-reduced-motion` exemption.

## WS3 — TraekEngine performance & correctness (`packages/sdk/src/lib/TraekEngine.svelte.ts` + engine tests)

- [x] **H** `:659-667` — `deleteNodeAndDescendants` BFS scans all nodes per queue item (O(n·m)); build reverse-adjacency map once.
- [x] **M** `:235-246` — `contextPath` is `$derived(() => ...)` (derives a constant function, zero memoization); convert to `$derived.by` and update call sites.
- [x] **M** `:44` — `wouldCreateCycle` does `nodes.find` inside DFS (O(V·E)); use a node-lookup map.
- [x] **M** `:589-607` — `deleteNode` leaves dangling `parentIds` on surviving children and a stale `childrenIdMap` entry; also redundant `rebuildNodeIndexMap()` after manual delete.
- [x] **L** `:1152` — `matches.length > 0 ? 0 : 0` dead logic.
- [x] **L** `:716` — `structuredClone($state.snapshot(n))` double deep-clone; `$state.snapshot` suffices.
- [x] **L** `:161-163` — `0 as unknown as ReturnType<typeof setTimeout>` unsafe cast; type as `| undefined`.
- [x] **L** `:383-398` — `addNodes` topological sort is O(n²); use Kahn's algorithm.
- [x] **L** `:615,637,660,1065` — BFS helpers use `Array.shift()` (O(n) per pop); use index pointer.
- [x] **L** `:992-1004` — `getMaxDepth` re-walks chains per leaf; memoize depths in one pass.
- [x] **M** expose a monotonic mutation `version` counter (bumped on every node mutation) so consumers (auto-save) can track deep changes cheaply (needed by WS5).

## WS4 — Canvas performance (`TraekCanvas.svelte`, `canvas/*.svelte(.ts)` except a11y-only files, `TraekNodeWrapper.svelte`, `Ghost.svelte`)

- [x] **H** `TraekCanvas.svelte:155-165` + `ViewportTracker.svelte.ts:93-123` — `visibleNodeIds` recomputed O(n·depth) on every mousemove/wheel; new ViewportTracker + new Map per run. Hoist/reuse maps, memoize collapsed cache, rAF-throttle the viewport-bounds input.
- [x] **H** `TraekNodeWrapper.svelte:78-94` — per-node `engine.nodes.find/filter` → O(n²); back `childrenIdMap` with `SvelteMap` and use `engine.getChildren()`.
- [x] **H** `CanvasInteraction.svelte.ts:177-182` → `TraekEngine` `layoutChildren` — full uncached recursive layout per drag mousemove; use the cached layout path batched in rAF.
- [x] **M** `ConnectionLayer.svelte:126-157` — gradient defs rendered for every edge ignoring virtualization; apply same visibility guard as paths.
- [x] **M** `ViewportManager.svelte.ts:31-59` — `clampOffset` full O(n) bounds scan per pan/zoom event; cache bounding box, invalidate on layout.
- [x] **M** `TraekCanvas.svelte:121-152` — `config` `$derived` object identity recreates ViewportManager/CanvasInteraction (resets pan/zoom) when parent re-renders; key effects on stable fields.
- [x] **M** `scrollUtils.ts:2-19` — `getComputedStyle` ancestor walk per wheel event; cache per-target (WeakMap).
- [x] **M** O(n) `nodes.find` where `engine.getNode` exists: `CanvasInteraction.svelte.ts:57,121,259`, `ViewportManager.svelte.ts:70`, `TraekCanvas.svelte:248,439,466,538,557,698,713,779`.
- [x] **M** `NodeRenderer.svelte:49` — `isInCollapsedSubtree` O(depth) per node uncached; hoist a `$derived` collapsed cache with empty-set early return.
- [x] **M** `ViewportManager.svelte.ts:66-107` — outer double-rAF of `centerOnNode` untracked → animation can run after `destroy()`; track/cancel.
- [x] **M** `TraekNodeWrapper.svelte:56-64` — self-reading/writing `$effect` (use plain var + `untrack`) and uncleaned 300 ms timeout.
- [x] **M** `TraekCanvas.svelte:128` — `state_referenced_locally` compiler warning (`setTraekI18n(translationsProp)`); silence intentionally or restructure.
- [x] **H (a11y)** `TraekNodeWrapper.svelte:282,305` — Enter double-toggles thought pill (redundant `onkeydown` without `preventDefault`); remove handlers.
- [x] **L** `TraekCanvas.svelte:472-483` — uncleaned celebration/sendFlash timers writing state after unmount.
- [x] **L** `TraekCanvas.svelte:392-405` — global Ctrl+F listener active in all modes/instances; gate on canvas mode and focus containment.
- [x] **L** `TraekCanvas.svelte:810` — per-render `filter().length`; hoist `$derived` count.
- [x] **L** `ConnectionLayer.svelte:235` / `TraekCanvas.svelte:658,896-898` — hardcoded 25000 SVG offset; extract shared constant.
- [x] **L** `TraekNodeWrapper.svelte:116-131` — per-node IntersectionObserver duplicates virtualization; share one observer or rely on `visibleNodeIds`.
- [x] **L** `Ghost.svelte:1` — legacy `{...$$props}` API; convert to runes `$props()`, default `aria-hidden="true"`.
- [x] **L** `TraekNodeWrapper.svelte:483` — `.node-header` default `#666` contrast ≈ 3.2:1; raise default.
- [x] **L** `TraekNodeWrapper.svelte:899-906` — collapse toggle 20×20px touch target; enlarge on mobile media query.

## WS5 — Persistence & actions (`packages/sdk/src/lib/persistence/**` except ChatList/SaveIndicator UI strings, `actions/*.svelte.ts`, `node-types/`)

- [x] **H** `ConversationStore.svelte.ts:275-276` — auto-save `$effect` tracks only array identity; in-place mutations (streaming `updateNode`, drags, status) never trigger a save. Track engine mutation version (WS3) or deep snapshot.
- [x] **H** `indexedDBAdapter.ts:56-79` — `put`/`delete` resolve on `request.onsuccess` not `tx.oncomplete`, no `onabort`/`onerror` → quota-abort writes silently "succeed". Resolve on `tx.oncomplete`, reject on abort/error.
- [x] **H** `ConversationStore.svelte.ts:483-485` — localStorage quota errors swallowed → `saved` shown though nothing persisted; rethrow so saveState becomes `error`.
- [x] **H** `ConversationStore.svelte.ts:279-306` — debounced autosave dropped on `disableAutoSave()`/`destroy()`/page unload; flush pending save on disable + `pagehide` listener.
- [x] **M** `ConversationStore.svelte.ts:151-182,206-227` — unserialized read-modify-write races (autosave vs rename/save) lose updates; serialize per-conversation via promise chain.
- [x] **M** `ConversationStore.svelte.ts:352-363,453-463` — list/localStorage/migration paths skip Zod validation; one corrupt record breaks the whole list. `safeParse` and skip invalid.
- [x] **M** `ConversationStore.svelte.ts:179` — every autosave triggers full-DB `refreshList()`; update only the affected list entry.
- [x] **M** `schemas.ts:59` — `version: z.literal(1)` dead end: future versions silently return `null`; distinguish unsupported-version from not-found, structure for migrations.
- [x] **M** `ConversationStore.svelte.ts:17,23` vs `indexedDBAdapter.ts:6,20` — documented `dbName` option never passed to `openDB()`.
- [x] **M** `exportUtils.ts:80-95` — thread DFS lacks cycle guard (stack overflow on cyclic snapshots) and is O(n²)/exponential on DAGs; visited tracking + precomputed children map + thread cap.
- [x] **M** `ReplayController.svelte.ts:109,152` — `seekTo`/`reset` swap the non-reactive `engine` field; bound components keep stale engine. Mutate within one engine instance or make reactive.
- [x] **M** `ActionResolver.svelte.ts:125-145` — stale-response race (no per-request token), remote results unvalidated/unfiltered against known ids, no timeout/AbortSignal.
- [x] **L** `ActionResolver.svelte.ts:46-49` — slash-command branch returns without `cancelDebounce()`.
- [x] **L** `ActionResolver.svelte.ts:22,137` — unbounded resolve cache; cap size.
- [x] **L** `ConversationStore.svelte.ts:187-201` — localStorage `delete()` never prunes the list key.
- [x] **L** `ConversationStore.svelte.ts:19,25` — `maxConversations` documented but never enforced.
- [x] **L** `ConversationStore.svelte.ts:525-604` — legacy migration: one bad entry aborts all, re-runs forever; per-entry try/catch + cleanup.
- [x] **L** `ConversationStore.svelte.ts:58-80` — `init()` not memoized; concurrent calls run migration twice.
- [x] **L** `ConversationStore.svelte.ts:85-92` — `destroy()` leaks `saveStateResetTimeout`.
- [x] **L** `indexedDBAdapter.ts:20-36` — no `onblocked`/`onversionchange` handlers (multi-tab upgrade hangs).
- [x] **L** `indexedDBAdapter.ts:123-139` — `isIndexedDBAvailable` broken and unused; remove or fix.
- [x] **L** `exportUtils.ts:22,113-119` — markdown export: escape title newlines/`#`, render content safely.
- [x] **L** `ReplayController.svelte.ts:35-41` — snapshot/config trusted without Zod validation.
- [x] **L** `NodeTypeRegistry.svelte.ts:13-18` — `register()` skips the existing `nodeTypeDefinitionSchema`; validate.

## WS6 — Infrastructure, packaging, CI, MCP server, docs

- [x] **H** `packages/sdk/package.json:16-20` — published package ships `*.stories.svelte` + `dist/stories/` importing non-existent `@storybook/addon-svelte-csf`; exclude from `files`.
- [x] **H** `.github/workflows/publish.yml` — runs on every main push (re-publish fails) and `pnpm publish` fails on detached HEAD; gate on version change/tag + `--no-git-checks`.
- [x] **H** `.github/workflows/ci.yml:54,69-80` — coverage uploaded from wrong dir, `coverage-summary.json` reporter never configured; fix paths + add `json-summary` reporter.
- [x] **H** root `package.json:7-8` — `dev` has unreachable `&& pnpm run turbo watch` (nonexistent script), `watch` lacks task arg; fix both.
- [x] **H** Node version drift: `.nvmrc` = 24 vs CI/Dockerfiles on 22; use `node-version-file: .nvmrc` + `node:24-alpine`.
- [x] **H** turbo race: `turbo check` runs `traek:check` and `traek:build` concurrently in the same dir → `.svelte-kit` ENOTEMPTY; serialize (e.g. sdk `check` dependsOn `build` or dedicated sync task).
- [x] **M** `packages/sdk/package.json:10-15` — exports map lacks `default` condition after `svelte`; non-Vite resolvers can't import the package.
- [x] **M** `apps/web/package.json` — unused deps `@iconify/svelte`, `dompurify`, `marked`, `marked-highlight`, `vitest`; remove.
- [x] **M** dead code: `persistence/ReplayControls.svelte` (stale duplicate of `replay/ReplayControls.svelte`), unused barrels `persistence/index.ts`(line 2 export)/`replay/index.ts` — delete stale duplicate, fix barrels.
- [x] **M** vestigial pre-monorepo root files that can't even load: root `vite.config.ts`, `svelte.config.js`, `vitest.shims.d.ts`, `.storybook/`; delete.
- [x] **M** stray 6.4k-line `package-lock.json` (pre-monorepo) in pnpm repo; delete + gitignore.
- [x] **M** `CLAUDE.md` describes old single-package layout (src/lib at root, npm scripts, storybook, 3 vitest projects); rewrite for monorepo reality.
- [x] **M** CI: no turbo cache (`actions/cache` for `.turbo`); check+build jobs duplicate identical builds.
- [x] **M** Docker: runner stages run as root (`Dockerfile`, `docker/mcp.Dockerfile`); add `USER node` + `--chown`.
- [x] **M** pin GitHub Actions to commit SHAs (at minimum in `publish.yml` which holds `id-token: write`); resolve via `git ls-remote`.
- [x] **M** `servers/mcp/src/index.ts:60-77` — HTTP handler: no try/catch (unhandled rejection hangs response), per-request server/transport never closed, invalid JSON swallowed then stream already consumed; fix all three.
- [x] **L** `servers/mcp/src/index.ts:73,79` — 0.0.0.0 with no DNS-rebinding protection; enable `enableDnsRebindingProtection`/`allowedHosts` or default to localhost.
- [x] **L** `servers/mcp` — deprecated `server.tool()` overload with `as any`; migrate to `registerTool` + zod v4 imports; align package.json SDK version range.
- [x] **L** `servers/mcp/src/resources/docs.ts:95-133` — "not found" returned as successful resource read; raise MCP error.
- [x] **L** `.npmrc` `engine-strict=true` with no `engines` anywhere; add `engines` to root.
- [x] **L** `turbo.json` — `format`/`clean` cacheable (must be `cache: false`), `lint` needlessly dependsOn `^lint`, `test` missing coverage outputs, build outputs include full `.svelte-kit/**`.
- [x] **L** `README.md:353-370` — MCP package documented as `@gettraek/mcp` but actual name is `@traek/mcp` and unpublished; align.
- [x] **L** `backlog.md` lists Minimap as unprioritized though shipped; `CHANGELOG.md` stuck at 0.0.1 (current 0.0.3); update.
- [x] **L** `apps/web` uses `npm run` inside scripts/playwright config in a pnpm repo; switch to pnpm.
- [x] **L** `apps/docs` has no `check` script → never type-checked in CI; add `astro check`.
- [x] **L** `packages/sdk/src/app.html` vestigial; sdk package.json missing `homepage`/`bugs`. _(Note: app.html kept — `svelte-check` requires it even though `svelte-kit sync` does not.)_

## WS7 — i18n keys (prerequisite for Wave 2; `packages/sdk/src/lib/i18n/types.ts` + `defaults.ts` only)

- [x] **H** Add all missing translation key sections (English defaults) needed by Wave 2: `focusMode`, `childSelector`, `positionIndicator`, `homeButton`, `swipeAffordances`, `chatList`, `saveIndicator`, `replayControls`, `tags`, `theme`, `compare`, `toast`, `nodeWrapper` (status/labels/retry/branches/hidden/expand-collapse), `minimap`, `nodeRenderer` (missing component), `searchBar` (match counter/no matches), `headerBar` (back label), `ghostPreview`.

## Wave 2A — Mobile + persistence UI: i18n + a11y (`mobile/**`, `persistence/ChatList.svelte`, `SaveIndicator.svelte`, `ReplayControls.svelte` (replay/), `TraekNodeWrapper` strings)

- [x] **H** entire `mobile/` tree ships hardcoded German (FocusMode, KeyboardCheatsheet, PositionIndicator, ChildSelector, Breadcrumbs, HomeButton, SwipeAffordances); route through `getTraekI18n()`.
- [x] **H** `mobile/OnboardingOverlay.svelte:61-68` — global Enter/Space handler swallows focused Skip button activation.
- [x] **H** `persistence/ChatList.svelte:114-178` (×4 blocks) — nested interactive elements (`div role="button"` wrapping buttons); restructure.
- [x] **H** `persistence/ChatList.svelte:541-548` — row actions invisible on keyboard focus; add `:focus-within`.
- [x] **M** `ChatList.svelte` — all strings hardcoded English (confirm, relative times, group titles, empty state); i18n. Replace native `confirm()` (L).
- [x] **M** `mobile/FocusMode.svelte:483-507` — click-only reply-context expander; make it a button with `aria-expanded`.
- [x] **M** `persistence/SaveIndicator.svelte:25-51` — hardcoded strings; i18n.
- [x] **M** `replay/ReplayControls.svelte` — unlabeled range slider, speed buttons lack `aria-pressed`; + i18n.
- [x] **M** `TraekNodeWrapper.svelte` — hardcoded user-facing strings (status, retry, branches, hidden count, expand/collapse); i18n.
- [x] **L** `mobile/ChildSelector.svelte:133-134` — invalid `role="list"` semantics, index-keyed `{#each}`; key by id.
- [x] **L** `mobile/Breadcrumbs.svelte` — index-keyed each, no nav landmark, `$derived(() =>)` function anti-pattern.
- [x] **L** ChatList unused CSS selectors `.header`/`.new-chat`.

## Wave 2B — Overlays, canvas chrome, misc components: a11y + i18n (`keyboard/**`, `onboarding/**`, `canvas/InputForm|Minimap|ZoomControls|ContextBreadcrumb|GhostPreview|NodeRenderer` (string only), `tags/**`, `theme/**`, `compare/**`, `toast/**`, `search/SearchBar`, `conversation/HeaderBar`, `DefaultLoadingOverlay`, `a11y/`)

- [x] **H** `toast/Toast.svelte:64` — literal `✕` rendered as text instead of ✕.
- [x] **H** `toast/Toast.svelte:55` — no `role="status"`/`aria-live`; toasts never announced.
- [x] **H** `canvas/ZoomControls.svelte:49-84` + `canvas/Minimap.svelte:159` — redundant Enter `onkeydown` double-fires (zoom jumps, minimap toggle no-ops); remove handlers.
- [x] **H** `onboarding/TourStep.svelte:92-102` — global Enter/Space handler breaks focused Back/Skip buttons.
- [x] **H** `onboarding/TourStep.svelte:34-52` — highlight target computed only in `onMount`; never moves between steps. Recompute in `$effect`.
- [x] **H** `keyboard/FuzzySearchOverlay.svelte:109` — `aria-labelledby` points to non-existent id.
- [x] **M** no overlay implements focus trap/initial focus/restore despite `aria-modal="true"`: FuzzySearchOverlay, KeyboardHelpOverlay, BranchCompare, TourStep (+ mobile overlays in 2A). Add a shared focus-trap action.
- [x] **M** `FuzzySearchOverlay` — no combobox wiring (`aria-activedescendant`), selected option not scrolled into view.
- [x] **M** `actions/SlashCommandDropdown` + `canvas/InputForm.svelte:88` — listbox without combobox wiring on textarea; textarea lacks `aria-label`; branch celebration banner lacks `role="status"`.
- [x] **M** `NodeToolbar.svelte:82-89` — `role="toolbar"` without roving arrow-key focus; implement or drop role.
- [x] **M** `tags/TagDropdown.svelte`, `tags/TagFilter.svelte` — hardcoded strings, missing `aria-pressed`, no Escape/outside-click close.
- [x] **M** `theme/ThemePicker.svelte` — hardcoded strings, no Escape/outside-click close.
- [x] **M** `compare/BranchCompare.svelte` — hardcoded strings; added diff segments color-only (add underline).
- [x] **M** `conversation/HeaderBar.svelte:36,149-152` — back link loses accessible name <360px; add `aria-label`; i18n default.
- [x] **M** `canvas/Minimap.svelte:108,157` — hardcoded aria labels; i18n.
- [x] **M** `canvas/NodeRenderer.svelte:110` — hardcoded missing-component message; i18n (string swap only — file owned by WS4 for perf, coordinate).
- [x] **M** `DefaultLoadingOverlay.svelte:7-12` — no `role="status"`/`aria-busy`.
- [x] **L** `search/SearchBar.svelte:81-87` — match counter without `aria-live`; debounce search-as-you-type (~150 ms) to avoid full O(n) scan + camera animation per keystroke.
- [x] **L** `canvas/ContextBreadcrumb.svelte` — `$derived(() =>)` function anti-pattern, no nav landmark, index-keyed each.
- [x] **L** `canvas/GhostPreview.svelte:50` — decorative preview announced to SRs; `aria-hidden`.
- [x] **L** infinite animations without `prefers-reduced-motion` exemption (`ActionBadges` pulse, canvas empty-state bounce, SaveIndicator spinner).
- [x] **L** `toast/Toast.svelte:23-43` — auto-dismiss not pausable on hover/focus (undo window).
- [x] **L** touch targets <44px: TagBadges remove buttons, Breadcrumbs rows, Minimap toggle, SearchBar nav buttons.

## Round 2 — review findings (all fixed)

A second audit round (full-diff review + fresh sweep) found and fixed:

- [x] **H** `TraekEngine.deleteNode` undo: restoring a deleted parent permanently re-parented its children — stripped child edges are now recorded and re-linked on `restoreDeleted()`.
- [x] **H** `KeyboardNavigator` hijacked `/` from every input (slash commands untypable) and swallowed ctrl/meta/alt shortcuts; inputs are now ignored entirely.
- [x] **H** `/api/chat` Zod schema rejected payloads the demo client legitimately sends (system debug nodes in path, >8k assistant replies, >40-message threads) — server coerces (filter/slice/window), client sanitizes.
- [x] **H** apps/docs API pages documented a fabricated API (object-form `addNode`, `parentId`, `moveNode`, `focusedNodeId`, `components` prop, invented config fields) — rewritten against the real surface.
- [x] **M** `ConversationStore.destroy()` closed IndexedDB before the flushed autosave ran (final save lost to localStorage) — teardown chained on the flush.
- [x] **M** `ReplayController` backward seek fired an undo toast per deleted node — `onNodeDeleted` suppressed during seeks.
- [x] **M** `ViewportTracker` node-map cache went stale on delete-then-add (same array identity+length) — per-frame expiry.
- [x] **M** ThemePicker/ThemeProvider clobbered the system light preference set pre-hydration; prop-driven theme switches didn't apply CSS vars.
- [x] **M** Toast hover-pause reached into the store's private timer map via cast — replaced with public `claimTimer`/`releaseTimer` API; pause respects focus.
- [x] **M** rate-limiter eviction removed the most-active keys first (insertion order) — recency refreshed on update.
- [x] **M** chat stream logged a fake upstream error on every client disconnect.
- [x] **M** `GravityDotsBackground` ran an unconditional 60fps loop with per-frame `getComputedStyle` — idles when converged, honors reduced motion.
- [x] **M** KeyboardNavigator SR announcements and predefined tag labels bypassed i18n; `InputForm` did O(n) scans per render; stream-complete pulse could stick.
- [x] **L** `highlightMatch` duplicated text on overlapping matches; `createCustomTheme` broke on 3-digit hex; LiveRegion role for assertive; ChatList floating delete promise; landing code sample invalid; CI turbo cache key collisions; MCP empty allowlist guard.

## Deferred (intentionally not done)

- **TraekCanvas `role="tree"` restructure** (a11y #20): correct fix needs an interaction-model decision (roving tabindex over treeitems vs `role="application"`); too invasive for this pass.
- **Move marked/highlight.js/dompurify to optional peerDependencies** (infra M2): semver-major packaging change for consumers; needs a maintainer decision.
- **CI e2e job for Playwright**: requires browser downloads in CI; worth doing but as deliberate follow-up with caching strategy.
- **Iconify runtime network dependency**: swapping `@iconify/svelte` for build-time icons is a larger refactor.
