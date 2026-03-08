# træk First-Timer-Friendly Issue Pipeline

A repeatable process for keeping the `good first issue` queue healthy, welcoming new contributors, and converting them to regulars.

---

## The Queue Rule

**Always maintain 5-10 open, unassigned issues labeled `good first issue`.**

This is a hard invariant. Below 5: contributor motivation drops. Above 10: issues feel ignored and go stale. Check the count weekly.

---

## Issue Quality Standards

A first-timer issue must pass all of the following criteria before being labeled:

### Clarity checklist

- [ ] **Title is specific** — "Add aria-label to zoom controls" not "Improve accessibility"
- [ ] **Scope is bounded** — expected effort is stated: "~20-50 lines", "docs only", "one file"
- [ ] **No deep engine knowledge required** — first-timers cannot be expected to understand TraekEngine internals
- [ ] **Relevant files are named** — exact file paths given, not just "somewhere in the codebase"
- [ ] **Getting started steps included** — fork, install, branch, test, PR checklist
- [ ] **Discord link included** — "Questions? Ask in #help on Discord"
- [ ] **Acceptance criteria defined** — what does "done" look like?

### Issue template for first-timers

```markdown
## Summary

[One sentence: what needs to change and why]

## Expected scope

[~N lines across N files. No knowledge of X internals required.]

## Acceptance criteria

- [ ] [Specific, testable requirement]
- [ ] Tests pass: `pnpm run lint && pnpm run check && pnpm run test`

## Relevant files

- `path/to/file.ts` — [what to look at]
- `path/to/other.svelte` — [what to change]

## Getting started

1. Fork the repo and clone locally
2. `pnpm install`
3. Create a branch: `git checkout -b fix/your-issue-name`
4. Make your changes
5. Run: `pnpm run lint && pnpm run check && pnpm run test`
6. Open a PR — we review within 48h (24h for `good first issue`)

Questions? Ask in [#help on Discord](https://discord.gg/traek) or comment on this issue.
```

---

## Issue Categories That Work

Rank ordered by contributor success rate (highest first):

| Category | Effort | Engine knowledge | Examples |
|----------|--------|-----------------|---------|
| Missing i18n keys | Low | None | Audit hardcoded English strings |
| Missing ARIA attributes | Very low | None | Add aria-label to buttons |
| Documentation examples | Low | Low | Add `componentMap` example to docs |
| Test coverage for utilities | Medium | Low | Vitest tests for pure functions |
| CSS custom property extraction | Low | None | Extract hardcoded value to `--traek-*` var |
| Small bug fixes | Medium | Low | Fix viewport check, off-by-one |
| Type improvements | Low | Low | Add missing type exports |

**Avoid as first-timer issues:**
- Anything touching TraekEngine internals (complex state management)
- Performance optimization (requires profiling knowledge)
- Streaming/reconnection logic (high complexity)
- Breaking API changes

---

## Monthly Queue Refresh Process

Run on the first Monday of each month, alongside the health report:

### Step 1 — Audit current queue

```bash
gh issue list --repo gettraek/traek --label "good first issue" --state open
```

Count unassigned issues. If >= 5, no action needed. If < 5, continue to step 2.

### Step 2 — Close stale issues

Issues that have been open with `good first issue` for >60 days and have no comments should be closed with:

> "Closing this to keep the first-timer queue fresh. If you'd like to pick this up, please reopen it and we'll help you get started."

### Step 3 — Source new issues

Pull from this backlog of reliable source categories:

1. **i18n audit** — Run `grep -r "hardcoded_string"` in new components added since last audit.
2. **ARIA audit** — Check any new interactive elements for missing accessible labels.
3. **Test coverage gaps** — Run `pnpm run test --coverage` and find uncovered utility functions.
4. **CSS variable extraction** — Check for hardcoded pixel/color values in new components.
5. **Doc gaps** — Review README and docs for missing examples on recently added props/features.

### Step 4 — Create and label issues

For each new issue:
1. Write it using the template above.
2. Apply labels: `good first issue` + relevant category label.
3. Do not assign to anyone — leave unassigned for self-selection.
4. Add to the "Good First Issues" pinned GitHub Discussion thread.

### Step 5 — Announce in Discord

Post in `#contribute`:
> "We've added [N] new first-timer-friendly issues this month! Check them out: [link to filtered issue list]"

---

## Assignment Flow

**Self-assignment model** — contributors claim issues themselves. We do not assign on their behalf. This reduces "I claimed it but never did it" ghost assignments.

When a contributor comments "I'd like to work on this":
1. Reply: "It's yours! Go ahead and open a PR when ready. Tag us here if you need help."
2. Optionally assign them on GitHub so the issue shows as claimed in the filtered list.
3. If no PR appears after 14 days, comment: "Hey @handle — are you still working on this? No pressure, just wanted to check in. If you can't get to it, we can re-open it for someone else."
4. If no response after 21 days total, unassign and re-open for the community.

---

## Responding to First PRs

When a `good first issue` PR is opened:

**Within 24h:**
- Leave an initial acknowledgment even if the full review isn't done: "Thanks for the PR! I'll review this by [date]."

**On review:**
- Be specific: "Line 42 — can you use `aria-labelledby` here instead of `aria-label`? Here's why: [link]"
- Not just: "Needs changes"
- End every review with encouragement and a next step: "Once this is merged, there's a similar issue at #NNN if you'd like to keep going."

**On merge:**
- Personal thank-you comment (see contributor recognition program).
- Immediately create a replacement `good first issue` if the queue drops below 5.

---

## Tracking

Report in the monthly health report:

| Metric | Monthly |
|--------|---------|
| `good first issue` queue count (end of month) | ✓ |
| New first-timer issues created | ✓ |
| `good first issue` PRs opened | ✓ |
| `good first issue` PRs merged | ✓ |
| Average TTFR on `good first issue` PRs | ✓ |

---

## References

- `docs/community/good-first-issues.md` — Curated list of specific starter issues
- `docs/community/contributor-recognition-program.md` — What happens after the first PR
- `docs/community/oss-health-metrics.md` — TTFR and fork-to-PR tracking
- `docs/community/engagement-plan.md` — Broader contributor funnel
- `CONTRIBUTING.md` — Developer-facing contribution guide
