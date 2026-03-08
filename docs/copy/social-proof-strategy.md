# Social Proof Collection Strategy

How Træk systematically gathers, stores, and activates testimonials, logos, and quotes.

---

## Why This Matters

Developers are deeply skeptical of marketing. Social proof from peers — especially in their own words, with technical specificity — converts better than any copy we write. The goal of this strategy is to make collection systematic, respectful, and useful across channels.

---

## What We Collect

### 1. Testimonials

Statements from developers about their experience using Træk. Should be specific, not generic.

**High-value testimonial:** Mentions a concrete outcome, a specific feature, or a comparison to alternatives.
> *"We shipped spatial branching in a weekend. Building it ourselves would have taken three sprints."*

**Low-value testimonial:** Vague praise that could apply to anything.
> *"Træk is great! Very easy to use."*

**Minimum viable testimonial:**
- Name + role (or handle + project)
- One specific thing about the experience
- Permission to use it

---

### 2. Logos

Organizations or projects using Træk publicly. Used on the homepage, docs site, and in pitch decks.

**What we display:**
- Company/project logo
- Name (linked to their site or project)

**What we don't display without permission:**
- Revenue figures, employee counts, or anything the organization considers confidential
- Logos from users who haven't explicitly granted logo permission

---

### 3. Quotes

Shorter than testimonials. Often pulled from social posts, GitHub Issues/PRs, Discord messages, or public posts. Require explicit permission before use in marketing materials.

**Sources for quotes:**
- Twitter/X: mentions, replies, threads
- GitHub: stars with comments, Issue/PR discussions
- Discord: server messages (requires opt-in)
- Dev.to / Hacker News: comments on our posts
- Direct DMs/emails

---

## Collection Methods

### Method 1: In-Product Prompt (Playground)

**Trigger:** After user has sent ≥ 10 messages in a session OR has an account ≥ 14 days old.
**Placement:** Dismissible toast or modal.
**Copy:**

```
Enjoying Træk?

If you've found it useful, a quick quote goes a long way.
It helps other developers find us.

[Share a thought →]   [Not now]
```

**Form:** Single text field (max 300 chars), name/handle, "Can we use this publicly?" checkbox.

---

### Method 2: Post-Install Nudge (npm)

When a developer installs `@traek/*`, the package.json links to a simple feedback page:

```
Found Træk useful? We'd love a quote: https://gettraek.com/feedback
```

This is non-intrusive — optional, single click, never shown twice.

---

### Method 3: Developer Spotlight Program

Every published Spotlight generates a reusable quote. Built into the interview format — question 5 ("What did you build that you couldn't have shipped otherwise?") is specifically designed to produce quotable outcomes.

After each Spotlight:
- Extract 2–3 pull quotes for the social proof library
- Tag by: adapter, use case, company size, outcome type

---

### Method 4: Community Monitoring

**Discord:** Monitor `#built-with-traek` and `#general` for organic praise.
- When a positive, specific comment appears, DM the author: "Hey, would you be OK if we quoted this publicly?"
- Add to social proof library on approval.

**Twitter/X mentions:** Monitor `@gettraek` mentions and `#traek` hashtag.
- Positive tweets with ≥ 10 likes: eligible for quote collection.
- Reply publicly to thank them, DM for permission.

**GitHub:** Monitor Issues and Discussions for organic testimonials.
- Search monthly: `is:issue label:enhancement kind words` + `is:discussion "love"` etc.
- Reach out for permission.

---

### Method 5: Case Study Conversion

Every completed case study automatically produces:
- 1 featured testimonial (from the closing quote)
- 1 logo (if company-level approval obtained)
- 2–3 short pull quotes

---

### Method 6: Direct Ask at Milestones

When a developer crosses a milestone (e.g., ships something publicly, reaches 100 GitHub stars), reach out directly:

```
Subject: Congrats on shipping [project]

Hi [Name],

Saw [project] hit [milestone] — congrats.

Would you be willing to share a short quote about your experience using Træk?
It helps other developers find us and doesn't require much — even one sentence is great.

— Træk team
```

---

## Storage & Tagging

All collected social proof lives in: `docs/social-proof/library.yml`

**Schema:**

```yaml
- id: sp-001
  type: testimonial          # testimonial | logo | quote
  text: "..."
  attribution:
    name: "Name"
    handle: "@handle"
    role: "Founder"
    company: "Acme"
    url: "https://..."
  context:
    adapter: svelte           # svelte | react | vue | multiple
    use_case: research-tool   # free-form tag
    company_size: startup     # startup | smb | enterprise | oss
    outcome: time-to-ship     # time-to-ship | ux-quality | feature-unlock | team-velocity
  permissions:
    quote_public: true
    logo_public: false
    name_public: true
    handle_public: true
  collected:
    date: "2026-03-08"
    source: spotlight         # in-product | spotlight | community | direct | case-study
  used_in:
    - homepage-hero
    - docs-landing
```

---

## Activation: Where Social Proof Appears

| Placement | Type | Selection Criteria |
|---|---|---|
| Homepage hero | 1 featured testimonial | Highest outcome clarity + recognizable name/org |
| Homepage logo bar | 6–8 logos | Variety of adapter, industry, size |
| Docs landing page | 2–3 quotes | Technical specificity; adapter-relevant |
| Showcase page | Per-project quotes | Tied to specific project |
| Pricing page | 1–2 testimonials | Outcome-focused; time-to-ship or quality |
| npm README | 1 short quote | The most credible-sounding one we have |
| Conference talks | Quotes + logos | Permission confirmed; presenter context |
| PR / investor deck | Logos + testimonials | Highest-signal names / companies |

---

## Permission Standards

**Never use without explicit written permission:**
- Testimonials in marketing copy
- Logos on the website
- Screenshots of private Discord messages

**May use with credit, no explicit permission needed:**
- Public tweets / posts (always credit; if in doubt, ask)
- Public GitHub Issues/PR comments (credit by handle)
- Hacker News / Dev.to public comments (credit by handle)

**Always confirm before use if:**
- The quote mentions a competitor
- The quote reveals anything sensitive (costs, team size, internal systems)
- The person is at a large company (may need PR approval)

---

## Quarterly Review

Each quarter:
1. Audit library for stale entries (people who've left companies, projects that shut down)
2. Identify gaps: underrepresented adapters, use cases, or company sizes
3. Prioritize outreach to fill gaps
4. Rotate homepage testimonials and logo bar for freshness
5. Report: total quotes collected, by source and type

---

## KPIs

| Metric | Target (Year 1) |
|---|---|
| Total testimonials in library | 30 |
| Logos with public permission | 15 |
| Adapter coverage | All 3 adapters represented |
| Company size coverage | Startup + Enterprise + OSS all represented |
| Homepage testimonial rotation | Quarterly |
| Time from collection to activation | < 2 weeks |
