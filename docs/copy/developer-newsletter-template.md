# Monthly Developer Newsletter Template

**Name:** The Træk Signal
**Cadence:** Monthly, first Tuesday of each month
**Platform:** Resend (or equivalent transactional email)
**From:** `signal@gettraek.com` — "Træk"
**Subject line formula:** `[Month]: [what's in it] — Træk Signal`

---

## Subject Line Examples

```
March: New Vue adapter, spatial canvas talk at JSConf, 3 projects to steal from — Træk Signal
April: v1.2 release, Theo's spotlight, a cursor trick worth knowing — Træk Signal
May: React adapter GA, the case against infinite scroll in AI — Træk Signal
```

**Rules:**
- 3 items max in subject. Don't summarize everything.
- At least one item should be useful content, not just news.
- Never use "newsletter" in the subject.

---

## Email Template

---

### Header

```
træk signal · [Month Year]
```

Minimal. No logo needed in the header — the name carries it.

---

### Section 1: What Shipped

**Purpose:** Keep subscribers informed on library changes.
**Length:** 3–5 bullet points. Link to changelog or release notes.

```
## What shipped

- **@traek/react 1.2**: Improved focus management, new `onBranchCreate` callback. [Changelog →](https://gettraek.com/changelog)
- **@traek/vue**: Now stable. Vue 3 Composition API, full feature parity with Svelte adapter.
- **Docs**: Added a migration guide for linear-chat-to-Træk rewrites. [Read it →](https://gettraek.com/docs/guides/migration)
- **Bug fix**: ViewportTracker no longer loses pan state on route change in SvelteKit.
```

---

### Section 2: Built with Træk

**Purpose:** Social proof, community celebration, inspiration.
**Length:** 1–3 projects. Short blurb + link. Include screenshot or GIF if available.

```
## Built with Træk

**[Project Name]** — [One sentence description]. Built by [@handle](https://github.com/handle) using the [adapter] adapter.
[View project →](https://...)

**[Project Name]** — [One sentence]. Open source. [GitHub →](https://github.com/...)
```

---

### Section 3: From the Community

**Purpose:** Signal that there's an active community worth joining.
**Length:** 2–4 items. Mix of Discord highlights, GitHub discussions, or forum threads.

```
## From the community

- [@handle asked about](https://discord.gg/traek) persisting large conversation trees — [@anotherperson's answer] is worth reading.
- **[GitHub Discussion]**: Should Træk ship a built-in search plugin? [Join the conversation →](https://github.com/traek/traek/discussions/...)
- 14 new contributors joined the repo this month. [Say hi →](https://discord.gg/traek)
```

---

### Section 4: Worth Reading

**Purpose:** Curated external links that make the newsletter worth opening even in slow months.
**Length:** 2–3 links. Short annotation.

```
## Worth reading

**[Title]** — [One sentence on why it's relevant to a Træk developer.] [Link →](https://...)

**[Title]** — [Annotation.] [Link →](https://...)
```

**What belongs here:**
- Posts on spatial UIs, canvas-based tools, AI UX
- Technical pieces on Svelte 5, React 19, Vue 3 (adapter-relevant)
- AI developer tooling trends
- Thoughtful posts on AI conversation design

**What doesn't:**
- AI news (too broad, not developer-specific)
- Anything paywalled without a summary
- Anything the team wrote (that goes in other sections)

---

### Section 5: Developer Spotlight (Featured Month Only)

**Appears:** When a Spotlight publishes that month.
**Purpose:** Surface the Spotlight to newsletter readers; drive blog traffic.

```
## Developer spotlight

This month we talked to **[Name]** (@handle), who built [project] with Træk.

> "[Short pull quote — the most interesting or honest thing they said.]"

[Read the full interview →](https://gettraek.com/blog/spotlight-name)
```

---

### Footer

```
---

You're receiving this because you signed up at gettraek.com or installed a @traek/* package.

[Unsubscribe](https://...) · [View in browser](https://...) · [Træk docs](https://gettraek.com/docs)
```

---

## Production Checklist (Before Sending)

- [ ] Subject line reviewed — specific, not generic
- [ ] All links tested (open in browser)
- [ ] Changelog link points to correct version
- [ ] Community section has at least 2 items (skip section if not)
- [ ] Worth Reading items are genuinely interesting, not filler
- [ ] Preview text set (first 90 chars shown in inbox preview)
- [ ] Send test to team before scheduling
- [ ] Scheduled for Tuesday 9am (recipient's local timezone if segmented, otherwise 9am ET)

---

## Preview Text Formula

```
[Release summary] · [Community highlight] · [Worth reading teaser]
```

Example:
```
Vue adapter now stable · A research tool built by 1 dev in a weekend · Why canvas beats scroll
```

---

## Metrics Targets

| Metric | Target |
|---|---|
| Open rate | > 40% |
| Click rate | > 8% |
| Unsubscribe rate | < 0.5% per send |
| Most clicked section | Track monthly; optimize order accordingly |

---

## Content Calendar Integration

| Source | Deadline |
|---|---|
| Changelog items | Merged before 25th of prior month |
| Built with Træk | Submissions reviewed by 20th |
| Community highlights | Curated from Discord/GitHub weekly, finalized by 22nd |
| Worth Reading | Running list maintained in Notion; finalized by 23rd |
| Spotlight piece | Published by 1st of send month |
| Draft ready for review | 26th of prior month |
| Team review + edits | 27th–28th |
| Scheduled to send | 29th (for 1st Tuesday delivery) |
