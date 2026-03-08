# docs.gettraek.com — Information Architecture & Content Plan

**Autor:** CMO
**Datum:** 2026-03-08
**Status:** Draft v1.0
**Aufgabe:** TRK-119

---

## 1. Information Architecture

### Site-Struktur

```
docs.gettraek.com/
│
├── Getting Started                    ← Priorität 1 (erstes Ziel neuer Nutzer)
│   ├── Introduction                   "Was ist Træk und warum sollte mich das interessieren?"
│   ├── Installation                   npm install, peer deps, framework setup
│   ├── Quick Start (5 min)            Minimal working example mit OpenAI
│   └── Core Concepts Overview         Mentales Modell: Canvas, Nodes, Branching
│
├── Core Concepts                      ← Priorität 2 (tiefes Verständnis)
│   ├── The Canvas Model               TraekCanvas, pan/zoom, viewport
│   ├── TraekEngine                    State management, nodeMap, operations
│   ├── Nodes & Node Types             Node structure, roles, status, types
│   ├── Branching                      branchFrom(), tree model, parent-child
│   ├── Streaming                      Streaming-First design, status lifecycle
│   └── Theming                        CSS custom properties, dark/light, tokens
│
├── API Reference                      ← Priorität 3 (nachschlagewerk)
│   ├── TraekCanvas                    Props, slots, events
│   ├── TraekEngine                    Class API, all methods + properties
│   ├── TextNode                       Props, markdown support
│   ├── Node Types
│   │   ├── NodeTypeRegistry           createDefaultRegistry(), register()
│   │   ├── ImageNode / FileNode       Multimodal types
│   │   ├── CodeNode / EmbedNode       Code & embed support
│   │   └── Custom Node Types          NodeTypeDefinition interface
│   ├── Actions
│   │   ├── ActionResolver             ActionDefinition, ResolveActions
│   │   ├── ActionBadges               Display component
│   │   └── SlashCommandDropdown       Slash command UX
│   ├── Persistence
│   │   ├── ConversationStore          Save/load conversations
│   │   ├── ReplayController           Conversation replay
│   │   └── Export Utils               JSON, Markdown, PDF export
│   ├── Theme System
│   │   ├── ThemeProvider              useTheme(), applyThemeToRoot()
│   │   ├── ThemePicker / ThemeToggle  UI components
│   │   ├── Theme Tokens               TraekTheme schema reference
│   │   └── WCAG Utilities             validateThemeContrast(), color utils
│   ├── i18n                           setTraekI18n(), translations
│   ├── Resilience
│   │   ├── StreamReconnector          Backoff, reconnect strategy
│   │   └── ConnectionStatus           UI indicator
│   ├── Collaboration (Collab add-on)  CollabHandle, CollabCursorsOverlay
│   └── Types Reference                All exported TypeScript types
│
├── Guides (Recipes)                   ← Priorität 4 (how-to)
│   ├── Build a Basic AI Chat          Minimal integration, no branching
│   ├── Add Branching to Your App      branchFrom(), conversation paths
│   ├── Custom Node Types              Registry, lifecycle, toolbar actions
│   ├── Custom Themes                  createCustomTheme(), CSS overrides
│   ├── Persisting Conversations       ConversationStore + localStorage
│   ├── Keyboard Navigation            Key bindings, accessibility
│   ├── Mobile & Touch                 FocusMode, touch gestures
│   ├── Internationalization           Adding languages, RTL basics
│   ├── Testing with Træk              Vitest patterns, logic extraction
│   └── Performance Optimization       Virtualization, large trees
│
├── Examples                           ← Priorität 5 (inspiration + copy-paste)
│   ├── OpenAI Streaming Chat          Full working demo
│   ├── Multi-Branch Research Tool     Deep branching use case
│   ├── Custom Node Type Gallery       Image, code, embed nodes
│   ├── Persistence + History          Save/restore + version history
│   └── Collaborative Canvas           @traek/collab integration
│
├── Migration                          ← Priorität 6 (nur bei Releases nötig)
│   └── v0.x → v1.0                   Breaking changes, upgrade guide
│
└── Changelog                          ← Automatisch aus Git tags generiert
    └── All Versions
```

### Navigations-Hierarchie

**Primäre Sidebar:** Sektionen als Gruppen, kollabiert nach Abschnitt
**Breadcrumbs:** Alle Tiefen > 1
**On-Page TOC:** Rechts, H2/H3-Links
**Search:** Global, Volltext (Pagefind)

---

## 2. Content Plan — Prioritätsreihenfolge

### Phase 1: Launch-kritisch (v1.0 Release)

| Dokument | Sektion | Priorität | Schätzung |
|---|---|---|---|
| Introduction | Getting Started | P0 | ½ Tag |
| Installation | Getting Started | P0 | ½ Tag |
| Quick Start | Getting Started | P0 | 1 Tag |
| Core Concepts Overview | Getting Started | P0 | ½ Tag |
| The Canvas Model | Core Concepts | P0 | 1 Tag |
| TraekEngine | Core Concepts | P0 | 1 Tag |
| Nodes & Node Types | Core Concepts | P0 | 1 Tag |
| Branching | Core Concepts | P0 | ½ Tag |
| TraekCanvas API | API Reference | P0 | 1 Tag |
| TraekEngine API | API Reference | P0 | 1½ Tage |
| Build a Basic AI Chat | Guides | P0 | 1 Tag |
| OpenAI Streaming Example | Examples | P0 | 1 Tag |
| **Gesamt Phase 1** | | | **~10 Tage** |

### Phase 2: Post-Launch (innerhalb 4 Wochen)

| Dokument | Sektion | Priorität |
|---|---|---|
| Streaming | Core Concepts | P1 |
| Theming | Core Concepts | P1 |
| TextNode API | API Reference | P1 |
| Node Types API (alle) | API Reference | P1 |
| Theme System API | API Reference | P1 |
| Add Branching to Your App | Guides | P1 |
| Custom Node Types | Guides | P1 |
| Custom Themes | Guides | P1 |
| Multi-Branch Research Tool | Examples | P1 |

### Phase 3: Ergänzend (laufend)

| Dokument | Sektion | Priorität |
|---|---|---|
| Persistence API | API Reference | P2 |
| i18n API | API Reference | P2 |
| Resilience API | API Reference | P2 |
| Collab API | API Reference | P2 |
| Persisting Conversations | Guides | P2 |
| Keyboard Navigation | Guides | P2 |
| Mobile & Touch | Guides | P2 |
| Internationalization | Guides | P2 |
| Testing with Træk | Guides | P2 |
| Performance Optimization | Guides | P2 |
| Persistence + History Example | Examples | P2 |
| Collaborative Canvas Example | Examples | P2 |
| Migration v0.x → v1.0 | Migration | P2 |

---

## 3. Getting Started Guide — Draft

### Introduction

**Datei:** `docs/getting-started/introduction.md`

```markdown
---
title: What is Træk?
description: Træk is a Svelte 5 UI library for building spatial, tree-structured AI conversation interfaces.
---

# What is Træk?

Linear chat is a UX constraint, not a product requirement.

When you think with an AI, you branch. You explore one path, realize it's wrong, back up, try another. Linear chat forces you to scroll back, copy-paste context, or start over. **Træk is built for how thinking actually works.**

Træk gives your users a **pannable, zoomable canvas** where every AI message is a node—and every node can spawn branches. Users can explore multiple reasoning paths simultaneously, zoom out to see the whole conversation tree, and navigate the space of ideas spatially.

## Who is Træk for?

Træk is a **developer library**. You bring the AI provider (OpenAI, Anthropic, any streaming API), and Træk handles the canvas, the tree, the branching UX, and all the rendering complexity.

Build with Træk if you're creating:
- **AI research tools** — explore multiple hypotheses simultaneously
- **Writing assistants** — branch at any paragraph, compare outcomes
- **Code generation tools** — try different approaches without losing context
- **Brainstorming apps** — spatial idea organization with AI as collaborator
- **Educational tools** — show multiple explanations of the same concept

## Key concepts

**Canvas** — An infinitely pannable, zoomable space. Users navigate with mouse drag or trackpad, zoom with scroll.

**Node** — A single message (user or assistant). Nodes have positions on the canvas and render as cards.

**Branch** — Any node can spawn child nodes. A branch creates a new conversation path from that point.

**TraekEngine** — The state manager. Handles the conversation tree, node positions, and all operations.

**TraekCanvas** — The main UI component. Renders everything: nodes, connections, controls, input.

## Framework support

Træk is currently a **Svelte 5** library (`traek`). React and Vue adapters are on the roadmap.

## What's next?

→ [Installation](/getting-started/installation)
→ [Quick Start — 5-minute example](/getting-started/quick-start)
```

---

### Installation

**Datei:** `docs/getting-started/installation.md`

```markdown
---
title: Installation
description: Add Træk to your Svelte 5 project in under 5 minutes.
---

# Installation

## Requirements

- **Svelte 5** (runes syntax)
- **SvelteKit** recommended (not required)
- **Node.js** 18+

## Install

```bash
npm install traek
```

## Peer dependencies

Træk uses these libraries internally. They are bundled — no additional installs required.

If you're using Træk with an existing project that already includes `marked` or `highlight.js`, there are no conflicts.

## TypeScript

Træk ships full TypeScript definitions. No extra `@types` packages needed.

## Next step

→ [Quick Start](/getting-started/quick-start)
```

---

### Quick Start

**Datei:** `docs/getting-started/quick-start.md`

```markdown
---
title: Quick Start
description: Build a branching AI chat in 5 minutes.
---

# Quick Start

This guide builds a minimal branching AI chat that streams responses from OpenAI.
Total time: ~5 minutes.

## 1. Create your SvelteKit app

```bash
npx sv create my-ai-app
cd my-ai-app
npm install traek
```

## 2. Add the API route

Create `src/routes/api/chat/+server.ts`:

```typescript
import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST({ request }) {
  const { messages } = await request.json();

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

## 3. Build the canvas page

Create `src/routes/+page.svelte`:

```svelte
<script lang="ts">
  import { TraekCanvas, TraekEngine } from 'traek';

  const engine = new TraekEngine();

  async function handleSendMessage(content: string, parentId: string | null) {
    // Add user message
    const userNode = engine.addNode({ content, role: 'user', parentId });

    // Add streaming assistant node
    const assistantNode = engine.addNode({
      content: '',
      role: 'assistant',
      parentId: userNode.id,
      status: 'streaming',
    });

    // Build message history for this branch
    const messages = engine.getBranchMessages(assistantNode.id)
      .map(n => ({ role: n.role, content: n.content }));

    // Stream the response
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      engine.appendToNode(assistantNode.id, decoder.decode(value));
    }

    engine.setNodeStatus(assistantNode.id, 'done');
  }
</script>

<TraekCanvas {engine} onSendMessage={handleSendMessage} />

<style>
  :global(body) { margin: 0; }
</style>
```

## 4. Add your API key

Create `.env`:

```
OPENAI_API_KEY=your-key-here
```

## 5. Run it

```bash
npm run dev
```

Open `http://localhost:5173`. Type a message. Click **Branch** on any response to start a new conversation path.

## What you built

- A spatial canvas with pan/zoom
- Full streaming responses
- Branching from any message
- Markdown rendering with syntax highlighting

## Next steps

- [Core Concepts](/core-concepts) — understand the TraekEngine and canvas model
- [Custom Themes](/guides/custom-themes) — make it yours
- [Persisting Conversations](/guides/persisting-conversations) — save user sessions
```

---

## 4. Tech Stack Empfehlung

### Entscheidung: **Starlight** (Astro-basiert)

**URL:** https://starlight.astro.build

#### Warum Starlight?

| Kriterium | Starlight | VitePress | Custom |
|---|---|---|---|
| Built-in Search (Pagefind) | ✅ | ❌ (Algolia nötig) | ❌ |
| Versioned Docs | ✅ (Plugin) | ✅ | aufwändig |
| Svelte-Kompatibilität | ✅ (Astro Integrationen) | ❌ | ✅ |
| MDX Support | ✅ | ✅ | — |
| i18n / Multi-language | ✅ built-in | ✅ | — |
| Accessibility | ✅ | ✅ | hoch aufwändig |
| Aktive Entwicklung | ✅ | ✅ | — |
| Deploy auf Vercel/Netlify | ✅ | ✅ | ✅ |
| Customization | hoch | hoch | max |
| Time to setup | **2h** | 4h | 2+ Wochen |

#### Alternativen (abgelehnt)

- **VitePress**: Für Vue-Projekte optimiert. Svelte-MDX-Integration umständlicher. Kein Pagefind.
- **Custom (SvelteKit)**: Max. Kontrolle, aber ein eigenständiges Projekt zu warten neben der Library ist Overhead. Erst ab 50k+ Seiten sinnvoll.
- **Docusaurus**: React-basiert. Wäre Friction für das Svelte-orientierte Traek-Ökosystem.

#### Starlight Konfiguration (Grundstruktur)

```
apps/docs/                    ← Im Monorepo unter apps/
├── src/
│   ├── content/
│   │   └── docs/
│   │       ├── getting-started/
│   │       ├── core-concepts/
│   │       ├── api/
│   │       ├── guides/
│   │       ├── examples/
│   │       └── migration/
│   └── assets/
├── astro.config.mjs
└── package.json
```

**astro.config.mjs Grundgerüst:**

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import svelte from '@astrojs/svelte';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Træk Docs',
      logo: { src: './src/assets/logo.svg' },
      social: {
        github: 'https://github.com/gettraek/traek',
        discord: 'https://discord.gg/traek',
      },
      sidebar: [
        { label: 'Getting Started', autogenerate: { directory: 'getting-started' } },
        { label: 'Core Concepts', autogenerate: { directory: 'core-concepts' } },
        { label: 'API Reference', autogenerate: { directory: 'api' } },
        { label: 'Guides', autogenerate: { directory: 'guides' } },
        { label: 'Examples', autogenerate: { directory: 'examples' } },
        { label: 'Migration', autogenerate: { directory: 'migration' } },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    svelte(),
  ],
});
```

#### Deployment

- **Hosting:** Vercel (kostenlos, automatische Previews für PRs)
- **Domain:** docs.gettraek.com (CNAME auf Vercel)
- **CI:** GitHub Action auf Push zu `main` → Auto-deploy

---

## 5. Versioned Docs Strategie

### Grundprinzip

Træk folgt **Semantic Versioning** (semver). Die Docs-Versionsstrategie orientiert sich daran:

```
Major breaking changes → neues Versions-Tab in Docs
Minor/patch            → nur aktualisierter Inhalt, kein neuer Tab
```

### Starlight Versioning Plugin

**Plugin:** `@astrojs/starlight-versions` (offiziell, ab Starlight v0.23+)

#### Versions-Tab-Strategie

| Phase | Versionen sichtbar | Maintained |
|---|---|---|
| Pre-v1 | `main` (unstable) | ✅ |
| v1.0 Release | `v1` (stable), `main` (next) | ✅ / ✅ |
| v2.0 Release | `v2` (stable), `v1` (maintenance), `main` (next) | ✅ / ❌* / ✅ |

\* v1 nur Security-Patches, keine neue Features

**Policy:** Max. **n + 1 aktive Versionen** (aktuell + previous major). Ältere werden archiviert/readonly.

#### Workflow bei Major Release

1. `git tag v1.0.0` erstellen
2. Branch `docs/v1` aus `main` erstellen
3. Starlight-Versions-Plugin: neuen Version-Tab `v1` konfigurieren
4. `main`-Tab wird automatisch zu `v2 (next)`
5. Migration Guide `v0.x → v1.0` publishen

#### Changelog-Automatisierung

- **Tool:** `changesets` (bereits von vielen Svelte-Projekten genutzt)
- **Workflow:** Jeder PR mit API-Änderungen enthält `.changeset/` Datei
- **Release:** `changeset version` + `changeset publish` via GitHub Action
- **Changelog-Seite:** Auto-generiert aus Changeset CHANGELOG.md nach Starlight

#### Branch-Namenskonvention

```
main          ← Immer aktuelle Docs (latest stable)
docs/v1       ← v1.x Maintenance-Branch
docs/v2       ← (zukünftig) v2.x
```

### Metadata für Versionierung (Frontmatter)

Seiten, die sich zwischen Versionen stark unterscheiden, erhalten:

```yaml
---
title: TraekEngine API
description: Complete API reference for TraekEngine
version: v1.0+
deprecated: false
---
```

---

## 6. Nächste Schritte (empfohlene Aufgaben)

Diese IA + Content Plan ist die Grundlage. Für die Umsetzung empfehle ich folgende Tasks:

1. **TRK-DEV:** Starlight-basiertes `apps/docs` App im Monorepo aufsetzen
   → Assignee: DEV-Agent
   → Output: Lauffähige Docs-App mit Navigation, Deploy-Pipeline

2. **TRK-CMO:** Phase-1-Inhalte schreiben (10 Dokumente)
   → Assignee: CMO
   → Basierend auf Getting Started Draft (oben) + API-Extraktion aus Source

3. **TRK-DEV:** API-Referenz aus TypeScript-Types auto-generieren
   → `typedoc` oder `@jsdoc/typedoc-plugin-markdown` → Starlight
   → Verhindert Drift zwischen Code und Docs

4. **TRK-CMO:** Changeset-Workflow in CONTRIBUTING.md dokumentieren

---

*Dieses Dokument wird mit dem Issue [TRK-119](/issues/TRK-119) synchronisiert.*
