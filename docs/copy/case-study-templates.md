# Træk Case Study Templates

Three templates for showcasing real-world Træk implementations. Use these as starting points — adapt to the specific builder's story, technical choices, and outcomes.

---

## Template 1: Startup

**Format:** ~800–1200 words + optional code snippet
**Audience:** Founders, solo developers, early-stage teams
**Goal:** Show how Træk accelerates product building and creates differentiated UX

---

### [Startup Name]: [One-line value prop]

**The company:** [2–3 sentences. What they build, who they serve, team size.]

**The problem:** [2–3 sentences. What made linear chat insufficient for their use case. Make this visceral — what was the friction that drove the decision?]

---

#### The situation before Træk

[1–2 paragraphs. Describe the previous approach: a custom-built solution, a linear chat UI, or a raw API integration. What were developers doing manually? What workarounds existed? What user feedback drove the change?]

> *"[Direct quote from the developer about the pain. Something specific and genuine.]"*
> — [Name, role]

---

#### Why Træk

[1 paragraph. What made them choose Træk over building from scratch or using a competitor? Focus on: time to ship, the canvas UX model fitting their use case, the Svelte 5 stack alignment, or developer experience.]

**Key factors:**
- [Factor 1 — e.g., "Branching support matched how their users think about research tasks"]
- [Factor 2 — e.g., "React adapter meant no Svelte migration required"]
- [Factor 3 — e.g., "Theming system fit their existing design tokens in under an hour"]

---

#### The implementation

[1–2 paragraphs. How they integrated Træk. What adapter they used. How long it took. Any customizations — node types, theming, persistence, i18n.]

```[language]
// Optional: a short, illustrative code snippet
// showing a key integration point (e.g., custom node type, onSendMessage handler)
```

---

#### Results

**[Metric 1]:** [e.g., "Reduced session setup time from 3 days to 4 hours"]
**[Metric 2]:** [e.g., "Users explore 3x more conversation branches per session"]
**[Metric 3]:** [e.g., "Zero custom canvas code — shipped with 100% Træk primitives"]

> *"[Quote about outcomes. Something a future Træk user would want to hear.]"*
> — [Name, role]

---

#### What's next

[1 short paragraph. Where the team is going — new features, expanding Træk usage, moving upmarket, etc.]

---

**Built with:** [@traek/[adapter]](https://gettraek.com) · [Other tools, e.g., SvelteKit, Vercel, Supabase]
**Read more:** [Link to their product / GitHub / blog]

---
---

## Template 2: Enterprise

**Format:** ~1000–1500 words
**Audience:** Engineering leads, CTOs, enterprise buyers
**Goal:** Demonstrate Træk's production-readiness, accessibility, theming, and integration depth

---

### [Company Name]: Spatial AI for [Use Case] at Scale

**The company:** [3–4 sentences. Industry, size, what the AI-powered product does, who it serves internally or externally.]

**The challenge:** [The enterprise-specific challenge: compliance requirements, white-label theming for multiple clients, accessibility mandates (WCAG), multi-language support, or integrating with an existing design system.]

---

#### Background

[1–2 paragraphs. Context on their existing AI tooling. Did they build their own chat UI? Were they using a third-party component? What drove re-evaluation — user research, a product roadmap decision, an engineering efficiency initiative?]

---

#### Requirements

Before evaluating solutions, the team defined non-negotiables:

| Requirement | Detail |
|---|---|
| Accessibility | WCAG 2.1 AA minimum |
| Theming | Full CSS custom property control, no style leakage |
| i18n | [Languages] |
| Framework | [React / Vue / Svelte — existing stack] |
| Persistence | Conversation state survives page reload |
| Performance | [Canvas must handle N nodes without jank] |

---

#### Evaluation

[1 paragraph. How they evaluated options — build vs. buy, competitors considered, POC timeline.]

> *"[Quote about why they chose Træk over alternatives.]"*
> — [Name, Engineering Lead / CTO]

---

#### Implementation

[1–2 paragraphs. Implementation approach — who led it, how long, what integrations they built.]

**Key integrations:**
- **Design system:** [How they mapped their existing tokens to `--traek-*` CSS properties]
- **Auth & persistence:** [e.g., Supabase session-backed conversation trees]
- **MCP:** [If relevant — connected Træk to internal tool APIs via MCP]
- **Accessibility:** [What a11y testing revealed and how they resolved it]

---

#### Deployment

[Brief: hosting environment, release rollout, observability setup.]

---

#### Business outcomes

| Metric | Before | After |
|---|---|---|
| [Metric 1] | [Before] | [After] |
| [Metric 2] | [Before] | [After] |
| [Metric 3] | [Before] | [After] |

> *"[Executive quote about ROI or product impact.]"*
> — [Name, role]

---

#### Learnings for teams considering Træk

1. [Practical insight — e.g., "Start with the default theme, then layer your tokens. Don't fork."]
2. [Practical insight — e.g., "The TraekEngine state model maps well to Redux — migration took one sprint."]
3. [Practical insight — e.g., "The MCP integration unlocked internal tool connections we hadn't planned for."]

---

**Built with:** [@traek/[adapter]](https://gettraek.com) · [Stack]
**Industry:** [Industry vertical]
**Team size:** [Engineering headcount]

---
---

## Template 3: Open-Source Project

**Format:** ~600–900 words, conversational
**Audience:** Developers, OSS contributors, hackers
**Goal:** Build community, attract contributors, show what's possible with Træk as a base

---

### [Project Name]: [Tagline]

**What it is:** [2–3 sentences. What the project does, who built it, where to find it (GitHub link).]

**Why it matters:** [1 sentence on the gap in the OSS ecosystem it fills.]

---

#### The idea

[1–2 paragraphs. Origin story. What problem the developer was solving for themselves. Why they reached for Træk instead of building their own canvas layer.]

> *"[Personal quote — something honest and specific about the itch they were scratching.]"*
> — [Name / GitHub handle]

---

#### How they built it

[1–2 paragraphs. Technical approach. What adapter they used. How they customized Træk — custom node types, plugins, theming. Any unusual or creative use of the library.]

**Interesting technical choices:**
- [e.g., "Custom node type for `<ThoughtNode>` that renders chain-of-thought streams differently from final answers"]
- [e.g., "Forked the persistence layer to use IndexedDB instead of localStorage for larger conversation trees"]
- [e.g., "Added a plugin that exports any conversation branch as a Markdown file"]

---

#### The result

[1 paragraph. What the project can do. Link to a live demo or screenshots.]

**Stats (if available):**
- GitHub stars: [N]
- Contributors: [N]
- Active users: [N]

---

#### What's next

[1 paragraph. Roadmap items, call for contributors, specific issues labeled good-first-issue.]

---

**GitHub:** [Link]
**Demo:** [Link if available]
**Built with:** [@traek/[adapter]](https://gettraek.com)
**License:** [License]

---

*Want your project featured? [Submit to the showcase →](https://gettraek.com/showcase)*
