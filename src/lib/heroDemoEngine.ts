import {
  TraekEngine,
  DEFAULT_TRACK_ENGINE_CONFIG,
  type TraekEngineConfig,
} from '$lib/TraekEngine.svelte';

/**
 * Read‑only hero demo engine with a pre‑seeded, branching conversation.
 *
 * Separated from the landing page so the mock data / topology can be reused
 * in other demos and kept out of the UI layer.
 */
export function createHeroEngine(
  config: TraekEngineConfig = DEFAULT_TRACK_ENGINE_CONFIG,
): TraekEngine {
  const engine = new TraekEngine(config);

  const RICH_BUBBLE_MARKDOWN = `## Expert session: getting the most out of it

Here’s how to make your chat with the expert effective.

### Before the session

- **Clarify your goal** — One main question or decision you want input on.
- **Gather context** — Relevant details, what you've already tried, constraints.
- **Set expectations** — Quick answer vs. deeper analysis.

### During the session

- **Be specific** — The more precise your question, the better the advice.
- **Share constraints** — Time, budget, or team limits help the expert tailor the answer.
- **Ask one thing at a time** — Follow-up threads keep the thread clear.

### After the session

- **Summarize** — Note the main recommendation and next steps.
- **Reuse the thread** — Come back to the same expert for follow-ups.

> One clear question per thread usually gets the best response.

**What do you want to focus on first: framing your question, or adding context?**`;

  // Root question
  const rootQuestion = engine.addNode(
    'How do I get the most out of a session with an expert?',
    'user',
    { parentId: null },
  );

  // High‑level guidance bubble
  const overview = engine.addNode(RICH_BUBBLE_MARKDOWN, 'assistant', {
    parentId: rootQuestion.id,
  });

  // Branch A: focus on framing the main question
  const framingUser = engine.addNode(
    'Let’s focus on framing my main question first.',
    'user',
    { parentId: overview.id },
  );

  const framingAnswer = engine.addNode(
    'Good idea. Start with: (1) What decision or outcome you need help with, (2) What you’ve already tried or considered, (3) Any constraints (time, budget). One clear sentence per part usually is enough to get a strong first answer.',
    'assistant',
    { parentId: framingUser.id },
  );

  // Branch B: focus on adding context
  const contextUser = engine.addNode(
    'Actually, I’d like to add more context about my situation.',
    'user',
    { parentId: overview.id },
  );

  engine.addNode(
    'Great. Share 2–3 short bullets covering your current setup, what you’ve already tried, and any blockers. That makes it much easier to give concrete, high‑leverage suggestions.',
    'assistant',
    { parentId: contextUser.id },
  );

  // Follow‑up on Branch A: broad question refinement
  const broadQuestionUser = engine.addNode(
    'What if my question is very broad?',
    'user',
    { parentId: framingAnswer.id },
  );

  const finalReply = engine.addNode(
    '**Narrow it:** Turn “How do I grow?” into “What should I prioritize first: content, outreach, or pricing?” or “What’s the first change you’d make in my situation?” The expert can then go deeper in follow-up messages.',
    'assistant',
    {
      parentId: broadQuestionUser.id,
      autofocus: true,
    },
  );

  engine.activeNodeId = finalReply.id;
  return engine;
}

