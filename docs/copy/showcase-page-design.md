# "Built with Træk" Showcase Page

**URL:** gettraek.com/showcase
**Purpose:** Social proof, community hub, discoverability of real implementations
**Audience:** Developers evaluating Træk; existing community members

---

## Page Goals

1. Show that real developers are shipping real things with Træk
2. Give prospective users concrete examples to identify with ("that's my use case")
3. Celebrate community builders and drive submissions
4. Surface diversity of adapters, use cases, and industries

---

## Page Structure

### Hero

```
Built with Træk

Real products, research tools, and experiments
built by developers using the spatial conversation canvas.

[Submit your project →]    [Browse all →]
```

**No marketing copy here.** Let the projects do the talking.

---

### Filter Bar

Horizontal filter chips, single-select per group:

| Group | Options |
|---|---|
| Adapter | All · Svelte · React · Vue |
| Category | All · AI Assistant · Research · Dev Tool · Education · Experiment · Enterprise |
| Type | All · Open Source · Commercial · Internal Tool |

Default: All / All / All, sorted by Most Recent.

---

### Project Grid

**Layout:** 3-column grid (desktop), 2-column (tablet), 1-column (mobile)

**Card anatomy:**

```
┌─────────────────────────────────┐
│  [Screenshot or demo preview]   │
│  (16:9, lazy-loaded)            │
├─────────────────────────────────┤
│  Project Name                   │
│  One-line description           │
│                                 │
│  [Svelte] [Open Source]         │ ← adapter + type chips
│                                 │
│  Built by @handle    [GitHub ↗] │
└─────────────────────────────────┘
```

**Hover state:** Subtle lift shadow + "View project" overlay on image.

**Click:** Opens project detail (external link or in-page modal for case studies).

---

### Featured Projects (Editorial)

Top of grid, 3 featured projects with larger cards (full-width or 2-column span).
Featured = manually curated by CMO. Rotate quarterly.

Featured card extras:
- Longer description (2–3 sentences)
- Quote from builder
- "Case Study →" link if full case study exists

---

### Submission CTA (Mid-page)

```
Building something with Træk?

We'd love to feature it. Open source, commercial,
internal tool — if it's real and uses Træk, it belongs here.

[Submit your project]
```

**Submission form fields:**
- Project name
- One-line description (max 100 chars)
- Category (dropdown)
- Adapter used (Svelte / React / Vue / Multiple)
- Project URL
- GitHub URL (optional)
- Screenshot or demo URL
- Builder name + handle
- Optional: short quote (max 200 chars)
- Open source? (yes/no)
- Email (not displayed; for follow-up only)

**Review SLA:** Featured within 2 weeks of submission or declined with feedback.

---

### Developer Spotlight Integration

Below the grid, a horizontal scroll of Spotlight cards:

```
From the Developer Spotlight series

┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  [Photo]    │  │  [Photo]    │  │  [Photo]    │
│  @handle    │  │  @handle    │  │  @handle    │
│  "Quote..." │  │  "Quote..." │  │  "Quote..." │
│  Read more →│  │  Read more →│  │  Read more →│
└─────────────┘  └─────────────┘  └─────────────┘
```

---

### Empty States

**No results for filter combination:**
```
No projects yet in this category.

Be the first — [submit yours →]
```

---

## Submission Review Criteria

Accept if:
- Uses `@traek/*` (any adapter)
- Project is real and accessible (public URL or GitHub)
- Submission is complete and accurate

Decline if:
- Misrepresents Træk usage
- Spam or commercial content unrelated to Træk
- Project is inaccessible / broken

---

## Copy: Page Metadata

```
title: "Built with Træk | Showcase"
description: "Projects and products built by developers using Træk —
              the spatial AI conversation canvas."
og:image: [Collage of project screenshots, auto-generated]
```

---

## Analytics Events to Track

| Event | Properties |
|---|---|
| `showcase_filter_applied` | adapter, category, type |
| `showcase_project_clicked` | project_id, position, is_featured |
| `showcase_submit_cta_clicked` | location (hero / mid / footer) |
| `showcase_submission_started` | — |
| `showcase_submission_completed` | adapter, category, is_open_source |

---

## Launch Plan

**Phase 1 (Launch day):**
- 6–8 curated projects (team-sourced from beta users)
- 3 featured with full quotes
- Submission form live

**Phase 2 (Month 2+):**
- Community-submitted projects review queue
- Link from npm package README
- Discord `#built-with-traek` auto-prompt on first join

**Phase 3 (Month 4+):**
- Case study links integrated for featured projects
- Spotlight series cards above fold
- Monthly "New on Showcase" newsletter section
