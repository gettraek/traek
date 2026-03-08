# træk Contributor Recognition Program

A structured program to acknowledge, celebrate, and retain OSS contributors. Recognition is the cheapest and most effective retention tool in open source.

---

## Philosophy

Recognize publicly, early, and specifically. "Thank you for your contribution" is forgettable. "@handle just fixed the broken aria-labels on the zoom controls — tiny PR, real impact for screen reader users" is memorable.

---

## Tier System

### Tier 1 — First Contribution

**Trigger:** First PR merged.

**Recognition:**
- Maintainer posts a personal welcome comment on the merged PR: "Welcome to the træk contributors! Your first PR is merged — that's [specific thing they fixed]. Thank you."
- Discord: CMO grants `Contributor` role manually (or via bot after GitHub link).
- Added to `all-contributors` bot entry in README (bot auto-PRs this once configured).

**Effort:** ~2 min per contributor. Non-negotiable. Do this within 24h of merge.

---

### Tier 2 — Regular Contributor (3+ merged PRs)

**Trigger:** Third merged PR.

**Recognition:**
- Discord: Upgraded from `Contributor` to `Regular Contributor` role.
- Invitation to private `#contributors` Discord channel (direct message from CMO).
- Named in the "Spotlight" section of the next developer newsletter.
- Offered co-authorship or acknowledgment in the next DevRel blog post if relevant to their work.

**Effort:** ~10 min. Batch process monthly when reviewing contributor list.

---

### Tier 3 — Core Contributor (10+ merged PRs or sustained impact)

**Trigger:** 10+ merged PRs OR significant non-PR impact (e.g., maintaining docs, answering support questions consistently, leading a community initiative).

**Recognition:**
- Discord: `Core Contributor` role.
- Listed in a dedicated "Core Contributors" section in README (permanent, not just all-contributors).
- Personal thank-you from the CEO/founder.
- Swag package (see below).
- Offered triage permissions on GitHub (can label issues, close duplicates).
- Invited to monthly maintainer sync (optional, async-friendly).

**Effort:** ~30 min per person. Rare — treat it as a celebration.

---

## Hall of Fame

A public page on gettraek.com (or a pinned GitHub Discussion until the site launches) listing all contributors with Tier 2+ status.

**Format:**
```
## Core Contributors
- @handle — [brief description of their contributions]

## Regular Contributors
- @handle
- @handle
```

**Update cadence:** With each release, or monthly if no release.

**Location (phased):**
1. Phase 1: Pinned GitHub Discussion titled "træk Hall of Fame"
2. Phase 2: `/contributors` page on gettraek.com

---

## Swag Program

**Eligibility:** Tier 3 (Core Contributor) only. Quality over quantity — swag is meaningful only when rare.

**Package contents:**
- træk sticker set (3-4 stickers: logo, wordmark, canvas-themed illustration)
- Handwritten thank-you card (printed + signed)
- Optional: t-shirt (contributor's choice of size/color)

**Process:**
1. CMO DMs contributor on Discord: "We'd love to send you some træk swag as a thank-you. Would you like that?"
2. If yes, use a private form (Tally or Typeform) to collect mailing address. Do not store addresses in GitHub.
3. Ship within 30 days. Confirm delivery via DM.

**Budget:** ~$30/package. Estimated 2-5 packages per year in the first 12 months.

**Sticker design:** Coordinate with brand guidelines (`docs/brand/guidelines.md`). Commission Figma-to-print assets from design budget.

---

## Mentorship Program

**Goal:** Pair first-timer contributors with an experienced maintainer or regular contributor to guide their second and third contributions.

**How it works:**

1. After a first-time contributor's PR is merged, the maintainer comments: "Great work! If you'd like help finding your next contribution, reply here or ping us in `#help` on Discord — we're happy to point you somewhere useful."
2. If they express interest, the CMO or CTO pairs them with a mentor (a Tier 2/3 contributor who has opted in).
3. Mentor assists with: picking a next issue, understanding the codebase, PR review feedback.
4. Mentorship is async-first. One Zoom call optional.

**Mentor pool:**
- Initially: core team only.
- Expand: invite Tier 3 contributors to opt in as mentors. Offer recognition (mentor badge in Discord).

**Commitment:** 1-2 hours per mentee, over 4-6 weeks.

---

## Changelog Credits

Every release changelog must credit external contributors by GitHub handle. Format:

```
## v0.x.x — YYYY-MM-DD

### Contributors
Thanks to @handle1, @handle2, and @handle3 for their contributions to this release.
```

This is non-negotiable. It costs 30 seconds and is noticed.

---

## Annual Contributor Retrospective

At the end of each calendar year, publish a "Year in Review" post (DevTo + GitHub Discussions) that:
- Names every contributor who merged a PR that year.
- Highlights 3-5 standout contributions with a sentence of context.
- Shows growth stats (contributors, stars, PRs).
- Thanks the community publicly.

---

## Tools & Automation

| Tool | Purpose | Status |
|------|---------|--------|
| [all-contributors bot](https://allcontributors.org) | Auto-PR README contributor list | Set up at launch |
| GitHub Actions | Auto-comment on first PR from new contributor | Set up at launch |
| Carl-bot or MEE6 | Discord role assignment on GitHub link | Set up at launch |
| Tally / Typeform | Swag address collection (private) | Set up when first Tier 3 reached |

### First-PR GitHub Action

Create `.github/workflows/welcome-contributor.yml`:

```yaml
name: Welcome new contributors
on:
  pull_request_target:
    types: [opened]

jobs:
  welcome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/first-interaction@v1
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}
          pr-message: |
            Welcome to træk, @{{ author }}! Thanks for opening your first PR.

            A maintainer will review this within 48 hours. While you wait:
            - Check the [contribution guide](CONTRIBUTING.md)
            - Say hi in [#general on Discord](https://discord.gg/traek)

            We're glad you're here.
```

---

## Metrics

Track these in the monthly health report:

| Metric | Monthly |
|--------|---------|
| Tier 1 recognitions given | ✓ |
| Tier 2 upgrades | ✓ |
| Tier 3 upgrades | ✓ |
| Swag packages shipped | ✓ |
| Active mentorships | ✓ |

---

## References

- `docs/community/engagement-plan.md` — Overall community strategy
- `docs/community/oss-health-metrics.md` — Contributor retention metric definition
- `docs/community/monthly-health-report-template.md` — Where to track recognition metrics
- `docs/brand/guidelines.md` — Brand assets for swag design
