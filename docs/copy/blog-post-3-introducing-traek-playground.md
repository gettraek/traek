# Introducing træk Playground

**Published:** Day -3 (pre-launch)
**Target:** All segments — AI power users, developers, knowledge workers
**Channel:** Blog, Dev.to, Twitter, LinkedIn, Reddit, all channels
**CTA:** Join the waitlist at app.gettraek.com
**SEO target keywords:** spatial AI canvas, branching AI conversations, BYOK AI tool, AI conversation tool, træk playground

---

## Introducing træk Playground

Today we're announcing **træk Playground** — a spatial canvas for AI conversations.

If you've read our previous posts, you know the problem: linear chat is the wrong interface for complex thinking. You know the solution: a canvas where conversations branch instead of scroll. Today we're showing you what that looks like in practice — and opening the waitlist.

---

### What It Is

træk Playground is a web app where every AI message is a node on a pannable, zoomable canvas. You bring your own OpenAI or Anthropic API key. Your conversations are yours — they go directly from your browser to the API, not through us.

You can branch from any message at any time. Both paths stay alive. You zoom out and see the shape of your entire session.

That's it. That's the whole idea. Simple in concept; genuinely different in practice.

---

### The Core Features

**Spatial canvas**

Conversations live at coordinates, not scroll positions. Pan left and right. Zoom in to read. Zoom out to navigate. A minimap in the corner shows the structure of your whole session when it gets large.

When you're twenty nodes deep and want to find where a particular thread started, you navigate by shape — not by scrolling past everything you've already read.

**Branching from any node**

Click any message — yours or the AI's — and open a branch. A new path appears. The original path stays exactly where it is. There's no limit to how many branches you can create from a single node.

This is the thing that changes how you use AI for research, planning, and writing. You stop picking one direction. You explore multiple directions simultaneously and compare what you find.

**BYOK — bring your own key**

træk Playground is built on the premise that your conversations are private. In Settings, you paste your OpenAI or Anthropic API key. Your messages travel directly from your browser to that API. We never see them. We never store them.

You pay your AI provider directly for token usage. We charge only for the træk Playground app itself.

**Free to start**

Five full conversations, no account required. Try it without a credit card. If it changes how you think with AI, upgrade to Pro.

---

### Pricing

| Plan | Price | What You Get |
|------|-------|-------------|
| Free | $0 forever | 5 conversations, unlimited branching, BYOK, full canvas |
| Pro | $12 / month | Everything in Free + unlimited conversations, cloud sync, export, sharing |
| Team | $29 / month per seat | Everything in Pro + shared workspaces, collaborative branching, admin controls |

Annual plans save 20%. Founding Members — everyone who joins from the waitlist — lock in current pricing forever. No price increases for you, ever, as long as you're subscribed.

---

### Who It's For

**If you use AI for research:** You can follow multiple hypotheses simultaneously. Branch at each key question. Compare conclusions. Zoom out to see your entire research tree.

**If you use AI for writing:** Explore different angles in parallel. Keep the version you like; branch away the direction you want to try. Never throw away a draft again.

**If you use AI for planning:** Map out scenarios. Branch at key decision points. See the whole decision tree at once instead of reconstructing it from a scroll.

**If you build with AI:** træk Playground is built on `@traek/svelte`, an open-source library. The Playground gives you a production reference implementation of a spatial AI UI. The library lets you build your own.

---

### Built in Public

We've written two posts about how and why we built this:

- **[Why Linear Chat Fails Complex Thinking](/blog/why-linear-chat-fails)** — the problem we're solving, and why it's an interface problem, not a model problem
- **[How I Built a Spatial AI Canvas in Svelte 5](/blog/building-spatial-canvas-svelte5)** — the technical decisions behind the canvas, including the Svelte 5 runes patterns that made it possible

The core engine is open source. `@traek/svelte` is MIT licensed and available now.

---

### What's Not in v1

We'd rather ship something excellent and small than something complete and mediocre. What's not in the first release:

- Local model support (Ollama, LM Studio) — it's on the roadmap; if it matters to you, mention it in the waitlist survey
- Real-time collaborative editing — coming in a future Team release
- Mobile — the canvas UI is desktop-first; a thoughtful mobile experience takes more time than we have right now
- Plugin API — the open-source library handles this for developers who want to customize deeply

---

### Join the Waitlist

We're opening access in waves, starting with people at the top of the waitlist. The fastest way to move up is referrals — share your link and move ahead in the queue.

**[Join the waitlist at app.gettraek.com →]**

Three people behind you in the queue? You can skip ahead of all of them with a single referral.

First wave of invites goes out soon. If spatial AI conversations have been on your wishlist for a while — this is the moment.

---

*Questions? Drop them in the comments or reply to any of our waitlist emails. We read every one.*

*— The træk team*

---

### Technical Notes (for developers)

træk Playground is built with:
- **SvelteKit** on the frontend and backend
- **@traek/svelte** for the canvas engine (open source, MIT)
- **Resend** for transactional email
- **Stripe** for billing
- **Umami** for privacy-first analytics

The conversation canvas renders markdown with `marked` + `DOMPurify`, code blocks with `highlight.js`, and manages streaming updates through Svelte 5's `$state` rune — fine-grained reactive updates that target exactly what changed, not the whole component tree.

If you want to build your own spatial AI interface, start with the library:

```bash
npm install @traek/svelte
```

```svelte
<script>
  import { TraekCanvas } from '@traek/svelte'

  async function handleSend({ messages, onChunk, onDone }) {
    // Stream from your own API endpoint
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages })
    })
    for await (const chunk of streamText(res)) {
      onChunk(chunk)
    }
    onDone()
  }
</script>

<TraekCanvas onSendMessage={handleSend} />
```

Full documentation and examples are in the [GitHub repository](https://github.com/nicholasgasior/traek).
