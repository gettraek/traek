# Traek — Neue Roadmap (Team-Workshop-Ergebnis)

**Erstellt:** 2026-02-15
**Zuletzt aktualisiert:** 2026-02-16
**Input von:** UX Designer + Endnutzer, Dev / Tech Lead, UI Designer
**Status:** VERBINDLICH — Dies ist die Roadmap die das Entwicklerteam umsetzt.
**Fortschritt:** Phase 1 ✅ | Phase 2 ✅ | Phase 3 ✅ | Phase 4 ✅ | Backlog: ausstehend

**Synthese-Prinzip**: Wir parallelisieren Quick-Wins aus allen Disziplinen in Phase 1, damit das Produkt sofort besser wird — aber investieren gleichzeitig in die technische Foundation, damit spätere Phasen sicher und schnell gebaut werden können.

---

## Abgeschlossen (nicht Teil dieser Roadmap)

- Phase -2: Zod Integration ✅
- Phase -1: DAG-Migration (Multi-Parent Nodes) ✅
- Phase 0: Quick Wins (Touch Targets, Multi-Line Input, Action Badges, Connection Fading, Error Visibility, Empty State) ✅
- Phase 1: Vertrauen + Foundation ✅ (alle 6 Items)
- Mobile Focus Mode ✅ (vorgezogen aus Phase 4.4, UX-Score 9.2/10)
- Mobile Onboarding ✅ (teilweise vorgezogen aus Phase 4.1)
- 2.6 Conversation Persistence UI ✅ (IndexedDB, Auto-Save, Chat-Liste, Export)
- Light/Dark Mode Toggle ✅ (Theme-Toggle, CSS-Variablen, System-Preference-Erkennung)

---

## Phase 1: "Vertrauen + Foundation" (2 Wochen)

**Ziel**: Das Produkt fühlt sich sofort vertrauenswürdig und professionell an, während die technische Basis für alles Weitere gelegt wird.

**Parallelisierbar**: Ja — alle Items sind unabhängig voneinander.

---

### 1.1 Engine Unit-Test-Suite

- **Was**: Umfassende Tests für alle TraekEngine-Methoden: `addNode`, `addNodes`, `deleteNode`, `deleteNodeAndDescendants`, `duplicateNode`, `updateNode`, `layoutChildren`, `flushLayoutFromRoot`, `getAncestorPath`, `getDescendantCount`, `branchFrom`, `addConnection`, `removeConnection`, `wouldCreateCycle`. Zusätzlich Tests für `connectionPath.ts`, `scrollUtils.ts`, `ActionResolver`.
- **Warum**: <5% Test-Coverage. Kein Refactoring ist sicher ohne Tests. Jedes künftige Feature riskiert Regressionen.
- **Aufwand**: M (3-5 Tage)
- **Abhängigkeiten**: Keine
- **Dateien**: Neue Test-Dateien in `src/lib/__tests__/`, `src/lib/canvas/__tests__/`, `src/lib/actions/__tests__/`
- **Status**: ✅

---

### 1.2 Engine-Interna: Node-ID-Map + Children-Map-Cache

- **Was**: Interne `Map<string, Node>` für O(1)-Lookups statt 22x `this.nodes.find()`. Persistente Children-Map (existiert als `buildChildrenMap()`, wird aber nur in `flushLayoutFromRoot` genutzt) immer vorhalten und bei Mutations inkrementell aktualisieren. Public API (`nodes: Node[]`) bleibt unverändert.
- **Warum**: Aktuell O(n) pro Lookup, O(n²) im Layout. Ab ~100 Nodes spürbar, ab ~200 unbenutzbar.
- **Aufwand**: M (3-4 Tage)
- **Abhängigkeiten**: Idealerweise nach/parallel zu 1.1 (Tests sichern das Refactoring ab)
- **Dateien**: `src/lib/TraekEngine.svelte.ts`
- **Status**: ✅

---

### 1.3 Undo für Delete + Toast-System

- **Was**: Nach jedem `deleteNode`/`deleteNodeAndDescendants` erscheint ein Toast "Node deleted. [Undo]" (30s Timer). Der gelöschte Subtree wird im Memory gehalten und bei Undo wiederhergestellt. Dafür brauchen wir ein leichtgewichtiges Toast-System (Position: unten links, Typen: success/error/info/undo, Auto-Dismiss 4s, max 3 gestackt).
- **Warum**: Ohne Undo ist jede destruktive Aktion eine Quelle von Angst. Angst ist der größte Feind von Exploration — und Exploration ist der Kern von Traek.
- **Aufwand**: M (3-4 Tage)
- **Abhängigkeiten**: Keine
- **Dateien**: `src/lib/TraekEngine.svelte.ts` (Undo-Buffer), `src/lib/TraekCanvas.svelte` (Toast-Container), neue Dateien `src/lib/toast/Toast.svelte`, `src/lib/toast/ToastContainer.svelte`, `src/lib/toast/toastStore.svelte.ts`
- **Status**: ✅

---

### 1.4 Inline-Edit statt `window.prompt()`

- **Was**: Doppelklick auf User-Node macht den Content editierbar (textarea-Overlay oder contenteditable). Enter speichert, Escape bricht ab. Kein browser-nativer Dialog. Die Library stellt das Inline-Edit-UI bereit.
- **Warum**: `window.prompt()` ist der Moment, wo der Nutzer denkt "das ist ein Prototyp, nicht ein Produkt".
- **Aufwand**: S (2-3 Tage)
- **Abhängigkeiten**: Keine
- **Dateien**: `src/lib/TextNode.svelte` (Inline-Edit-Mode), `src/lib/TraekNodeWrapper.svelte` (Doppelklick-Handler), `src/routes/demo/[id]/+page.svelte` (window.prompt entfernen)
- **Status**: ✅

---

### 1.5 Node-Header bereinigen + Micro-Interactions

- **Was**: Zwei UI-Quick-Wins gebündelt:
  1. **Header-Cleanup**: Node-ID-Anzeige (`ID: a4f2` in `TraekNodeWrapper.svelte:142`) entfernen. Stats-Bereich ("Context: N Nodes") durch Zoom-Prozent-Anzeige allein ersetzen oder ganz ausblenden für Endnutzer.
  2. **Micro-Interactions**: (a) Node-Erscheinen: `scale(0.96) + opacity 0` → `scale(1) + opacity 1` (250ms). (b) Streaming-Complete: kurzer Cyan-Puls auf Node-Border (300ms). (c) Send-Feedback: Input-Border blinkt kurz Cyan. (d) `:focus-visible`-States auf alle Toolbar-Buttons, Action-Badges, und sonstige interaktive Elemente.
- **Warum**: Jedes technische Detail das der Endnutzer nicht versteht untergräbt das Vertrauen. Micro-Interactions sind der Unterschied zwischen "funktioniert" und "fühlt sich professionell an".
- **Aufwand**: S (2-3 Tage)
- **Abhängigkeiten**: Keine
- **Dateien**: `src/lib/TraekNodeWrapper.svelte`, `src/lib/TraekCanvas.svelte`, `src/lib/TextNode.svelte`, `src/lib/NodeToolbar.svelte`, `src/lib/actions/ActionBadges.svelte`
- **Status**: ✅

---

### 1.6 Contextual Branching Hint

- **Was**: Wenn ein Node aktiv ist und der Cursor im Input steht, erscheint ein dezenter Tooltip: "Your reply will branch from this message". Beim ERSTEN Branch (>1 Kind eines Nodes) eine kurze Celebration-Nachricht: "You created a branch! Explore different directions."
- **Warum**: Branching ist DAS Alleinstellungsmerkmal. Wenn der Nutzer es nicht entdeckt, ist Traek nur ein "schlechteres ChatGPT".
- **Aufwand**: S (1-2 Tage)
- **Abhängigkeiten**: Keine
- **Dateien**: `src/lib/TraekCanvas.svelte` (Tooltip im Input-Bereich), Toast-System aus 1.3
- **Status**: ✅

---

## Phase 2: "Orientierung + Kern-Features" (3-4 Wochen)

**Ziel**: Der Nutzer verliert sich nie auf dem Canvas und hat die Werkzeuge für produktive Nutzung.

**Voraussetzung**: Phase 1 abgeschlossen (insbes. 1.1 Tests und 1.2 Node-ID-Map)

**Fortschritt**: 3/7 Items abgeschlossen (2.6 Persistence ✅, 2.3 Mobile Breadcrumb ✅, Light/Dark Mode ✅). Nächster Fokus: 2.1 Canvas-Dekomposition (Critical Path Blocker für 2.2 + 2.5). Parallel dazu: 2.4 Subtree Collapse.

---

### 2.1 Canvas-Dekomposition ← NAECHSTES FEATURE (Critical Path)

- **Was**: TraekCanvas.svelte aufbrechen in:
  - `CanvasInteraction.svelte.ts` — Pan/Zoom/Drag State-Machine (~300 Zeilen)
  - `InputForm.svelte` — Bottom-Input mit Action-Resolution (~100 Zeilen)
  - `ViewportManager.svelte.ts` — Scale/Offset/Clamping/CenterOnNode (~150 Zeilen)
  - `NodeRenderer.svelte` — `{#each}` Loop mit Registry-Resolution (~80 Zeilen)
  - `TraekCanvas.svelte` bleibt als Kompositions-Root (~200 Zeilen)
    Keine funktionalen Änderungen — rein strukturelles Refactoring.
- **Warum**: Die God-Component ist nicht testbar und macht jede Änderung riskant. Canvas-Dekomposition ist Voraussetzung für Keyboard-Nav, Minimap, Search-Bar.
- **Aufwand**: L (5-7 Tage)
- **Abhängigkeiten**: 1.1 (Tests sichern Regressionen ab)
- **Dateien**: `src/lib/TraekCanvas.svelte` → aufgeteilt in `src/lib/canvas/` Module

---

### 2.2 Zoom-to-Fit + Minimap + Zoom-Controls

- **Was**:
  1. **Zoom-to-Fit**: Methode `fitAll()` auf Engine/Canvas die den Viewport so berechnet, dass alle Nodes sichtbar sind. Button (unten rechts).
  2. **Minimap**: Kleine (120x90px) semi-transparente Übersicht aller Nodes als farbige Rechtecke. Viewport-Indikator. Klick/Drag navigiert. Collapsible.
  3. **Zoom-Controls**: Kompaktes Widget mit +/- Buttons, "Fit All" Button, Zoom-% (klickbar für Reset auf 100%). Ersetzt den bisherigen Stats-Text.
- **Warum**: "Wo bin ich?" ist das fundamentale Problem auf jedem Canvas.
- **Aufwand**: M (4-5 Tage)
- **Abhängigkeiten**: 2.1 (ViewportManager aus der Dekomposition)
- **Dateien**: `src/lib/canvas/ViewportManager.svelte.ts` (fitAll-Berechnung), neue Dateien `src/lib/canvas/Minimap.svelte`, `src/lib/canvas/ZoomControls.svelte`

---

### 2.3 Context-Path Breadcrumb

- **Was**: Clickable Breadcrumb (Root > ... > Parent > Active) oben links. Max 4 sichtbare Elemente, Rest als `...` mit Dropdown. Role-Farbe (Cyan/Orange Dot) + erste 20 Zeichen Content. Klick navigiert zum Node.
- **Warum**: Die `contextPath()`-Methode existiert auf der Engine, wird aber nur als kryptische Stats-Zahl angezeigt.
- **Aufwand**: S (1-2 Tage)
- **Abhängigkeiten**: Keine (kann parallel laufen)
- **Dateien**: Neue Datei `src/lib/canvas/ContextBreadcrumb.svelte`, `src/lib/TraekCanvas.svelte` (Integration)
- **Hinweis**: Mobile-Version (Breadcrumbs.svelte) existiert bereits im Focus Mode. Desktop-Portierung steht aus.

---

### 2.4 Subtree Collapse + Branch-Count-Badge

- **Was**:
  1. **Collapse**: Toggle-Button `[-]`/`[+]` an Nodes mit Kindern. `collapsedNodes: Set<string>` als View-State auf der Engine. Hidden-Count-Badge "N hidden". Connections zu kollabierten Nodes ausblenden. 200ms fade-out Animation.
  2. **Branch-Badge**: Wenn ein Node >1 Kind hat: kleiner Badge "2 branches" / "3 branches" am unteren Node-Rand.
- **Warum**: Bei 20+ Nodes wird der Canvas unübersichtlich. Collapse ist das wichtigste Werkzeug für Überblick.
- **Aufwand**: M (3-4 Tage)
- **Abhängigkeiten**: 1.2 (Children-Map für effiziente Descendant-Zählung)
- **Dateien**: `src/lib/TraekEngine.svelte.ts`, `src/lib/TraekNodeWrapper.svelte`, `src/lib/canvas/ConnectionLayer.svelte`

---

### 2.5 Keyboard Navigation (Basis) + ARIA Foundation

- **Was**: Arrow-Keys Navigation, Focus-Ring, Mode-Switching, Help-Overlay, ARIA Tree Semantics, Live Regions, prefers-reduced-motion.
- **Warum**: Power-User und Accessibility. Ein Canvas ohne Keyboard ist wie ein Texteditor ohne Cursor-Tasten.
- **Aufwand**: L (5-7 Tage)
- **Abhängigkeiten**: 2.1 (Canvas-Dekomposition)
- **Dateien**: Neue Dateien `src/lib/keyboard/KeyboardNavigator.svelte.ts`, `src/lib/keyboard/KeyboardHelpOverlay.svelte`, `src/lib/a11y/LiveRegion.svelte`

---

### 2.6 Conversation Persistence UI

- **Was**: ConversationStore mit IndexedDB, Auto-Save, Chat-Liste, Speicher-Indikator, Export.
- **Warum**: Nutzer verlieren alles bei Page Reload. Speichern ist die #1 Vertrauens-Grundlage.
- **Aufwand**: M (4-5 Tage)
- **Abhängigkeiten**: Keine harten (serialize/fromSnapshot existieren)
- **Dateien**: `src/lib/persistence/ConversationStore.svelte.ts`, `src/lib/persistence/ChatList.svelte`, `src/lib/persistence/SaveIndicator.svelte`, `src/lib/persistence/indexedDBAdapter.ts`, `src/lib/persistence/exportUtils.ts`
- **PRD**: `feature/conversation-persistence-ui.md`
- **Commit**: `8ea3de4`
- **Status**: ✅
- **Lieferumfang**: IndexedDB mit localStorage-Fallback, Auto-Save (1s Debounce), Chat-Liste mit Datums-Gruppierung (Heute/Gestern/Letzte Woche/Älter), JSON- und Markdown-Export, Legacy-Migration, Save-Indikator (saving/saved/error)

---

### 2.7 Smart Search (Ctrl+F)

- **Was**: Search-Bar, Live-Highlighting, Treffer-Navigation, kollabierte Subtrees expandieren.
- **Warum**: Nicht akzeptabel ab 10+ Nodes ohne Suche.
- **Aufwand**: M (3-4 Tage)
- **Abhängigkeiten**: 2.4 (Subtree Collapse)
- **Dateien**: `src/lib/TraekEngine.svelte.ts`, neue Dateien `src/lib/search/SearchBar.svelte`, `src/lib/search/searchUtils.ts`

---

## Phase 3: "Performance + Differenzierung" (3-4 Wochen)

**Ziel**: Traek skaliert auf 500+ Nodes und liefert das Killer-Feature, das es von ChatGPT unterscheidet.

**Voraussetzung**: Phase 2 abgeschlossen

---

### 3.1 ConnectionLayer Single-Pass + Markdown-Streaming-Optimierung

- **Was**: Drei-Pass-Rendering auf Single-Pass umstellen. Markdown-Streaming nur letzten Absatz neu parsen.
- **Aufwand**: M (3-4 Tage)
- **Abhängigkeiten**: 1.2 (Node-ID-Map)

### 3.2 DOM-Virtualisierung

- **Was**: Nur Nodes im Viewport + Buffer-Zone rendern. ViewportTracker, gecachte Höhen.
- **Aufwand**: L (5-7 Tage)
- **Abhängigkeiten**: 1.2, 3.1, 2.4

### 3.3 Branch-Vergleich (Side-by-Side)

- **Was**: Compare-Button bei 2+ Kindern. Split-View mit Word-Level-Diff.
- **Aufwand**: M (4-5 Tage)
- **Abhängigkeiten**: 2.4

### 3.4 Copy Branch to Clipboard

- **Was**: "Copy this branch" als linearisierten Markdown-Pfad Root→Node.
- **Aufwand**: S (1-2 Tage)
- **Abhängigkeiten**: 1.3 (Toast-System)

### 3.5 Performance-Benchmarks + CI-Guard

- **Was**: Automatisierte Benchmarks: 100/500/1000 Nodes. CI-Guard bei >20% Regression.
- **Aufwand**: S (2 Tage)
- **Abhängigkeiten**: 3.2

---

## Phase 4: "Polish + Skalierung" (3-4 Wochen)

**Ziel**: Traek fühlt sich wie ein Premium-Produkt an und funktioniert auf jedem Gerät.

### 4.1 Onboarding Tour (Desktop)

- **Aufwand**: M (3-4 Tage)
- **Hinweis**: Mobile-Onboarding (OnboardingOverlay.svelte) ist bereits implementiert. Hier geht es um die Desktop-Canvas-Tour.

### 4.2 Design-Token-System

- **Aufwand**: M (3-4 Tage)
- **Hinweis**: Light/Dark-Mode mit ThemeToggle und CSS-Variablen ist bereits implementiert (Commit `f073f10`). Hier geht es um strukturierte Theme-Objekte, High-Contrast-Preset, und Runtime Theme-Switching API.

### 4.3 Adaptives Zoom-Level-Rendering

- **Aufwand**: M (3-4 Tage)
- **Abhängigkeiten**: 3.2

### ~~4.4 Mobile/Touch-Optimierung~~ ✅

- **Status**: ✅ Vorgezogen und abgeschlossen (Mobile Focus Mode, 10 Komponenten, UX-Score 9.2/10)
- **Commits**: `5666327`, `42162df`, `b55a146`, `26004da`, `5519d2d`

### 4.5 Backlog (nach Phase 4, priorisiert) ✅ KOMPLETT

| Item                                              | Aufwand  | Abhängig von | Status |
| ------------------------------------------------- | -------- | ------------ | ------ |
| Keyboard Phase 2: Chords, Quick-Jump, Fuzzy-Suche | S (2d)   | 2.5          | ✅     |
| Tag-System + Filter                               | M (3d)   | 2.6, 2.7     | ✅     |
| Replay-Modus UI                                   | S (2-3d) | 2.6          | ✅     |
| Ghost-Preview                                     | S (1-2d) | -            | ✅     |
| Theme-Presets + Custom Accent-Farbe               | M (3d)   | 4.2          | ✅     |
| Node Edit & Re-Generate                           | M (3d)   | 1.3          | ✅     |
| Connection-Lines aufwerten                        | S (2d)   | 3.1          | ✅     |
| Storybook-Grundausstattung                        | M (3d)   | 2.1          | ✅     |

---

## Gesamtplan-Übersicht

| Phase | Item                                    | Aufwand  | Abhängig von   | Status        |
| ----- | --------------------------------------- | -------- | -------------- | ------------- |
| **1** | 1.1 Engine Unit-Tests                   | M (3-5d) | -              | ✅            |
| **1** | 1.2 Node-ID-Map + Children-Map          | M (3-4d) | -              | ✅            |
| **1** | 1.3 Undo + Toast-System                 | M (3-4d) | -              | ✅            |
| **1** | 1.4 Inline-Edit (statt window.prompt)   | S (2-3d) | -              | ✅            |
| **1** | 1.5 Header-Cleanup + Micro-Interactions | S (2-3d) | -              | ✅            |
| **1** | 1.6 Contextual Branching Hint           | S (1-2d) | -              | ✅            |
| **2** | 2.1 Canvas-Dekomposition                | L (5-7d) | 1.1            | ✅            |
| **2** | 2.2 Zoom-to-Fit + Minimap + Controls    | M (4-5d) | 2.1            | ✅            |
| **2** | 2.3 Context-Path Breadcrumb (Desktop)   | S (1-2d) | -              | ✅            |
| **2** | 2.4 Subtree Collapse + Branch-Badge     | M (3-4d) | 1.2            | ✅            |
| **2** | 2.5 Keyboard Navigation + ARIA          | L (5-7d) | 2.1            | ✅            |
| **2** | 2.6 Persistence UI + Auto-Save          | M (4-5d) | -              | ✅            |
| **2** | 2.7 Smart Search (Ctrl+F)               | M (3-4d) | 2.4            | ✅            |
| **3** | 3.1 ConnectionLayer + Markdown Optim.   | M (3-4d) | 1.2            | ✅            |
| **3** | 3.2 DOM-Virtualisierung                 | L (5-7d) | 1.2, 3.1, 2.4 | ✅            |
| **3** | 3.3 Branch-Vergleich Side-by-Side       | M (4-5d) | 2.4            | ✅            |
| **3** | 3.4 Copy Branch to Clipboard            | S (1-2d) | 1.3            | ✅            |
| **3** | 3.5 Performance-Benchmarks CI           | S (2d)   | 3.2            | ✅            |
| **4** | 4.1 Onboarding Tour (Desktop)           | M (3-4d) | Phase 2        | ✅            |
| **4** | 4.2 Design-Token-System                 | M (3-4d) | -              | ✅            |
| **4** | 4.3 Adaptives Zoom-Rendering            | M (3-4d) | 3.2            | ✅            |
| **4** | ~~4.4 Mobile Focus Mode~~               | L (5-7d) | -              | ✅            |

### Sofort parallelisierbar (alle Dependencies erfüllt)

| Item                                | Aufwand  | Blockiert        |
| ----------------------------------- | -------- | ---------------- |
| **2.1 Canvas-Dekomposition**        | L (5-7d) | 2.2, 2.5         |
| 2.3 Context-Path Breadcrumb Desktop | S (1-2d) | -                |
| 2.4 Subtree Collapse + Branch-Badge | M (3-4d) | 2.7, 3.2, 3.3   |
| 3.1 ConnectionLayer Optimierung     | M (3-4d) | 3.2              |
| 3.4 Copy Branch to Clipboard        | S (1-2d) | -                |

---

## Verifizierung

Nach jeder Phase:

1. `npm run check` — TypeScript-Fehlerfreiheit
2. `npm run test:unit` — Alle Unit-Tests bestehen
3. `npm run build` — Library baut erfolgreich
4. `npm run lint` — Keine Linting-Fehler
5. Manuelle Prüfung der Demo unter `/demo` — alle Features funktionieren
6. Stichproben auf Mobile Safari + Chrome — keine Regressionen
