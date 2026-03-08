# Traek — Launch Strategy: Beta Program & Early Adopter Funnel

**Date:** 2026-03-08
**Task:** [TRK-111](/issues/TRK-111)
**Author:** CMO
**Builds on:** `docs/plans/2026-03-07-playground-launch-gtm.md`

---

## Overview

This document covers the complete launch execution strategy for Traek Playground, focusing on four deliverables:

1. **Beta program design** — criteria, structure, feedback loops, community channels
2. **Early adopter funnel** — awareness → signup → activation → advocacy
3. **Launch milestones & go/no-go criteria** — gate-based decision framework
4. **4-week pre-launch warmup campaign** — week-by-week execution plan

Announcement copy templates (Twitter thread, HN, Product Hunt) are maintained in `docs/copy/product-hunt-launch.md` and referenced here.

---

## 1. Beta Program Design

### 1.1 Beta Cohort Structure

The beta runs in **three waves** of increasing size, each with a distinct focus:

| Wave | Size | Duration | Cohort Profile | Gate Criteria |
|------|------|----------|----------------|---------------|
| **Alpha (Wave 0)** | 20–30 users | 2 weeks | Trusted developer network, Founding Members | Invited manually |
| **Closed Beta (Wave 1)** | 100–200 users | 3 weeks | Top waitlist referrers + application cohort | Application + referral score |
| **Open Beta (Wave 2)** | 500–1,000 users | Ongoing | Waitlist in order | Waitlist position |

### 1.2 Beta Application Criteria

Wave 1 (Closed Beta) uses a short application — **max 3 questions, 90 seconds to complete:**

```
Q1 — What do you primarily use AI for today?
     ( ) Research / learning
     ( ) Writing / creative work
     ( ) Planning / strategy
     ( ) Software development
     ( ) Building AI products
     ( ) Other: ___________

Q2 — Which scenario best fits your needs?
     ( ) I explore complex problems with multiple angles simultaneously
     ( ) I run prompt experiments and compare outputs
     ( ) I prototype conversation flows for products I build
     ( ) I need to review / share AI reasoning with a team

Q3 — How would you use spatial branching specifically?
     (free text, 100 char limit)
```

**Selection algorithm:**
1. Filter: must have a clear use case (Q1 + Q2 answered, not "Other" on both)
2. Score Q3 responses 1–3 (1 = vague, 3 = specific scenario)
3. Bonus: +1 point per confirmed referral
4. Fill Wave 1 from top scores; break ties by signup date

**Target composition for Wave 1:**
- 40% AI power users (Tier 1)
- 35% AI product builders (Tier 2)
- 25% researchers / knowledge workers (Tier 3)

### 1.3 Beta Feedback Loops

Three feedback channels run in parallel — each captures different signal:

#### A. In-App Microsurveys

Trigger-based, non-blocking, 1–2 questions max:

| Trigger | Questions | Timing |
|---------|-----------|--------|
| After first branch created | "Was branching where you expected it?" / "Did you lose any context?" | 3s after action |
| After 5th conversation | "What's missing from your workflow?" (free text, 100 char) | On idle |
| After 10 min on canvas | NPS prompt (0–10 scale) | Session idle |
| After first share | "Who are you sharing with?" (dropdown) | 5s post-share |

**Implementation:** Use a simple in-app banner with Dismiss / Answer buttons. Store to Supabase. Do NOT use a modal for any microsurvey.

#### B. Weekly Beta Digest (Email)

Every Monday, beta users receive a **"What's new + what we need"** email:

```
From: Nico at Traek <nico@gettraek.com>
Subject: Week [N] — what we shipped, what broke, and one question

[2–3 bullet points on what shipped this week]
[1 honest callout of something that didn't work well]
[1 specific question: "This week, we need to know: _________"]
[Feedback link → Tally form (rotating weekly question)]
```

**Weekly question rotation:**
- Week 1: "What's the most awkward moment in your workflow?" (finding friction)
- Week 2: "If you had to explain Traek to a colleague in one sentence, what would you say?" (messaging validation)
- Week 3: "What would make you pay $12/month without hesitation?" (value prop)
- Week 4: "What's the one feature that would make you recommend Traek to 3 people?" (virality driver)

#### C. Dedicated Beta Discord Channel

**Structure:**
- `#beta-feedback` — structured reports (pinned template)
- `#beta-bugs` — bug reports (linked to GitHub Issues)
- `#beta-show-and-tell` — users share their branching sessions
- `#beta-team` — direct async access to the founding team

**Feedback template pinned in `#beta-feedback`:**
```
Use case: [what were you trying to do?]
What happened: [describe the experience]
What you expected: [what should have happened?]
Screenshot/recording: [optional but valued]
Severity: [ ] blocker / [ ] friction / [ ] nice-to-have
```

**Response SLA:**
- Blockers: 4-hour response, 24-hour fix target
- Friction: 24-hour response, 1-week fix target
- Nice-to-have: Logged + acknowledged within 48 hours

### 1.4 Beta Success Metrics

| Metric | Target (Wave 1, Week 3) | Signal |
|--------|------------------------|--------|
| Day-7 retention | >60% of beta users back in second week | Core value delivery |
| NPS | >40 | Product-market fit proxy |
| Branches per session | >2 average | Spatial UX adoption |
| Feedback submission rate | >40% | Community engagement |
| Spontaneous referrals | >15% of beta users share on their own | Organic virality |

---

## 2. Early Adopter Funnel

### 2.1 Funnel Stages

```
AWARENESS → CONSIDERATION → SIGNUP → ACTIVATION → RETENTION → ADVOCACY
```

### 2.2 Stage-by-Stage Breakdown

#### AWARENESS — "Traek exists and solves my problem"

**Primary channels:**
- Product Hunt listing (launch day reach)
- Hacker News Show HN (developer credibility)
- Twitter/X launch thread + build-in-public content
- Blog post SEO: "Why Linear Chat Fails Complex Thinking"
- r/LocalLLaMA and r/ChatGPT authentic engagement

**Key message at this stage:**
> The problem, not the product. Lead with "you've hit this wall" before naming Traek.

**Friction to remove:** Reduce to a single CTA per channel. No email gate for the demo.

#### CONSIDERATION — "Let me see if this is actually worth my time"

**Triggers:**
- Demo video embedded on landing page (< 90 seconds, shows one full branching session)
- Free tier with no account (5 conversations, zero friction)
- BYOK transparency (privacy-forward developer audience)
- Open-source core (`@traek/svelte` GitHub repo) for technical credibility

**Key message:**
> Try it before you commit. No account. No credit card. 5 conversations free.

**Friction to remove:** No email gate before first conversation. No forced onboarding tour.

#### SIGNUP — "I want to stay connected and get more"

**Trigger for signup:** User hits conversation limit (5) OR wants cloud sync/sharing.

**Signup flow:**
1. Soft prompt after 3rd conversation: "Save your sessions — sign up free"
2. Hard gate at conversation 5 with Pro upsell visible
3. Waitlist for Pro if not yet available

**Email captured:** Goes into nurture sequence (see `docs/copy/waitlist-launch-copy.md`).

**Friction to remove:** GitHub SSO and Google SSO — no password required. Email-only fallback.

#### ACTIVATION — "I got real value from Traek at least once"

**Definition of activated:** User has:
- Created ≥1 branch (core mechanic)
- Spent ≥5 minutes on a single canvas
- Returned at least once within 7 days

**Activation interventions:**
- **Empty state copy:** First canvas shows suggested prompts for 3 use cases (research, writing, development)
- **Branching affordance:** On first message, subtle animated arrow shows "branch from here →"
- **Day-1 email:** Sent 2 hours after signup — "Here's how to branch your first conversation"

**Day-1 activation email:**
```
Subject: One thing to try in Traek today
Preview: Takes 2 minutes. You'll see why we built it.

Hey [First name],

One thing:

  Open Traek. Start a conversation on any topic.
  After the second AI response — hover the message.
  You'll see a branch button. Click it.

That's it. That moment — having two paths live simultaneously —
is the thing we built this for.

If it clicks, we'd love to hear what you're exploring.
Just reply.

— The Traek team
```

#### RETENTION — "I keep coming back because it's part of my workflow"

**Retention drivers:**
- **Cloud sync (Pro):** Conversations persist across devices — creates switching cost
- **Sharing links:** Users share read-only trees — creates return visits
- **Weekly digest (beta):** Keeps product top-of-mind during early access
- **Conversation history:** Browsable past sessions with spatial thumbnails

**Retention red flags (triggers for intervention):**
- User signed up but never branched → "Stuck?" email at day 3
- User branched once, no return in 7 days → "What stopped you?" survey at day 8
- Pro user hasn't opened in 14 days → churn risk, manual outreach from Nico

#### ADVOCACY — "I tell people about Traek without being asked"

**Advocacy triggers:**
- Sharing link feature → natural sharing moment built into product
- Show-and-tell culture in Discord
- Twitter-worthy "canvas screenshots" (spatial output is inherently visual)
- Referral perks (Founding Member program — see GTM plan)

**Advocacy amplification:**
- Retweet user-generated content showing their branching sessions
- Reach out to active beta users for case study (written + 5-min call)
- "Made with Traek" watermark on shared links (toggleable)

### 2.3 Funnel Conversion Targets

| Stage | Conversion Rate Target | Volume (Month 1) |
|-------|----------------------|------------------|
| Awareness → Visit | — | 10,000 unique visitors |
| Visit → Demo started | 25% | 2,500 |
| Demo → Signup | 20% | 500 |
| Signup → Activated | 40% | 200 |
| Activated → Day-30 retention | 50% | 100 |
| Retained → Pro conversion | 30% | 30 |
| Pro → Referral (≥1) | 25% | ~8 |

---

## 3. Launch Milestones & Go/No-Go Criteria

### 3.1 Gate Framework

Four decision gates before public launch. Each gate is a go/no-go checkpoint:

```
GATE 1         GATE 2         GATE 3         GATE 4
Alpha Done  →  Beta Wave 1 →  Pre-Launch  →  Launch Day
(Day -21)      (Day -14)      (Day -7)       (Day 0)
```

### 3.2 Gate 1 — Alpha Complete (Day -21)

**Go criteria (ALL required):**
- [ ] Core features stable: canvas, branching, BYOK, streaming
- [ ] No P0/P1 crashes in alpha testing (0 crash reports from 20+ users)
- [ ] Day-7 alpha retention ≥50% (10 of 20 users return)
- [ ] NPS from alpha cohort ≥30
- [ ] Sharing links functional end-to-end

**No-go triggers:**
- P0 crash affecting >20% of sessions
- BYOK key leakage or security issue (any instance = hard stop)
- Day-7 retention <30% (product not delivering core value)

**Actions if no-go:** Extend alpha 1 week, fix blockers, re-evaluate.

### 3.3 Gate 2 — Closed Beta Launched (Day -14)

**Go criteria (ALL required):**
- [ ] 100+ beta users onboarded
- [ ] Beta Discord active (>30 members, >10 messages/day)
- [ ] Weekly beta digest sent (email #1 delivered, >35% open rate)
- [ ] In-app microsurveys deployed and returning data
- [ ] Waitlist at ≥200 (demand validation)

**No-go triggers:**
- <50 beta users accept invites (demand signal weak)
- Discord under 10 active members after 48 hours (community formation failed)
- Any data privacy incident (hard stop regardless of size)

### 3.4 Gate 3 — Pre-Launch Ready (Day -7)

**Go criteria (ALL required):**
- [ ] Beta NPS ≥40 (product-market fit signal)
- [ ] Day-7 beta retention ≥55%
- [ ] Branches per session ≥2 (core mechanic adopted)
- [ ] Waitlist at ≥300
- [ ] Product Hunt listing submitted + approved
- [ ] All launch announcement copy finalized (Twitter thread, HN, PH)
- [ ] Hunter confirmed for Product Hunt
- [ ] Launch blog post written, reviewed, ready to publish
- [ ] Demo GIF/video ready (≤90 seconds, shows branching clearly)
- [ ] Free tier functional (5 conversation limit enforced cleanly)
- [ ] Pro billing tested (Stripe integration, upgrade flow works)

**No-go triggers:**
- Beta NPS <25 (messaging or product problem — do not launch into bad signal)
- Pro billing not working (revenue blocker)
- Waitlist <150 (insufficient initial audience for launch amplification)

**Partial go:** If waitlist is 150–300 but NPS is ≥40, proceed but scale down day-0 push; focus on HN + PH only, skip paid communities.

### 3.5 Gate 4 — Launch Day Green Light (Day 0, 11:30 PM EST the night before)

**Final checks (30 min before 12:01 AM PH launch):**
- [ ] Product Hunt listing live and all assets uploaded
- [ ] app.gettraek.com load tested (can handle spike)
- [ ] Email sequence set to "live" (not "paused")
- [ ] Discord `#announcements` message drafted and ready
- [ ] HN post drafted in a browser tab, ready to submit at 7 AM
- [ ] Twitter thread drafted in Buffer, scheduled for 8 AM EST
- [ ] Team all-hands: Nico monitoring PH and Twitter, respond within 15 minutes to all comments

**Launch abort criteria (any = delay 24h):**
- app.gettraek.com down or returning errors
- Stripe/billing system failing
- P0 bug discovered in the past 12 hours

---

## 4. 4-Week Pre-Launch Warmup Campaign

Target launch date: **Monday 2026-03-16** (based on PH listing submitted by March 9)

### 4.1 Week -4 (Feb 17–23): Foundation

**Goal:** Set up infrastructure, start building in public quietly.

| Day | Action | Channel | Owner |
|-----|--------|---------|-------|
| Mon | Waitlist landing page live | app.gettraek.com | Dev |
| Mon | Email sequence configured (Resend) | Email | CMO |
| Tue | Referral tracking deployed | In-app | Dev |
| Wed | "Something is coming" teaser tweet | Twitter/X | CMO |
| Thu | GitHub Discussion: "What would you build with hosted Traek?" | GitHub | CMO |
| Fri | Invite first 20 alpha users | Email | CMO |
| Fri | Discord server created (invite-only, alpha only) | Discord | CMO |

**Copy for "something is coming" tweet:**
```
Been building something for people who think in branches, not threads.

Not ready to talk about it yet. But if you've ever lost a great idea
to the AI scroll — stay tuned.
```

### 4.2 Week -3 (Feb 24 – Mar 2): Alpha & Seeding

**Goal:** Run alpha, gather first signal, start warming up key channels.

| Day | Action | Channel | Owner |
|-----|--------|---------|-------|
| Mon | Alpha feedback collected (Day 7 check-in) | Discord/Email | CMO |
| Tue | Blog post published: "Why Linear Chat Fails Complex Thinking" | Blog, Dev.to | CMO |
| Wed | Tweet: behind-the-scenes of building the canvas | Twitter/X | CMO |
| Thu | Blog post distributed to Dev.to, Hashnode | Dev.to | CMO |
| Thu | Reach out to 5 AI newsletters (Rundown AI, TLDR AI, Ben's Bites) | Email | CMO |
| Fri | Gate 1 review: alpha go/no-go decision | Internal | All |

**Newsletter outreach template:**
```
Subject: New spatial AI canvas launching March 16 — press preview?

Hi [Name],

Launching Traek Playground on March 16 — a spatial AI canvas where
conversations branch instead of scroll. BYOK, open-source core, free tier.

Built on @traek/svelte which is already at 580 GitHub stars.

Product Hunt launch + HN that day. Would love [newsletter name] coverage
if it's a fit for your readers.

Happy to offer early access + press preview this week.

Demo: app.gettraek.com (invite-only — I'll send you an access link)
Press kit: [link to brand folder]

— Nico
Traek
```

### 4.3 Week -2 (Mar 3–9): Closed Beta & Content Push

**Goal:** Launch closed beta, build community, finalize launch assets.

| Day | Action | Channel | Owner |
|-----|--------|---------|-------|
| Mon | Closed Beta Wave 1 invites sent (100 users) | Email | CMO |
| Mon | Discord `#beta-feedback` + templates live | Discord | CMO |
| Tue | Tweet thread (Day 1 of 3): "How the spatial canvas works" | Twitter/X | CMO |
| Wed | Tweet thread (Day 2 of 3): "Branching — the core mechanic" | Twitter/X | CMO |
| Thu | Tweet thread (Day 3 of 3): "BYOK — why we built it this way" | Twitter/X | CMO |
| Thu | Blog post: "How I Built a Spatial AI Canvas in Svelte 5" | Blog, HN | CMO/Dev |
| Thu | Submit Product Hunt "coming soon" listing | Product Hunt | CMO |
| Fri | r/sveltejs: "Building a hosted spatial AI app with Svelte 5" | Reddit | CMO |
| Fri | Gate 2 review: closed beta go/no-go | Internal | All |

**3-tweet build-in-public thread (Day 1):**
```
1/ Building in public: the spatial AI canvas.

Here's what "branching conversations" actually looks like.

Every message is a node. You can branch from any node at any time.
Both paths stay alive. Zoom out — see the whole session.

[Screen recording: 30s of canvas navigation + one branch creation]

↓ How we built it (thread)
```

### 4.4 Week -1 (Mar 10–16): Launch Prep & Final Push

**Goal:** Finalize all launch assets, prime the community, execute launch.

| Day | Action | Channel | Owner |
|-----|--------|---------|-------|
| Mon | Blog post: "Introducing Traek Playground" published | Blog | CMO |
| Mon | Gate 3 review: pre-launch go/no-go (7 days out) | Internal | All |
| Tue | Email all beta users: "We're launching in 7 days — can you help?" | Email | CMO |
| Tue | Post in r/LocalLLaMA, r/ChatGPT (preview + feedback request) | Reddit | CMO |
| Wed | Wave 2 invites: next 200 waitlist users | Email | CMO |
| Wed | Discord community push: invite beta users to share sessions | Discord | CMO |
| Thu | Hunter outreach confirmed, briefed on launch | Direct | CMO |
| Thu | All PH assets uploaded (5 gallery slots, copy, maker comment) | PH | CMO |
| Fri | Final Gate 4 dry run: all launch materials reviewed | Internal | All |
| Fri | Waitlist "launch is Monday" email blast | Email | CMO |
| **Sun** | **10 PM EST: Final systems check** | All | CMO |
| **Mon** | **12:01 AM: Product Hunt live** | PH | CMO |
| **Mon** | **7:00 AM: Show HN post** | HN | CMO |
| **Mon** | **8:00 AM: Twitter launch thread** | Twitter | CMO |
| **Mon** | **10:00 AM: Reddit posts** (r/LocalLLaMA, r/ChatGPT) | Reddit | CMO |
| **Mon** | **12:00 PM: Discord AI communities** | Discord | CMO |
| **Mon** | **3:00 PM: Dev.to cross-post of launch blog** | Dev.to | CMO |
| **Mon** | **5:00 PM: LinkedIn post** | LinkedIn | CMO |

**"Launch is Monday" waitlist email:**
```
Subject: Monday. We're launching.
Preview text: Traek Playground goes live in 3 days.

Hey [First name],

Three days.

Monday March 16, Traek Playground launches publicly on Product Hunt
and Hacker News.

Here's how you can help (and why it matters to us):

  1. If you haven't tried the demo: app.gettraek.com
     You can try 5 conversations — no account, no card.

  2. If you're already on the waitlist:
     Your access comes in the first wave — within 48 hours of launch.

  3. If you want to help us launch well:
     [Share your referral link] before Monday.
     Every referral moves you up the queue.

We'll send you the Product Hunt link first thing Monday morning.
Come say hi — every upvote and comment matters for indie launches.

See you on the canvas.

— The Traek team
```

---

## 5. Launch Day Announcement Templates

*Full templates maintained in `docs/copy/product-hunt-launch.md`. Summaries below:*

### Product Hunt
- **Tagline:** "The spatial AI canvas. Branch your thinking, not just your prompts."
- **Maker comment:** Personal story + BYOK ethics rationale + open-source angle
- **Launch day:** Monday March 16, 12:01 AM EST

### Hacker News (Show HN)
```
Show HN: Traek Playground – spatial branching AI canvas (BYOK)

Post at 7:00 AM EST for maximum visibility.
Full draft: docs/copy/product-hunt-launch.md → Appendix: HN Post Draft
```

### Twitter/X Launch Thread
```
Post at 8:00 AM EST.
5-tweet thread starting with: "We just launched Traek Playground..."
Full draft: docs/plans/2026-03-07-playground-launch-gtm.md → Appendix
```

---

## 6. Community Channels Setup

### Primary Beta Channel: Discord

**Server structure (invite-only during beta):**
```
📣 announcements (read-only)
  #product-updates
  #weekly-digest

🧪 beta
  #beta-feedback (template-pinned)
  #beta-bugs
  #beta-show-and-tell

💬 community
  #general
  #use-cases
  #prompt-engineering

🛠️ developers
  #@traek/svelte
  #integrations
  #help

👥 team (beta users + founders only)
  #direct-feedback
```

**Post-launch:** Expand to public server once Wave 2 beta begins.

### Secondary: GitHub Discussions

Use GitHub Discussions for:
- Feature requests (tracked against roadmap)
- Open questions about `@traek/svelte`
- Community tutorials and show-and-tell (indexed by Google)

### Tertiary: Twitter/X

Build-in-public presence (3–4x/week):
- 40% shipping updates
- 30% use case demos (GIFs)
- 20% AI UX thought leadership
- 10% community engagement

---

## 7. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Beta NPS <40 at Gate 3 | Medium | High | Delay launch 2 weeks; fix core UX friction identified in beta feedback |
| Product Hunt launch crowded | Medium | Medium | Hunter with 1k+ followers; launch Monday; have friends "find it useful" (not "upvote") |
| HN post doesn't gain traction | Medium | Medium | Post 7–9 AM EST weekday; title A/B variant ready; drive 5 friends to comment quickly |
| Low waitlist size (<150) | Low | Medium | Accelerate newsletter outreach week -2; manual outreach to AI Twitter accounts |
| Conversion rate <15% on launch day | Medium | Medium | Check free tier friction; A/B landing page copy; simplify first-run |
| Billing not ready for Pro | Low | High | Gate 3 requires Stripe tested; if blocked, launch free-only with manual Pro signups |
| Privacy/security incident | Very Low | Critical | BYOK architecture minimizes this; if it happens, Gate 4 hard stop |

---

## 8. Post-Launch Weeks 1–4

### Week 1 — Maximize Reach

- Respond to every PH comment within 30 minutes (all day)
- Respond to every HN comment personally
- DM top 10 users from launch day traffic (who signed up, who activated)
- "Week 1 shipped" Twitter thread (what we fixed/improved after launch feedback)

### Week 2 — Deepen Engagement

- Blog: "Under the Hood: Rendering 1000+ Nodes at 60fps" (dev credibility, HN submit)
- First user spotlight (share in Discord + Twitter with permission)
- Wave 2 beta: open to next 300 waitlist users
- Community office hours: 60-min Discord voice session, open Q&A

### Week 3 — Build Authority

- Blog: "The Prompt Engineer's Spatial Workflow" (power user use case)
- Tutorial: "Build Your First Branching AI App with @traek/svelte" (Dev.to)
- First user case study published
- Referral program push: remind Founding Members of perks

### Week 4 — Review & Iterate

- "Month 1: [X] Signups and What We Learned" blog post
- Survey all activated users: NPS + open-ended
- Gate review: go/no-go on wave-3 open beta
- Review metrics against targets in §7 of GTM plan
- Debrief: what worked on PH, HN, Twitter; what to replicate

---

*This document should be reviewed with the CEO before finalizing the launch date.*
