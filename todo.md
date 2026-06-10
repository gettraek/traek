# Repo Audit — Optimization TODO

Findings from a full repo audit (security, performance, a11y, UX, i18n, infrastructure).
Organized into parallel workstreams with strict file ownership. Severity: **H**igh / **M**edium / **L**ow.

---

## WS1 — Web app security & robustness (`apps/web/**`)

- [ ] **H** `api/chat/+server.ts:16` — `role: z.string()` accepts arbitrary roles incl. `system`; restrict to `z.enum(['user', 'assistant'])` and prepend a server-controlled system prompt.
- [ ] **H** `api/chat/+server.ts:12-21` — no `.max()` on message count/content length → cost abuse. Bound messages (≤40), content (≤8k chars).
- [ ] **H** `api/image/+server.ts:45-63` — no Zod validation at all; `prompt` unbounded, `size` passed through verbatim. Add Zod schema with prompt max length and `size` enum.
- [ ] **H** `api/resolve-actions/+server.ts:13-19` — unbounded `actions` array/description length interpolated into prompt. Cap (≤20 actions, ≤200 chars description).
- [ ] **H** `lib/server/rate-limit.ts:20` — rate-limit key shared across all three endpoints (chat/image/resolve-actions pollute each other's quota). Namespace key as `${route}:${ip}`.
- [ ] **H** rate limiting broken behind reverse proxies (`getClientAddress()` returns proxy IP). Document `ADDRESS_HEADER`/`XFF_DEPTH` in `.env.example` and README deploy notes.
- [ ] **M** `api/chat/+server.ts:76,104-133` — no abort propagation (`signal: request.signal`) and no `cancel()` on the ReadableStream → OpenAI keeps generating after client disconnect.
- [ ] **M** `api/chat/+server.ts:106-131` — stream read errors swallowed by `try/finally` → truncated content marked `done`. Add `catch` → `controller.error(e)`.
- [ ] **M** upstream OpenAI error bodies echoed verbatim to clients (chat:93, image:80-84, resolve-actions:99-100,122-128) → leaks org/billing details. Log server-side, return generic error.
- [ ] **M** `api/resolve-actions/+server.ts:111-117` — model output `JSON.parse`d and returned unvalidated; filter `actionIds` against submitted action ids with Zod.
- [ ] **M** `lib/server/rate-limit.ts:6,24-26` — Map grows unboundedly within a day (IPv6 abuse). Cap entries (simple max-size eviction).
- [ ] **M** no security headers / CSP. Add `hooks.server.ts` with `X-Content-Type-Options`, `Referrer-Policy`, and configure `kit.csp` (script-src self + umami host).
- [ ] **M** `demo/[id]/+page.svelte:100-141` + `demo/+page.svelte:12` — unhandled promise rejections in init → infinite spinner. Wrap in try/catch, set error state.
- [ ] **L** quota consumed before body validation (all 3 endpoints) — validate first, then consume rate-limit token.
- [ ] **L** `demo/[id]/+page.svelte:116-121` — unknown URL id silently saves under client-chosen key; redirect to the new id instead.

## WS2 — SDK rendering security (`packages/sdk/src/lib/utils.ts`, `TextNode.svelte`)

- [ ] **H** `utils.ts:31-35` + `TextNode.svelte:116,123,276` — markdown rendered via `{@html}` with **no sanitization**; `dompurify` is declared but never imported. Sanitize `marked.parse()` output with DOMPurify (keep `target`/`rel` attrs).
- [ ] **H** `utils.ts:33` — `javascript:`/`data:` href schemes not blocked (covered by DOMPurify defaults; verify).
- [ ] **H** `utils.ts:3` — full `highlight.js` import (~1 MB) although only 3 languages are registered; switch to `highlight.js/lib/core`.
- [ ] **L** add marked link renderer: `target="_blank" rel="noopener noreferrer"` on links.
- [ ] **M** `TextNode.svelte:263` — `<div>` with dblclick handler lacks ARIA role (compiler a11y warning); textarea in edit mode (239-251) lacks `aria-label`.
- [ ] **M** `TextNode.svelte:386` — `.scroll-hint` default `#444` on dark ≈ 2.2:1 contrast; raise default.
- [ ] **L** `TextNode.svelte:407-411` — `blink` animation lacks `prefers-reduced-motion` exemption.

## WS3 — TraekEngine performance & correctness (`packages/sdk/src/lib/TraekEngine.svelte.ts` + engine tests)

- [ ] **H** `:659-667` — `deleteNodeAndDescendants` BFS scans all nodes per queue item (O(n·m)); build reverse-adjacency map once.
- [ ] **M** `:235-246` — `contextPath` is `$derived(() => ...)` (derives a constant function, zero memoization); convert to `$derived.by` and update call sites.
- [ ] **M** `:44` — `wouldCreateCycle` does `nodes.find` inside DFS (O(V·E)); use a node-lookup map.
- [ ] **M** `:589-607` — `deleteNode` leaves dangling `parentIds` on surviving children and a stale `childrenIdMap` entry; also redundant `rebuildNodeIndexMap()` after manual delete.
- [ ] **L** `:1152` — `matches.length > 0 ? 0 : 0` dead logic.
- [ ] **L** `:716` — `structuredClone($state.snapshot(n))` double deep-clone; `$state.snapshot` suffices.
- [ ] **L** `:161-163` — `0 as unknown as ReturnType<typeof setTimeout>` unsafe cast; type as `| undefined`.
- [ ] **L** `:383-398` — `addNodes` topological sort is O(n²); use Kahn's algorithm.
- [ ] **L** `:615,637,660,1065` — BFS helpers use `Array.shift()` (O(n) per pop); use index pointer.
- [ ] **L** `:992-1004` — `getMaxDepth` re-walks chains per leaf; memoize depths in one pass.
- [ ] **M** expose a monotonic mutation `version` counter (bumped on every node mutation) so consumers (auto-save) can track deep changes cheaply (needed by WS5).

## WS4 — Canvas performance (`TraekCanvas.svelte`, `canvas/*.svelte(.ts)` except a11y-only files, `TraekNodeWrapper.svelte`, `Ghost.svelte`)

- [ ] **H** `TraekCanvas.svelte:155-165` + `ViewportTracker.svelte.ts:93-123` — `visibleNodeIds` recomputed O(n·depth) on every mousemove/wheel; new ViewportTracker + new Map per run. Hoist/reuse maps, memoize collapsed cache, rAF-throttle the viewport-bounds input.
- [ ] **H** `TraekNodeWrapper.svelte:78-94` — per-node `engine.nodes.find/filter` → O(n²); back `childrenIdMap` with `SvelteMap` and use `engine.getChildren()`.
- [ ] **H** `CanvasInteraction.svelte.ts:177-182` → `TraekEngine` `layoutChildren` — full uncached recursive layout per drag mousemove; use the cached layout path batched in rAF.
- [ ] **M** `ConnectionLayer.svelte:126-157` — gradient defs rendered for every edge ignoring virtualization; apply same visibility guard as paths.
- [ ] **M** `ViewportManager.svelte.ts:31-59` — `clampOffset` full O(n) bounds scan per pan/zoom event; cache bounding box, invalidate on layout.
- [ ] **M** `TraekCanvas.svelte:121-152` — `config` `$derived` object identity recreates ViewportManager/CanvasInteraction (resets pan/zoom) when parent re-renders; key effects on stable fields.
- [ ] **M** `scrollUtils.ts:2-19` — `getComputedStyle` ancestor walk per wheel event; cache per-target (WeakMap).
- [ ] **M** O(n) `nodes.find` where `engine.getNode` exists: `CanvasInteraction.svelte.ts:57,121,259`, `ViewportManager.svelte.ts:70`, `TraekCanvas.svelte:248,439,466,538,557,698,713,779`.
- [ ] **M** `NodeRenderer.svelte:49` — `isInCollapsedSubtree` O(depth) per node uncached; hoist a `$derived` collapsed cache with empty-set early return.
- [ ] **M** `ViewportManager.svelte.ts:66-107` — outer double-rAF of `centerOnNode` untracked → animation can run after `destroy()`; track/cancel.
- [ ] **M** `TraekNodeWrapper.svelte:56-64` — self-reading/writing `$effect` (use plain var + `untrack`) and uncleaned 300 ms timeout.
- [ ] **M** `TraekCanvas.svelte:128` — `state_referenced_locally` compiler warning (`setTraekI18n(translationsProp)`); silence intentionally or restructure.
- [ ] **H (a11y)** `TraekNodeWrapper.svelte:282,305` — Enter double-toggles thought pill (redundant `onkeydown` without `preventDefault`); remove handlers.
- [ ] **L** `TraekCanvas.svelte:472-483` — uncleaned celebration/sendFlash timers writing state after unmount.
- [ ] **L** `TraekCanvas.svelte:392-405` — global Ctrl+F listener active in all modes/instances; gate on canvas mode and focus containment.
- [ ] **L** `TraekCanvas.svelte:810` — per-render `filter().length`; hoist `$derived` count.
- [ ] **L** `ConnectionLayer.svelte:235` / `TraekCanvas.svelte:658,896-898` — hardcoded 25000 SVG offset; extract shared constant.
- [ ] **L** `TraekNodeWrapper.svelte:116-131` — per-node IntersectionObserver duplicates virtualization; share one observer or rely on `visibleNodeIds`.
- [ ] **L** `Ghost.svelte:1` — legacy `{...$$props}` API; convert to runes `$props()`, default `aria-hidden="true"`.
- [ ] **L** `TraekNodeWrapper.svelte:483` — `.node-header` default `#666` contrast ≈ 3.2:1; raise default.
- [ ] **L** `TraekNodeWrapper.svelte:899-906` — collapse toggle 20×20px touch target; enlarge on mobile media query.

## WS5 — Persistence & actions (`packages/sdk/src/lib/persistence/**` except ChatList/SaveIndicator UI strings, `actions/*.svelte.ts`, `node-types/`)

- [ ] **H** `ConversationStore.svelte.ts:275-276` — auto-save `$effect` tracks only array identity; in-place mutations (streaming `updateNode`, drags, status) never trigger a save. Track engine mutation version (WS3) or deep snapshot.
- [ ] **H** `indexedDBAdapter.ts:56-79` — `put`/`delete` resolve on `request.onsuccess` not `tx.oncomplete`, no `onabort`/`onerror` → quota-abort writes silently "succeed". Resolve on `tx.oncomplete`, reject on abort/error.
- [ ] **H** `ConversationStore.svelte.ts:483-485` — localStorage quota errors swallowed → `saved` shown though nothing persisted; rethrow so saveState becomes `error`.
- [ ] **H** `ConversationStore.svelte.ts:279-306` — debounced autosave dropped on `disableAutoSave()`/`destroy()`/page unload; flush pending save on disable + `pagehide` listener.
- [ ] **M** `ConversationStore.svelte.ts:151-182,206-227` — unserialized read-modify-write races (autosave vs rename/save) lose updates; serialize per-conversation via promise chain.
- [ ] **M** `ConversationStore.svelte.ts:352-363,453-463` — list/localStorage/migration paths skip Zod validation; one corrupt record breaks the whole list. `safeParse` and skip invalid.
- [ ] **M** `ConversationStore.svelte.ts:179` — every autosave triggers full-DB `refreshList()`; update only the affected list entry.
- [ ] **M** `schemas.ts:59` — `version: z.literal(1)` dead end: future versions silently return `null`; distinguish unsupported-version from not-found, structure for migrations.
- [ ] **M** `ConversationStore.svelte.ts:17,23` vs `indexedDBAdapter.ts:6,20` — documented `dbName` option never passed to `openDB()`.
- [ ] **M** `exportUtils.ts:80-95` — thread DFS lacks cycle guard (stack overflow on cyclic snapshots) and is O(n²)/exponential on DAGs; visited tracking + precomputed children map + thread cap.
- [ ] **M** `ReplayController.svelte.ts:109,152` — `seekTo`/`reset` swap the non-reactive `engine` field; bound components keep stale engine. Mutate within one engine instance or make reactive.
- [ ] **M** `ActionResolver.svelte.ts:125-145` — stale-response race (no per-request token), remote results unvalidated/unfiltered against known ids, no timeout/AbortSignal.
- [ ] **L** `ActionResolver.svelte.ts:46-49` — slash-command branch returns without `cancelDebounce()`.
- [ ] **L** `ActionResolver.svelte.ts:22,137` — unbounded resolve cache; cap size.
- [ ] **L** `ConversationStore.svelte.ts:187-201` — localStorage `delete()` never prunes the list key.
- [ ] **L** `ConversationStore.svelte.ts:19,25` — `maxConversations` documented but never enforced.
- [ ] **L** `ConversationStore.svelte.ts:525-604` — legacy migration: one bad entry aborts all, re-runs forever; per-entry try/catch + cleanup.
- [ ] **L** `ConversationStore.svelte.ts:58-80` — `init()` not memoized; concurrent calls run migration twice.
- [ ] **L** `ConversationStore.svelte.ts:85-92` — `destroy()` leaks `saveStateResetTimeout`.
- [ ] **L** `indexedDBAdapter.ts:20-36` — no `onblocked`/`onversionchange` handlers (multi-tab upgrade hangs).
- [ ] **L** `indexedDBAdapter.ts:123-139` — `isIndexedDBAvailable` broken and unused; remove or fix.
- [ ] **L** `exportUtils.ts:22,113-119` — markdown export: escape title newlines/`#`, render content safely.
- [ ] **L** `ReplayController.svelte.ts:35-41` — snapshot/config trusted without Zod validation.
- [ ] **L** `NodeTypeRegistry.svelte.ts:13-18` — `register()` skips the existing `nodeTypeDefinitionSchema`; validate.

## WS6 — Infrastructure, packaging, CI, MCP server, docs

- [ ] **H** `packages/sdk/package.json:16-20` — published package ships `*.stories.svelte` + `dist/stories/` importing non-existent `@storybook/addon-svelte-csf`; exclude from `files`.
- [ ] **H** `.github/workflows/publish.yml` — runs on every main push (re-publish fails) and `pnpm publish` fails on detached HEAD; gate on version change/tag + `--no-git-checks`.
- [ ] **H** `.github/workflows/ci.yml:54,69-80` — coverage uploaded from wrong dir, `coverage-summary.json` reporter never configured; fix paths + add `json-summary` reporter.
- [ ] **H** root `package.json:7-8` — `dev` has unreachable `&& pnpm run turbo watch` (nonexistent script), `watch` lacks task arg; fix both.
- [ ] **H** Node version drift: `.nvmrc` = 24 vs CI/Dockerfiles on 22; use `node-version-file: .nvmrc` + `node:24-alpine`.
- [ ] **H** turbo race: `turbo check` runs `traek:check` and `traek:build` concurrently in the same dir → `.svelte-kit` ENOTEMPTY; serialize (e.g. sdk `check` dependsOn `build` or dedicated sync task).
- [ ] **M** `packages/sdk/package.json:10-15` — exports map lacks `default` condition after `svelte`; non-Vite resolvers can't import the package.
- [ ] **M** `apps/web/package.json` — unused deps `@iconify/svelte`, `dompurify`, `marked`, `marked-highlight`, `vitest`; remove.
- [ ] **M** dead code: `persistence/ReplayControls.svelte` (stale duplicate of `replay/ReplayControls.svelte`), unused barrels `persistence/index.ts`(line 2 export)/`replay/index.ts` — delete stale duplicate, fix barrels.
- [ ] **M** vestigial pre-monorepo root files that can't even load: root `vite.config.ts`, `svelte.config.js`, `vitest.shims.d.ts`, `.storybook/`; delete.
- [ ] **M** stray 6.4k-line `package-lock.json` (pre-monorepo) in pnpm repo; delete + gitignore.
- [ ] **M** `CLAUDE.md` describes old single-package layout (src/lib at root, npm scripts, storybook, 3 vitest projects); rewrite for monorepo reality.
- [ ] **M** CI: no turbo cache (`actions/cache` for `.turbo`); check+build jobs duplicate identical builds.
- [ ] **M** Docker: runner stages run as root (`Dockerfile`, `docker/mcp.Dockerfile`); add `USER node` + `--chown`.
- [ ] **M** pin GitHub Actions to commit SHAs (at minimum in `publish.yml` which holds `id-token: write`); resolve via `git ls-remote`.
- [ ] **M** `servers/mcp/src/index.ts:60-77` — HTTP handler: no try/catch (unhandled rejection hangs response), per-request server/transport never closed, invalid JSON swallowed then stream already consumed; fix all three.
- [ ] **L** `servers/mcp/src/index.ts:73,79` — 0.0.0.0 with no DNS-rebinding protection; enable `enableDnsRebindingProtection`/`allowedHosts` or default to localhost.
- [ ] **L** `servers/mcp` — deprecated `server.tool()` overload with `as any`; migrate to `registerTool` + zod v4 imports; align package.json SDK version range.
- [ ] **L** `servers/mcp/src/resources/docs.ts:95-133` — "not found" returned as successful resource read; raise MCP error.
- [ ] **L** `.npmrc` `engine-strict=true` with no `engines` anywhere; add `engines` to root.
- [ ] **L** `turbo.json` — `format`/`clean` cacheable (must be `cache: false`), `lint` needlessly dependsOn `^lint`, `test` missing coverage outputs, build outputs include full `.svelte-kit/**`.
- [ ] **L** `README.md:353-370` — MCP package documented as `@gettraek/mcp` but actual name is `@traek/mcp` and unpublished; align.
- [ ] **L** `backlog.md` lists Minimap as unprioritized though shipped; `CHANGELOG.md` stuck at 0.0.1 (current 0.0.3); update.
- [ ] **L** `apps/web` uses `npm run` inside scripts/playwright config in a pnpm repo; switch to pnpm.
- [ ] **L** `apps/docs` has no `check` script → never type-checked in CI; add `astro check`.
- [ ] **L** `packages/sdk/src/app.html` vestigial; sdk package.json missing `homepage`/`bugs`.

## WS7 — i18n keys (prerequisite for Wave 2; `packages/sdk/src/lib/i18n/types.ts` + `defaults.ts` only)

- [ ] **H** Add all missing translation key sections (English defaults) needed by Wave 2: `focusMode`, `childSelector`, `positionIndicator`, `homeButton`, `swipeAffordances`, `chatList`, `saveIndicator`, `replayControls`, `tags`, `theme`, `compare`, `toast`, `nodeWrapper` (status/labels/retry/branches/hidden/expand-collapse), `minimap`, `nodeRenderer` (missing component), `searchBar` (match counter/no matches), `headerBar` (back label), `ghostPreview`.

## Wave 2A — Mobile + persistence UI: i18n + a11y (`mobile/**`, `persistence/ChatList.svelte`, `SaveIndicator.svelte`, `ReplayControls.svelte` (replay/), `TraekNodeWrapper` strings)

- [ ] **H** entire `mobile/` tree ships hardcoded German (FocusMode, KeyboardCheatsheet, PositionIndicator, ChildSelector, Breadcrumbs, HomeButton, SwipeAffordances); route through `getTraekI18n()`.
- [ ] **H** `mobile/OnboardingOverlay.svelte:61-68` — global Enter/Space handler swallows focused Skip button activation.
- [ ] **H** `persistence/ChatList.svelte:114-178` (×4 blocks) — nested interactive elements (`div role="button"` wrapping buttons); restructure.
- [ ] **H** `persistence/ChatList.svelte:541-548` — row actions invisible on keyboard focus; add `:focus-within`.
- [ ] **M** `ChatList.svelte` — all strings hardcoded English (confirm, relative times, group titles, empty state); i18n. Replace native `confirm()` (L).
- [ ] **M** `mobile/FocusMode.svelte:483-507` — click-only reply-context expander; make it a button with `aria-expanded`.
- [ ] **M** `persistence/SaveIndicator.svelte:25-51` — hardcoded strings; i18n.
- [ ] **M** `replay/ReplayControls.svelte` — unlabeled range slider, speed buttons lack `aria-pressed`; + i18n.
- [ ] **M** `TraekNodeWrapper.svelte` — hardcoded user-facing strings (status, retry, branches, hidden count, expand/collapse); i18n.
- [ ] **L** `mobile/ChildSelector.svelte:133-134` — invalid `role="list"` semantics, index-keyed `{#each}`; key by id.
- [ ] **L** `mobile/Breadcrumbs.svelte` — index-keyed each, no nav landmark, `$derived(() =>)` function anti-pattern.
- [ ] **L** ChatList unused CSS selectors `.header`/`.new-chat`.

## Wave 2B — Overlays, canvas chrome, misc components: a11y + i18n (`keyboard/**`, `onboarding/**`, `canvas/InputForm|Minimap|ZoomControls|ContextBreadcrumb|GhostPreview|NodeRenderer` (string only), `tags/**`, `theme/**`, `compare/**`, `toast/**`, `search/SearchBar`, `conversation/HeaderBar`, `DefaultLoadingOverlay`, `a11y/`)

- [ ] **H** `toast/Toast.svelte:64` — literal `✕` rendered as text instead of ✕.
- [ ] **H** `toast/Toast.svelte:55` — no `role="status"`/`aria-live`; toasts never announced.
- [ ] **H** `canvas/ZoomControls.svelte:49-84` + `canvas/Minimap.svelte:159` — redundant Enter `onkeydown` double-fires (zoom jumps, minimap toggle no-ops); remove handlers.
- [ ] **H** `onboarding/TourStep.svelte:92-102` — global Enter/Space handler breaks focused Back/Skip buttons.
- [ ] **H** `onboarding/TourStep.svelte:34-52` — highlight target computed only in `onMount`; never moves between steps. Recompute in `$effect`.
- [ ] **H** `keyboard/FuzzySearchOverlay.svelte:109` — `aria-labelledby` points to non-existent id.
- [ ] **M** no overlay implements focus trap/initial focus/restore despite `aria-modal="true"`: FuzzySearchOverlay, KeyboardHelpOverlay, BranchCompare, TourStep (+ mobile overlays in 2A). Add a shared focus-trap action.
- [ ] **M** `FuzzySearchOverlay` — no combobox wiring (`aria-activedescendant`), selected option not scrolled into view.
- [ ] **M** `actions/SlashCommandDropdown` + `canvas/InputForm.svelte:88` — listbox without combobox wiring on textarea; textarea lacks `aria-label`; branch celebration banner lacks `role="status"`.
- [ ] **M** `NodeToolbar.svelte:82-89` — `role="toolbar"` without roving arrow-key focus; implement or drop role.
- [ ] **M** `tags/TagDropdown.svelte`, `tags/TagFilter.svelte` — hardcoded strings, missing `aria-pressed`, no Escape/outside-click close.
- [ ] **M** `theme/ThemePicker.svelte` — hardcoded strings, no Escape/outside-click close.
- [ ] **M** `compare/BranchCompare.svelte` — hardcoded strings; added diff segments color-only (add underline).
- [ ] **M** `conversation/HeaderBar.svelte:36,149-152` — back link loses accessible name <360px; add `aria-label`; i18n default.
- [ ] **M** `canvas/Minimap.svelte:108,157` — hardcoded aria labels; i18n.
- [ ] **M** `canvas/NodeRenderer.svelte:110` — hardcoded missing-component message; i18n (string swap only — file owned by WS4 for perf, coordinate).
- [ ] **M** `DefaultLoadingOverlay.svelte:7-12` — no `role="status"`/`aria-busy`.
- [ ] **L** `search/SearchBar.svelte:81-87` — match counter without `aria-live`; debounce search-as-you-type (~150 ms) to avoid full O(n) scan + camera animation per keystroke.
- [ ] **L** `canvas/ContextBreadcrumb.svelte` — `$derived(() =>)` function anti-pattern, no nav landmark, index-keyed each.
- [ ] **L** `canvas/GhostPreview.svelte:50` — decorative preview announced to SRs; `aria-hidden`.
- [ ] **L** infinite animations without `prefers-reduced-motion` exemption (`ActionBadges` pulse, canvas empty-state bounce, SaveIndicator spinner).
- [ ] **L** `toast/Toast.svelte:23-43` — auto-dismiss not pausable on hover/focus (undo window).
- [ ] **L** touch targets <44px: TagBadges remove buttons, Breadcrumbs rows, Minimap toggle, SearchBar nav buttons.

## Deferred (intentionally not done)

- **TraekCanvas `role="tree"` restructure** (a11y #20): correct fix needs an interaction-model decision (roving tabindex over treeitems vs `role="application"`); too invasive for this pass.
- **Move marked/highlight.js/dompurify to optional peerDependencies** (infra M2): semver-major packaging change for consumers; needs a maintainer decision.
- **CI e2e job for Playwright**: requires browser downloads in CI; worth doing but as deliberate follow-up with caching strategy.
- **Iconify runtime network dependency**: swapping `@iconify/svelte` for build-time icons is a larger refactor.
