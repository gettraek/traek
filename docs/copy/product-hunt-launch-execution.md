# Traek Playground — Product Hunt Launch Execution Package

**Launch Date:** Monday 2026-03-10 (12:01 AM EST)
**Task:** [TRK-115](/issues/TRK-115)
**Status:** Execution-ready v1

This is the authoritative, all-in-one launch document. Everything needed to run the day is here.

---

## Part 1: Product Hunt Listing Assets

### 1.1 Name

```
Traek Playground
```

---

### 1.2 Tagline Variants

Ranked by predicted click-through. Use Variant A unless A/B testing is available.

| # | Variant | Angle |
|---|---------|-------|
| A | `Branch your AI conversations. Both paths stay alive.` | Concrete benefit, curiosity hook |
| B | `The spatial AI canvas. Branch your thinking, not just your prompts.` | Positioning + aspiration |
| C | `AI conversations that branch like your ideas` | Simple, scannable |
| D | `Stop scrolling. Start branching. Spatial AI canvas with BYOK.` | Action-oriented, power user |
| E | `Every AI message is a node. Branch from any of them.` | Technical clarity for devs |
| F | `The AI canvas for complex thinking. Spatial, branching, open-source.` | Full stack pitch |
| G | `Fork your AI conversation. Keep both paths going.` | Developer framing (fork = familiar) |

**Recommendation:** Use Variant A for the listing. Use Variant B in descriptions and meta tags. Use Variant G in dev-focused channels.

---

### 1.3 Gallery — 6 Slots (Required Images + Specs)

All images: **1270 × 760 px, 2× retina**. Dark theme. No watermarks.

#### Slot 1 — Hero Screenshot (Required)
**What to show:** Full canvas view. A complete session with 4–5 message nodes visible, 2 visible branches from the same parent. Show the connection lines. Show the canvas pan/zoom controls in the corner. No modal overlays.
**Composition:** Slight left-bias on the canvas, leaving breathing room on the right for the tagline overlay (if used in social previews).
**Must include:** Branch lines, node cards with visible message text (lorem AI content is fine), streaming indicator on one node (subtle pulse).
**Caption:** "Every message is a node. Branch from any of them."

#### Slot 2 — Branching Action GIF (Required)
**Duration:** 6–9 seconds, loops seamlessly.
**Sequence:**
1. Camera at rest on a single conversation thread (2 nodes)
2. Cursor hovers over the bottom node → branch button fades in (0.3s)
3. Click → new branch spawns with animated connection line (0.5s draw)
4. AI response streams in on the new branch (1.5s streaming text)
5. Canvas zooms out smoothly to show both branches (1.2s ease)
6. Cursor pans gently across the canvas — both paths visible
7. Hold 1.5s, loop back
**File format:** Optimized GIF or WebP loop, max 3 MB.
**Caption:** "Branch from any message. Both paths stay open."

#### Slot 3 — BYOK Privacy Flow
**What to show:** The API key settings panel. Emphasize "Key stored in your browser only" text. Show the provider selector (OpenAI / Anthropic). Key field should show a partially masked key (sk-proj-••••••••••••4xK2).
**Overlaid text (if adding callouts):** "Never proxied. Never stored. Goes directly to OpenAI/Anthropic."
**Caption:** "BYOK: your key goes directly to the AI provider. We never see it."

#### Slot 4 — Canvas with Complex Session (Power User View)
**What to show:** A more complex session — 8–10 nodes, 3+ branches, zoomed out 60% so the full tree is visible. Shows the spatial structure of a real research session (e.g., "Startup idea research" with branches like "market sizing," "competitors," "user personas").
**Caption:** "Zoom out. See the full shape of your thinking."

#### Slot 5 — Shared Read-Only Link Preview
**What to show:** A conversation tree being viewed in read-only mode. Show the sharing URL bar at top with "app.gettraek.com/s/xxxx". Show the "Shared by Nico" attribution badge. Canvas is non-interactive (no input bar visible).
**Caption:** "Share your reasoning, not just your conclusion. Read-only link sharing."

#### Slot 6 — Open Source + Developer Card
**What to show:** A split-screen or clean card. Left: GitHub repo card for `gettraek/traek` with star count and MIT badge. Right: Minimal code snippet showing the 3-line setup.
```ts
import { TraekCanvas, TraekEngine } from '@traek/svelte'
const engine = new TraekEngine()
// Spatial AI canvas: drop in anywhere.
```
**Caption:** "@traek/svelte — MIT licensed. Embed a spatial AI canvas in your own Svelte app."

---

### 1.4 Full Product Description

```
Traek Playground is a spatial AI canvas for conversations that branch.

Instead of a linear thread you scroll through, Traek puts your conversation
on a pannable, zoomable canvas. Every message is a node. Branch from any node
at any time — both paths stay alive and explorable.

──────────────────────────────────────────
Why we built it
──────────────────────────────────────────

Linear chat was designed for customer support. Not for research, writing,
planning, or any complex thinking where you need to explore multiple directions
simultaneously.

The "actually, let me go back to that idea" moment happens constantly — and
in linear chat, it's always friction. You scroll up, re-explain context, lose
the thread. Or you open a new tab and lose the connection entirely.

Traek gives every thread the space it deserves.

──────────────────────────────────────────
Key features
──────────────────────────────────────────

Branch from any message — Not just the last one. Mid-conversation pivots
are a feature, not an accident.

Spatial canvas — Pan and zoom to see your entire session. Your thinking,
mapped spatially.

BYOK — Bring Your Own Key — Enter your OpenAI or Anthropic API key. It lives
in your browser session only. Messages go directly from your browser to the
API provider. We never proxy or store them.

Sharable conversation trees — Share read-only links to your branching session.
Show your reasoning, not just your conclusion.

Open-source core — @traek/svelte is the Svelte 5 engine under the hood.
Auditable, extensible, MIT-licensed.

──────────────────────────────────────────
Pricing
──────────────────────────────────────────

Free — 5 conversations, no account required, local storage only
Pro ($12/mo) — Unlimited conversations, cloud sync, export, sharing

──────────────────────────────────────────
Who it's for
──────────────────────────────────────────

Researchers who explore competing hypotheses with AI. Writers comparing
two directions for a draft. Prompt engineers running controlled variants.
Product managers mapping decision trees with AI assistance. Developers who
want to embed a spatial canvas in their own app.

Anyone who has ever wished they could fork a conversation.

v1.0, day one. We'd love your feedback — especially on the branching UX.
```

---

### 1.5 Maker Comment (Post at exactly 12:01 AM EST)

*Pin this comment first. It must be the first visible comment.*

```
Hey Product Hunt 👋

I'm Nico, maker of Traek.

──────
The problem I kept running into
──────

I use AI constantly for research and planning. The friction point is always
the same: I want to explore multiple directions, but linear chat forces me
to pick one and abandon the others.

Every "wait, let's go back to that first idea" is friction. You scroll up,
re-explain context, paste things back. Eventually you just stop exploring.

──────
What we built
──────

Traek Playground puts your AI conversation on a canvas. Every message is a
node. Branch from any of them. Both branches keep going. Zoom out to see the
whole session.

──────
Three things I want to highlight
──────

1. BYOK is a core principle, not a feature flag.

   Your API key never touches our servers. All calls go from your browser
   directly to OpenAI or Anthropic. This wasn't a performance decision —
   it was an ethics decision.

2. The core is open source.

   @traek/svelte is the engine. MIT licensed. You can audit it, fork it,
   and build your own spatial canvas. The Playground is the hosted layer
   on top — auth, sync, sharing.

3. Free tier with no account.

   5 conversations, fully local. Try the demo before you commit to anything.

──────
What I'd love feedback on
──────

- Is the branching UX intuitive for first-timers?
- What use cases are we not thinking of?
- Does $12/mo for Pro feel right?

Happy to answer questions about the architecture, BYOK implementation, or
how we built the spatial canvas in Svelte 5.

Try it: app.gettraek.com
```

---

### 1.6 First-Hour Engagement Plan (12:01 AM – 1:00 AM EST)

The first hour is the highest-leverage period. Comments and upvotes from
early visitors determine algorithmic placement throughout the day.

**12:01 AM — Post maker comment** (pre-written above). Set it as pinned reply.

**12:05 AM — Personal notifications batch (10–15 messages)**
Send personal DMs (not group messages) to top supporters in your network.
Template:
```
Hey — Traek just went live on Product Hunt. Would love your honest reaction
if you have 2 minutes. No pressure on anything: app.gettraek.com

[PH link]
```
Do NOT say "upvote" or "support us" — PH ToS violation. Say "honest reaction."

**12:15 AM — Monitor comments**
Check PH every 5–10 min. Respond to every comment in first hour. Goal: no
comment older than 20 minutes without a reply during the launch window.

**12:20 AM — Twitter/X warm-up tweet**
Post a single low-key tweet (not the main thread yet — that's at 8 AM):
```
Traek is live on Product Hunt. Spatial AI canvas for conversations that branch.

If you've tried it, we'd love to hear what you think.

app.gettraek.com
[PH link]
```

**12:30 AM — Discord and Slack communities**
Post in relevant dev/AI communities. Appropriate channels: #show-and-tell,
#tools, #ai-projects. Use the community-specific templates in Part 4.

**1:00 AM — First-hour audit**
- Total comments: target 5+
- Total upvotes: target 20+
- Open issues or bugs reported in comments? Log them.
- Anything negative trending? Draft a thoughtful response.

---

## Part 2: Day-of Playbook

### Launch Day: Monday 2026-03-10
### Timezone: All times EST

---

#### Night Before (Sunday 2026-03-09)

| Time | Action |
|------|--------|
| 8 PM | Final listing review: description, gallery, tagline. No changes after this. |
| 8:30 PM | Confirm hunter is briefed and ready. Send reminder with PH link. |
| 9 PM | Pre-write all social posts. Have them in draft or in a doc ready to copy/paste. |
| 9:30 PM | Prepare personal outreach list (20–30 people). Write their names and the personal context to include. |
| 10 PM | Test app.gettraek.com — confirm it's working, fast, mobile-responsive. |
| 10:30 PM | Check GitHub — ensure README links to PH launch. |
| 11 PM | Set alarm for 11:55 PM. Sleep if possible. |
| 11:55 PM | Wake up. Open PH. Have maker comment text ready to paste. |

---

#### Launch Window

| Time | Action |
|------|--------|
| **12:01 AM** | Post maker comment. Pin it. |
| 12:02 AM | Verify listing looks correct: gallery, description, tagline. |
| 12:05 AM | Begin personal outreach batch (10–15 DMs). Do NOT use "upvote." |
| 12:15 AM | Monitor PH comments. Reply to anything immediately. |
| 12:20 AM | Post warm-up tweet (see 1.6 above). |
| 12:30 AM | Post in Svelte Discord (#show-and-tell) and relevant Slack communities. |
| 12:45 AM | Check upvote count. If below 10, expand personal outreach to next tier. |
| 1:00 AM | First-hour audit. Log comment count, upvote count, any issues. |

---

#### Morning Block

| Time | Action |
|------|--------|
| 7:00 AM | **Post HN Show HN** (see Part 3 for full text). Submit from main account. |
| 7:05 AM | Post first comment on HN thread yourself (pre-written, see Part 3). |
| 7:30 AM | Check PH ranking. Target: top 5 by 8 AM. |
| 7:45 AM | Respond to any new PH comments. |
| **8:00 AM** | **Post Twitter/X main launch thread** (see Part 4 for full text). |
| 8:05 AM | Like and reply to first 5 replies to the Twitter thread. |
| 8:15 AM | Post LinkedIn launch post. |
| 8:30 AM | Post in r/sveltejs and r/LocalLLaMA (see existing social-and-community.md for posts). |
| 9:00 AM | Check HN — if 10+ comments, the thread is healthy. Engage with technical questions. |
| 9:30 AM | Check PH ranking and comment queue. Target: responding within 30 min. |

---

#### Midday Block

| Time | Action |
|------|--------|
| 10:00 AM | Sweep all channels: PH, HN, Twitter, Reddit, Discord. |
| 10:30 AM | Post a mid-launch update tweet if ranking is strong: |
| | `"3 hours in, [X] hunters found Traek today. The branching interaction is getting the most comments — good to know. app.gettraek.com"` |
| 11:00 AM | Second personal outreach wave — warm leads who haven't seen the launch yet. |
| 12:00 PM | Midday PH comment sweep. 100% response rate target. |
| 12:30 PM | Check if any bugs reported. If yes, acknowledge on PH and file a GitHub issue immediately. |
| 1:00 PM | Optional: share a 1-minute Loom or screen recording in the PH comments showing the branching in action. |

---

#### Afternoon Block

| Time | Action |
|------|--------|
| 2:00 PM | Check PH ranking. Note trajectory (rising, holding, falling). |
| 2:30 PM | Respond to all outstanding comments across all platforms. |
| 3:00 PM | If HN is still active (50+ comments), post a detailed technical reply to the most upvoted comment. |
| 4:00 PM | Tweet a "highlights from the day" post (specific: quote interesting use cases people shared). |
| 5:00 PM | Final push: post in any communities you haven't hit yet. |
| 6:00 PM | Evening PH sweep. Platform votes often spike between 6–9 PM EST as West Coast comes online. |

---

#### Evening Block

| Time | Action |
|------|--------|
| 7:00 PM | Monitor PH for final ranking push. Top 5 of the day is decided in this window. |
| 8:00 PM | Respond to any remaining comments. |
| 9:00 PM | Post a closing tweet: "Day one of Traek on PH is wrapping up. [X upvotes, Y comments, Z new signups]. We'll keep shipping. Thank you." |
| 10:00 PM | Final PH check. Post a "thank you, we're reading everything" comment. |
| 11:59 PM | PH voting closes. Screenshot final ranking and stats. |

---

#### Post-Launch (2026-03-11 onward)

| Day | Action |
|-----|--------|
| D+1 | Post a "what we learned from launch day" Twitter thread. Specific feedback, interesting use cases, surprises. |
| D+2 | Respond to any remaining HN comments (HN threads stay alive for 2–3 days). |
| D+3 | Blog post: "24 hours of Traek on Product Hunt" — stats, user feedback, what's next. |
| D+7 | Follow up with everyone who commented on PH with a "we shipped [X] based on your feedback" message. |

---

## Part 3: HN Show Post

### Title
```
Show HN: Traek – open-source spatial canvas for AI conversations (Svelte 5, BYOK)
```

### Body
```
I built Traek — a Svelte 5 library and hosted app that puts AI conversation
messages on a pannable/zoomable canvas instead of a linear scroll.

The core problem: complex thinking branches. You're mid-conversation, get
an interesting answer, and want to follow three different threads from it.
Linear chat forces you to pick one and abandon the others.

With Traek, every message is a node at (x, y). Branch from any node. Both
paths stay open. Zoom out to see the full structure of your session.

──────
Open-source library: @traek/svelte
──────

A Svelte 5 component library for building these interfaces.

TraekEngine manages the conversation tree with O(1) map-based lookups
(nodeMap, connectionMap). The streaming pattern: create a node immediately
with status 'streaming', update content chunk by chunk via engine.updateNode(),
then set status 'done'. Svelte 5 runes handle fine-grained reactivity
automatically — no manual subscriptions.

TraekCanvas renders the canvas with pan/zoom, connection lines, streaming
input, and a customizable component map for different node types (text, code,
image, thought/reasoning nodes).

Stack: Svelte 5, TypeScript strict mode, Zod for all external data validation,
Vitest + Playwright for tests.

──────
Hosted product: Traek Playground
──────

BYOK (OpenAI / Anthropic). Your API key goes directly from your browser to
the provider — we never proxy or store it. This was an explicit ethical
decision, not a performance optimization.

Free tier: 5 conversations, fully local, no account required.
Pro: $12/month — cloud sync, export, sharable read-only links.

──────
What I'd like feedback on
──────

1. The branching UX — intuitive or disorienting for first-timers?

2. The BYOK model — is this the right privacy/convenience tradeoff? Or would
   people prefer we handle keys server-side with stronger encryption?

3. Svelte 5 architecture feedback — I'd love to hear from other Svelte devs.
   The streaming + reactive engine pattern was interesting to design.

Repo: github.com/gettraek/traek
Live: app.gettraek.com

Happy to go deep on any technical questions.
```

### First Comment (Post Yourself, Immediately After Submitting)

```
One thing I'll add for context on the technical side:

The branching model is semantically correct, not just visual. When you
branch from a node and send a new message, we walk the parent chain from
that branch's node — not from the original thread's last message. So each
branch has its own actual conversation context with the AI.

This is what makes it more than a cosmetic feature. You're literally running
separate conversation histories that happened to start from the same point.

The tricky part was handling this cleanly with streaming. A streaming response
in a branch can't block anything else. The engine supports concurrent streaming
across multiple nodes — each updates independently via its own node ID.

```

---

## Part 4: Twitter/X Launch Day Thread

*Post at 8:00 AM EST on launch day (2026-03-10).*

### Thread: Launch Day

**Tweet 1 — Hook**
```
Today we're launching Traek Playground.

Every AI message is a node on a canvas.
Branch from any of them.
Both paths stay open.

Here's why linear chat was the wrong shape all along 🧵

app.gettraek.com
```

**Tweet 2 — The Problem**
```
You're 20 messages into a ChatGPT session.

Around message 8, you hit something genuinely interesting.
You kept going. It's buried now.

This isn't a prompt problem. It's a shape problem.

Your thinking is a tree. Chat is a list.
```

**Tweet 3 — The Workarounds People Use**
```
So everyone builds the same workarounds:

→ Copy interesting replies into Notion
→ Open a new chat for each branch
→ Paste everything back with "recap what we discussed"
→ Scroll up trying to find that one message

None of these fix the underlying shape mismatch.
```

**Tweet 4 — What Traek Does**
```
With Traek, every message is a node at (x, y) on a canvas.

Branch from anything.
Both paths keep going.
Zoom out to see the full structure.

The conversation tree is the actual data structure — not just the visualization.
Each branch carries its own conversation history with the AI.
```

**Tweet 5 — BYOK**
```
BYOK: your API key goes directly from your browser to OpenAI or Anthropic.

We don't proxy your requests.
We don't see your messages.
We don't store your key.

This was an ethical decision before it was a product decision.
```

**Tweet 6 — Open Source**
```
The engine is open source.

@traek/svelte — Svelte 5 library for building spatial AI conversation UIs.
MIT licensed. Build your own spatial canvas.

github.com/gettraek/traek
```

**Tweet 7 — Pricing**
```
Free tier: 5 conversations, local storage, no account needed.
Pro: $12/mo — unlimited, sync, export, sharing.

Try it before you pay for it.

app.gettraek.com
```

**Tweet 8 — CTA**
```
We're on Product Hunt today.

If you try it and have thoughts on the branching UX — reply here.
We're reading everything.

[Product Hunt link]
```

---

### Quick Tweets (Single Posts Throughout the Day)

**9 AM — Developer-focused:**
```
The branching in @traek/svelte isn't cosmetic.

When you branch from a node, each branch carries its own conversation history.
You're running semantically separate threads from the same starting point.

50 lines of setup → spatial AI canvas with streaming.
```

**12 PM — Reaction share:**
```
3 hours into our Product Hunt launch.

The use case I didn't expect: prompt engineers using branches to run
controlled A/B comparisons on the same input.

Makes total sense now that I see it. app.gettraek.com
```

**4 PM — End-of-day push:**
```
If you've tried Traek today — what's one thing you'd change?

Genuinely reading replies. The branching UX is getting the most discussion
and I want to understand the friction points.
```

---

## Part 5: Cross-Platform Launch Timing

```
Sunday 2026-03-09
├── 11:55 PM  Wake up, have maker comment ready

Monday 2026-03-10
├── 12:01 AM  PRODUCT HUNT goes live
│   ├── Post + pin maker comment
│   ├── Personal outreach batch (10-15 DMs)
│   └── Warm-up tweet
│
├──  7:00 AM  HACKER NEWS Show HN post
│   └── Self-comment immediately
│
├──  8:00 AM  TWITTER/X main launch thread (8 tweets)
│
├──  8:15 AM  LINKEDIN launch post
│
├──  8:30 AM  REDDIT
│   ├── r/sveltejs (library announcement)
│   └── r/LocalLLaMA (BYOK spatial canvas)
│
├── 10:30 AM  Mid-launch update tweet
│
├──  4:00 PM  "Highlights from today" tweet
│
└──  9:00 PM  Closing tweet + PH thank-you comment
```

**Key constraint:** Product Hunt voting resets at 12:01 AM EST daily. The
24-hour window is everything. All other platforms exist to drive traffic to
the PH listing during that window — not to compete with it.

**Don't post to HN before 7 AM** — early morning US/EU overlap maximizes
HN front page hold time (HN aging algorithm penalizes posts that age through
the night with low engagement).

---

## Part 6: Response Templates

### For positive PH comments

```
Thanks [Name] — really glad [specific thing they mentioned] resonated.
[One sentence of genuine follow-up or question back to them].
```

### For "why not just use [competitor]" questions

```
Great question. [Competitor] is excellent for [what they do]. Where we
differ: [specific technical difference]. If [specific use case] matters
to you, that's where Traek is meaningfully different.

Happy to go deeper if useful.
```

### For bug reports on PH

```
Thanks for catching this — I'm logging it right now. [GitHub issue link]
if you want to track it. We'll have it fixed [timeframe].
```

### For "is this open source?" questions

```
Yes — @traek/svelte is the open-source core. MIT licensed.
github.com/gettraek/traek

The Playground (the hosted app) adds auth, sync, and sharing on top.
```

### For pricing objections

```
Fair feedback. The free tier (5 conversations, fully local) is meant to
give you enough to decide if it fits your workflow — no credit card.

If $12/mo doesn't feel right for your use case, I'd genuinely like to
hear what price point would. Helps us calibrate.
```

---

*End of launch execution package. All copy is execution-ready.*
*For brand assets and visual production specs, see docs/brand/design-system.md.*
*For HN and Reddit community-specific templates, see docs/copy/social-and-community.md.*
