# Traek — Finale Roadmap

**Erstellt:** 2026-02-15
**Verantwortlich:** Product Owner
**Input von:** UX Designer, Endnutzer-Feedback
**Status:** VERBINDLICH — Dies ist die Roadmap die das Entwicklerteam umsetzt.

---

## Grundsaetze

1. **Basics vor Features**: Persistence, Onboarding, Search sind Voraussetzung fuer alles andere.
2. **UX und Nutzer sind sich einig**: Speichern, Verstehen (Onboarding), Finden (Search) sind die drei groessten Gaps.
3. **Accessibility ist nicht optional**: Keyboard + ARIA laufen parallel zu den Basis-Features.
4. **Quick Wins zuerst**: 2 Tage Dev-Zeit fuer massiven UX-Boost.
5. **Replay ist kein P0**: Die Grundlagen (Controller, Controls) sind implementiert, aber UI-Integration hat Zeit.

---

## Phase -2: Zod Integration

**Ziel:** Zod als Runtime-Validierung an allen externen Datengrenzen einfuehren.
**Voraussetzung fuer:** Alles andere — saubere Validierung ab Tag 1.

---

### ZOD-1: Zod einrichten und bestehende Types migrieren

- **Prioritaet**: P0 (ALLERERSTE Aufgabe)
- **Abhaengigkeiten**: Keine
- **Scope**:
  1. **Dependency installieren**: `npm install zod`
  2. **Persistence-Schemas**: Zod-Schemas fuer `SerializedNode`, `ConversationSnapshot` in `src/lib/persistence/schemas.ts`. TypeScript-Types via `z.infer<>` ableiten und bestehende manuelle Interfaces ersetzen.
  3. **Engine-Config-Schema**: Zod-Schema fuer `TraekEngineConfig` in `src/lib/schemas.ts`. Validierung beim Engine-Konstruktor mit `.parse()` oder `.safeParse()`.
  4. **AddNodePayload-Schema**: Validierung von `addNode()` / `addNodes()` Input.
  5. **Action-Types**: Zod-Schemas fuer `ActionDefinition`, `ResolveActions` in `src/lib/actions/schemas.ts`.
  6. **Node-Type-Definitions**: Schema fuer `NodeTypeDefinition` in `src/lib/node-types/schemas.ts`.
  7. **API-Endpoints**: Request/Response-Schemas fuer `/api/chat` und `/api/resolve-actions`.
  8. **fromSnapshot() Validierung**: `TraekEngine.fromSnapshot()` validiert den Snapshot mit dem Zod-Schema bevor er geladen wird. Fehlerhafte Snapshots werden mit klarer Fehlermeldung abgelehnt.
  9. **CLAUDE.md ist bereits aktualisiert** mit der Konvention, Zod fuer alle zukuenftigen externen Datengrenzen zu verwenden.
- **Out of Scope**: Zod fuer interne Engine-State-Mutationen (das waere zu viel Overhead). Nur an Grenzen: Deserialisierung, User-Input, API, Config.
- **Akzeptanzkriterien**:
  - `zod` ist in `package.json` als Dependency
  - Alle Persistence-Types haben Zod-Schemas
  - `fromSnapshot()` validiert Input und gibt klare Fehlermeldung bei ungueltigem Snapshot
  - Engine-Config wird beim Konstruktor validiert
  - API-Endpoints validieren Request-Body
  - TypeScript-Types werden aus Zod-Schemas abgeleitet (kein Duplikat)
  - Alle bestehenden Tests bestehen weiterhin
  - Neue Tests fuer: Schema-Validierung (gueltige + ungueltige Inputs)
- **Betroffene Dateien**:
  - `package.json` (neue Dependency)
  - `src/lib/persistence/types.ts` → Types aus Schemas ableiten
  - `src/lib/persistence/schemas.ts` (NEU)
  - `src/lib/TraekEngine.svelte.ts` (Config-Validierung, fromSnapshot-Validierung)
  - `src/lib/schemas.ts` (NEU — Engine-Config, AddNodePayload)
  - `src/lib/actions/schemas.ts` (NEU)
  - `src/lib/node-types/schemas.ts` (NEU)
  - `src/routes/api/chat/+server.ts` (Request-Validierung)
  - `src/routes/api/resolve-actions/+server.ts` (Request-Validierung)
  - `src/lib/persistence/__tests__/persistence.test.ts` (Schema-Tests ergaenzen)
- **Geschaetzter Aufwand**: Mittel (2-3 Tage)

---

## Phase -1: Multi-Parent Graph Architecture

**Ziel:** Traek von einem Baum (single parent) zu einem DAG (Directed Acyclic Graph) umbauen. User koennen Verbindungen zwischen Nodes frei erstellen und loeschen.
**Voraussetzung fuer:** Alles andere — dies aendert die Kernarchitektur.

---

### DAG-1: Multi-Parent Node Architecture

- **Prioritaet**: P0 (ERSTES Arbeitspaket)
- **Abhaengigkeiten**: Keine — muss als Erstes umgesetzt werden
- **Scope**:
  1. **Node-Interface erweitern**: `parentId: string | null` wird zu `parentIds: string[]` (leeres Array = Root-Node). `parentId` bleibt als deprecated Getter fuer Backwards-Compatibility (`get parentId(): string | null { return this.parentIds[0] ?? null; }`).
  2. **Connection Management auf Engine**:
     - `addConnection(fromId: string, toId: string): boolean` — Erstellt eine Eltern-Kind-Verbindung. Gibt `false` zurueck wenn es einen Zyklus erzeugen wuerde.
     - `removeConnection(fromId: string, toId: string): void` — Entfernt eine Verbindung. Node wird zum Root wenn keine Parents mehr.
     - `getParents(nodeId: string): Node[]` — Alle Eltern eines Nodes.
     - `getChildren(nodeId: string): Node[]` — Alle Kinder (existiert aehnlich bereits).
  3. **Zykluserkennung**: Bevor eine Connection hinzugefuegt wird, pruefen ob `toId` ein Ancestor von `fromId` ist (DFS/BFS auf dem Graphen). Wenn ja, Connection ablehnen und User-Feedback geben.
     - `hasCycle(fromId: string, toId: string): boolean` — Prueft ob das Hinzufuegen der Kante fromId->toId einen Zyklus erzeugen wuerde.
     - `isAncestor(potentialAncestor: string, nodeId: string): boolean` — Helper fuer Zykluserkennung.
  4. **UI fuer Connection-Management**:
     - **Connection erstellen**: User zieht eine Linie von einem Node zu einem anderen (Drag vom Connection-Handle am unteren Rand eines Nodes). Visuelles Feedback waehrend des Drags (gestrichelte Linie). Bei Zyklus: rote Linie + Tooltip "Cannot connect — would create a cycle".
     - **Connection loeschen**: Hover ueber Connection-Line zeigt X-Button in der Mitte der Linie. Klick entfernt die Verbindung.
  5. **Connection-Lines anpassen**: Rendering muss multiple Parents unterstuetzen — ein Node kann mehrere eingehende Linien haben.
  6. **Layout-Anpassung**: `layoutChildren()` muss mit multiple Parents umgehen. Ein Node mit mehreren Parents wird unter dem "primaeren" Parent positioniert (erster in `parentIds`), mit zusaetzlichen Connection-Lines zu den anderen Parents (diese koennen als "sekundaere" gestrichelte Linien dargestellt werden).
  7. **Serialization anpassen**: `SerializedNode.parentId` wird zu `SerializedNode.parentIds: string[]`. Backwards-Compatible: beim Laden alter Snapshots wird `parentId` zu `parentIds: [parentId]` konvertiert.
  8. **Migration bestehender API**: `addNode()` und `addNodes()` akzeptieren weiterhin `parentId` (wird intern zu `parentIds: [parentId]` konvertiert). Neue Signatur `parentIds?: string[]` als Alternative.
- **Out of Scope**: Gewichtete Connections, bidirektionale Connections, Connection-Labels/Typen, automatische Layout-Optimierung fuer DAGs (kommt spaeter), Merge-Nodes (ein Node der zwei Branches zusammenfuehrt)
- **Akzeptanzkriterien**:
  - Nodes koennen mehrere Parents haben
  - User kann per Drag eine neue Connection erstellen
  - User kann per Klick eine Connection loeschen
  - Zyklen werden erkannt und verhindert (mit visuellem Feedback)
  - Bestehende Conversations (single-parent) funktionieren unveraendert
  - `serialize()` / `fromSnapshot()` unterstuetzen multi-parent UND single-parent Snapshots
  - Connection-Lines rendern korrekt bei multiple Parents (primaer: durchgezogen, sekundaer: gestrichelt)
  - Alle bestehenden Tests bestehen weiterhin
  - Neue Tests fuer: Zykluserkennung, addConnection, removeConnection, Multi-Parent-Serialization
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (Node-Interface, neue Methoden, Layout-Anpassung, buildChildrenMap)
  - `src/lib/TraekCanvas.svelte` (Connection-Rendering, Drag-to-Connect UI, Connection-Delete UI)
  - `src/lib/persistence/types.ts` (SerializedNode: parentIds)
  - `src/lib/persistence/ReplayController.svelte.ts` (parentIds-Support)
  - `src/lib/persistence/__tests__/persistence.test.ts` (Multi-Parent-Tests)
  - `src/lib/index.ts` (ggf. neue Type-Exports)
- **Geschaetzter Aufwand**: Gross (1-2 Wochen)

---

## Phase 0: Quick Wins (1 Woche)

**Ziel:** Sofortiger UX-Boost mit minimalem Aufwand.
**Parallelisierbar:** Ja — alle 6 Pakete koennen gleichzeitig bearbeitet werden

---

### QW-1: Touch Target Size

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**: Media-Query `@media (max-width: 768px)` mit vergroesserten Padding-Werten fuer `.node-header` (14px statt 10px), `.action-badge` (8px 12px statt 4px 10px), `.thought-pill` (10px 14px statt 6px 14px). Alle Tap-Targets mindestens 44x44px.
- **Out of Scope**: Responsive Node-Layout, Bottom-Sheet-Input, sonstige Mobile-Optimierungen
- **Akzeptanzkriterien**:
  - Alle interaktiven Elemente >= 44x44px auf Viewports < 768px
  - Desktop-Layout unveraendert
  - Visuell geprueft auf iPhone Safari und Android Chrome
- **Betroffene Dateien**:
  - `src/lib/TraekNodeWrapper.svelte` (CSS ergaenzen)
  - `src/lib/actions/ActionBadges.svelte` (CSS ergaenzen)
  - `src/lib/TextNode.svelte` (CSS fuer thought-pill)
- **Geschaetzter Aufwand**: Klein (1 Stunde)

---

### QW-2: Multi-Line Input

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**: `<input>` durch auto-expandierende `<textarea>` ersetzen. Enter = Senden, Shift+Enter = Neue Zeile. Max 5 Zeilen sichtbar, danach Scroll. `resize: none`.
- **Out of Scope**: Rich-Text-Editor, Markdown-Preview im Input, Drag-and-Drop von Dateien
- **Akzeptanzkriterien**:
  - Enter sendet Nachricht (bestehendes Verhalten erhalten)
  - Shift+Enter fuegt Zeilenumbruch ein
  - Textarea waechst automatisch bis max 5 Zeilen
  - Placeholder-Text bleibt
  - Kein visueller Bruch zum bestehenden Design
- **Betroffene Dateien**:
  - `src/lib/TraekCanvas.svelte` (Input-Element ersetzen, onkeydown-Handler anpassen)
- **Geschaetzter Aufwand**: Klein (2 Stunden)

---

### QW-3: Action Badges Always Visible

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**: Alle registrierten Actions werden immer als Badges angezeigt (nicht nur bei Resolver-Match). Drei visuelle Zustaende: `inactive` (opacity 0.4), `suggested` (opacity 1, Pulse-Animation), `selected` (opacity 1, Cyan-Border).
- **Out of Scope**: Neue Action-Types, Drag-and-Drop-Reihenfolge, Custom Badge Icons
- **Akzeptanzkriterien**:
  - Alle Actions sichtbar, auch ohne Input-Text
  - Suggested Actions visuell hervorgehoben
  - Selected Actions mit Cyan-Border
  - Drei Zustaende klar unterscheidbar
- **Betroffene Dateien**:
  - `src/lib/actions/ActionBadges.svelte` (Filter-Logik entfernen, CSS-States ergaenzen)
- **Geschaetzter Aufwand**: Klein (2 Stunden)

---

### QW-4: Connection Fading

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**: Wenn ein Node aktiv ist, werden alle Connection-Lines die NICHT auf dem Pfad Root->aktiver Node liegen auf opacity 0.2 reduziert. Aktiver Pfad bleibt opacity 1. Smooth Transition (200ms). Helper-Methode `getAncestorPath(nodeId): string[]` auf TraekEngine.
- **Out of Scope**: Farbige Pfad-Hervorhebung, animierte Linien, unterschiedliche Linienstile
- **Akzeptanzkriterien**:
  - Ohne aktiven Node: alle Connections volle Opacity
  - Mit aktivem Node: nur Ancestor-Pfad volle Opacity, Rest 0.2
  - Transition smooth (200ms ease)
  - Funktioniert mit komplexen Baeumen (mehrere Branches)
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (neue Methode `getAncestorPath()`)
  - `src/lib/TraekCanvas.svelte` (Connection-Rendering-Logik, CSS-Klassen)
- **Geschaetzter Aufwand**: Klein (4 Stunden)

---

### QW-5: Improved Error Visibility

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**: Nodes mit `status === 'error'` bekommen roten Border (2px solid #ff3e00), roten Glow (box-shadow), und ein Error-Banner innerhalb des Node-Contents mit Fehlermeldung + Retry-Button. Retry-Button ruft `onRetry(nodeId)` Callback auf (neuer optionaler Prop auf TraekCanvas).
- **Out of Scope**: Automatische Retry-Logik, Error-Logging, Error-Aggregation
- **Akzeptanzkriterien**:
  - Error-Nodes visuell klar erkennbar (roter Border + Glow)
  - Error-Banner zeigt Fehlermeldung
  - Retry-Button vorhanden und funktional (wenn `onRetry` Prop gesetzt)
  - Dismiss-Button setzt Node-Status zurueck
- **Betroffene Dateien**:
  - `src/lib/TraekNodeWrapper.svelte` (Error-Banner-Template, CSS)
  - `src/lib/TraekCanvas.svelte` (neuer `onRetry` Prop)
- **Geschaetzter Aufwand**: Klein (4 Stunden)

---

### QW-6: Empty State Design

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**: Wenn `engine.nodes.length === 0`, wird ein zentrierter Empty-State angezeigt: "Start a conversation" mit Pfeil zum Input-Feld. Verschwindet sobald der erste Node existiert. Sauberes Design mit CSS Custom Properties.
- **Out of Scope**: Animierter Empty State, Template-Auswahl, Beispiel-Conversations
- **Akzeptanzkriterien**:
  - Empty State sichtbar bei leerer Engine
  - Verschwindet sofort bei erstem Node
  - Visuell konsistent mit bestehendem Theming (--traek-* Variablen)
  - Pfeil/Hinweis zeigt zum Input
- **Betroffene Dateien**:
  - `src/lib/TraekCanvas.svelte` (Conditional Rendering, CSS)
- **Geschaetzter Aufwand**: Klein (1 Stunde)

---

## Phase 1a: Kern-Features (parallel)

**Zeitrahmen:** 2-3 Wochen
**Parallelisierbar:** Ja — alle 4 Pakete koennen gleichzeitig bearbeitet werden

---

### P1A-1: Conversation Persistence — Chat-Liste & Auto-Save

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine (serialize/fromSnapshot sind bereits implementiert)
- **Scope**:
  1. **Storage-Backend**: `ConversationStore` Klasse mit IndexedDB-Backend (Fallback: localStorage). Interface: `save(snapshot)`, `load(id)`, `list()`, `delete(id)`, `rename(id, title)`.
  2. **Auto-Save**: Debounced (2 Sekunden nach letzter Aenderung) automatisches Speichern des aktuellen Engine-State. Nutzt `$effect` auf `engine.nodes`.
  3. **Chat-Liste UI**: Sidebar oder Dropdown mit gespeicherten Conversations. Zeigt Titel (auto-generiert aus erstem User-Node, editierbar), Datum, Node-Count. Aktionen: Laden, Loeschen, Umbenennen.
  4. **Neue Conversation**: Button "New Conversation" der den Canvas leert und eine neue Conversation startet.
  5. **Title-Generierung**: Automatischer Titel aus den ersten 50 Zeichen des ersten User-Nodes.
- **Out of Scope**: Cloud-Sync, Export/Import-UI (JSON Download/Upload), Replay-UI, Snapshot-Kompression, Suche in gespeicherten Conversations
- **Akzeptanzkriterien**:
  - Seite neu laden: Conversation bleibt erhalten
  - Chat-Liste zeigt alle gespeicherten Conversations
  - Klick auf Conversation laedt sie
  - "New Conversation" leert Canvas
  - Loeschen entfernt Conversation dauerhaft
  - Umbenennen aktualisiert Titel in der Liste
  - Auto-Save funktioniert ohne manuelle Interaktion
  - Funktioniert im Private/Incognito-Modus (graceful fallback)
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (ggf. Events fuer State-Changes)
  - `src/lib/TraekCanvas.svelte` (Chat-Liste-Integration, New-Conversation-Button)
  - `src/lib/persistence/types.ts` (ConversationStore Interface, ConversationMeta Type)
  - Neue Dateien:
    - `src/lib/persistence/ConversationStore.svelte.ts` (IndexedDB-Backend)
    - `src/lib/persistence/ChatList.svelte` (UI-Komponente)
    - `src/lib/persistence/AutoSave.svelte.ts` (Debounced Save-Logik)
- **Geschaetzter Aufwand**: Mittel (3-5 Tage)

---

### P1A-2: Onboarding Tour & Feature Discovery

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**:
  1. **4-Schritt-Tour**:
     - Schritt 1: Welcome-Modal ("Traek turns conversations into a navigable map")
     - Schritt 2: Spotlight auf Canvas ("Drag to pan, scroll to zoom")
     - Schritt 3: Spotlight auf Input ("Type your first message")
     - Schritt 4: Spotlight auf Node ("Click to select, reply to branch")
  2. **Interaktive Steps**: Tour wartet auf User-Aktion bevor sie weitergeht (Pan/Zoom erkannt, Nachricht gesendet, Node geklickt).
  3. **Help-Button**: Floating Button (unten rechts) der ein Quick-Tips-Overlay oeffnet (Pan, Zoom, Select, Branch, Slash Commands). Immer sichtbar, nicht nur waehrend der Tour.
  4. **localStorage-Persistenz**: `traek-onboarding-completed: true` verhindert erneutes Anzeigen. Help-Button bleibt immer.
  5. **Opt-in fuer Library-Nutzer**: `showOnboarding?: boolean` Prop auf TraekCanvas (default: false). Demo-App setzt es auf true.
- **Out of Scope**: Video-Tutorials, Step-by-Step-Animationen, Onboarding-Analytics, A/B-Testing verschiedener Tour-Varianten, Tooltip-Hints auf Nodes
- **Akzeptanzkriterien**:
  - Tour startet beim ersten Besuch der Demo
  - Jeder Schritt ist skip-bar ("Skip Tour" Button)
  - Tour kommt nach Completion nicht wieder
  - Help-Button oeffnet Overlay mit Quick-Tips
  - Help-Overlay schliesst mit Escape, Klick ausserhalb, oder erneutem Klick
  - Tour blockiert NICHT die normale Canvas-Interaktion (User kann jederzeit abbrechen)
  - `showOnboarding={false}` zeigt keine Tour (Library-Default)
- **Betroffene Dateien**:
  - `src/lib/TraekCanvas.svelte` (neuer `showOnboarding` Prop, Help-Button Slot)
  - Neue Dateien:
    - `src/lib/onboarding/OnboardingTour.svelte` (Tour-Komponente mit Spotlight)
    - `src/lib/onboarding/HelpButton.svelte` (Floating Help-Button + Overlay)
    - `src/lib/onboarding/Spotlight.svelte` (Highlight-Overlay fuer Steps)
    - `src/lib/onboarding/onboardingState.svelte.ts` (Tour-State, localStorage)
- **Geschaetzter Aufwand**: Mittel (3-4 Tage)

---

### P1A-3: Subtree Collapse & Node Count Badge

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine
- **Scope**:
  1. **Collapse-Toggle**: Button `[-]` / `[+]` im Node-Header, nur sichtbar wenn Node Kinder hat. Klick kollabiert/expandiert alle Nachkommen.
  2. **Hidden-Count-Badge**: Kollabierte Nodes zeigen Badge "N hidden" (Anzahl versteckter Nachkommen).
  3. **Connection-Line-Behandlung**: Connections zu kollabierten Nodes werden als gestrichelte Linie dargestellt (oder hidden).
  4. **Engine-Methoden**: `collapseNode(id)`, `expandNode(id)`, `toggleCollapse(id)`, `getDescendantCount(id)`. Collapsed-State als `Set<string>` auf der Engine (nicht auf den Nodes selbst, da es ein View-State ist).
  5. **Keyboard-Support**: Space-Taste auf fokussiertem Node toggled Collapse (vorbereitet fuer Keyboard-Nav-Paket).
  6. **Animation**: Children fade out (200ms opacity transition).
- **Out of Scope**: Rekursives Collapse (Kinder von Kindern), Collapse-State-Persistenz zwischen Sessions, "Collapse All" / "Expand All" Buttons
- **Akzeptanzkriterien**:
  - Collapse-Button erscheint nur auf Nodes mit Kindern
  - Klick versteckt alle Nachkommen
  - Badge zeigt korrekte Anzahl versteckter Nodes
  - Expand zeigt Nachkommen wieder
  - Connections zu versteckten Nodes sind nicht sichtbar
  - Aktiver Node kann nicht kollabiert werden (Schutz)
  - Funktioniert mit verschachtelten Baeumen (3+ Ebenen)
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (neue Methoden, `collapsedNodes: Set<string>`)
  - `src/lib/TraekCanvas.svelte` (Filter collapsed Nodes im Rendering, Connection-Logik)
  - `src/lib/TraekNodeWrapper.svelte` (Collapse-Button, Badge)
- **Geschaetzter Aufwand**: Mittel (3 Tage)

---

### P1A-4: Keyboard Navigation + ARIA Foundation

- **Prioritaet**: P0
- **Abhaengigkeiten**: Keine (laeuft parallel zu anderen P1A-Paketen)
- **Scope**:
  1. **KeyboardNavigator**: Neue Klasse `KeyboardNavigator.svelte.ts` gemaess Spec. Arrow-Key-Navigation (Up/Down = Siblings, Left = Parent, Right = Child). Vim-Bindings (`hjkl`) als opt-in via Config.
  2. **Focus vs. Active State**: Fokus (Outline-Ring, 3px cyan) ist getrennt von Active (Glow + Scale). Beide koennen gleichzeitig auf demselben Node sein.
  3. **Mode-Switching**: Navigation-Mode (Default) vs. Input-Mode. `i` oeffnet Input, `Escape` schliesst Input. `/` oeffnet Input mit Slash-Character.
  4. **Help-Overlay**: `?` zeigt Keyboard-Shortcuts-Overlay (modal, schliesst mit Escape oder erneutem `?`).
  5. **ARIA Tree Semantics**: Canvas bekommt `role="tree"`, Nodes bekommen `role="treeitem"`, `aria-level`, `aria-setsize`, `aria-posinset`, `aria-selected`, `aria-expanded`.
  6. **Live Regions**: `aria-live="polite"` fuer Fokus-Aenderungen und Streaming-Status. Streaming-Ankuendigungen: Start, alle 5s Update, Ende.
  7. **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` deaktiviert alle Animationen. Konfigurierbar via `reducedMotion` Prop.
  8. **Tab-Order**: Canvas-Container `tabindex="0"`, einzelne Nodes `tabindex="-1"` (nur fokussierter/aktiver Node `tabindex="0"`).
  9. **Prop**: `keyboardNavigation?: boolean` (default: false fuer Backwards-Compatibility).
- **Out of Scope**: Chord-System (`gg`, `zz`) — Phase 3. Quick-Jump (Zahlentasten) — Phase 3. Context-Menu mit Shortcut-Hints. Audio-Feedback. Custom Keybindings. Vollstaendige Screen-Reader-Tests (JAWS/NVDA).
- **Akzeptanzkriterien**:
  - Arrow-Keys navigieren korrekt durch den Baum
  - Focus-Ring visuell sichtbar und unterscheidbar von Active-State
  - `i` fokussiert Input, `Escape` kehrt zu Navigation zurueck
  - `?` zeigt/schliesst Help-Overlay
  - VoiceOver auf macOS liest Baumstruktur und Node-Positionen vor
  - Streaming wird via Live-Region angekuendigt (kein Token-Spam)
  - `prefers-reduced-motion: reduce` deaktiviert Animationen
  - Kein Einfluss auf bestehendes Verhalten wenn `keyboardNavigation={false}`
  - Error-Feedback bei Navigation an Baum-Grenzen (roter Flash, 200ms)
- **Betroffene Dateien**:
  - `src/lib/TraekCanvas.svelte` (ARIA-Attribute, keydown-Handler, Props, Live-Region)
  - `src/lib/TraekNodeWrapper.svelte` (role="treeitem", aria-*, tabindex, Focus-Ring CSS)
  - `src/lib/TraekEngine.svelte.ts` (Helper: `getSiblings()`, `getChildren()`, `getParent()`, `getRoots()`, `getNodeDepth()`)
  - `src/lib/TextNode.svelte` (Reduced-Motion CSS, Kontrast-Fixes)
  - Neue Dateien:
    - `src/lib/keyboard/KeyboardNavigator.svelte.ts`
    - `src/lib/keyboard/KeyboardHelpOverlay.svelte`
    - `src/lib/a11y/LiveRegion.svelte`
    - `src/lib/a11y/announce.ts`
    - `src/lib/a11y/types.ts`
  - `src/lib/index.ts` (neue Exports)
- **Geschaetzter Aufwand**: Gross (1-2 Wochen)

---

## Phase 1b: Aufbauende Features (sequentiell)

**Zeitrahmen:** 2-3 Wochen nach Phase 1a
**Voraussetzung:** Phase 1a abgeschlossen

---

### P1B-1: Smart Search (Ctrl+F)

- **Prioritaet**: P0
- **Abhaengigkeiten**: P1A-1 (Persistence) muss fertig sein — Search durchsucht auch gespeicherte Conversations. P1A-3 (Subtree Collapse) sollte fertig sein — Search expanded kollabierte Subtrees bei Treffern.
- **Scope**:
  1. **Search-Bar**: Ctrl+F oeffnet Search-Bar am oberen Rand des Canvas. Eingabefeld + Treffer-Counter ("3 of 12") + Prev/Next-Buttons.
  2. **Live-Suche**: Waehrend der Eingabe werden Treffer sofort auf dem Canvas hervorgehoben (gelber Glow auf Nodes mit Match, Suchbegriff im Text gelb markiert).
  3. **Navigation zwischen Treffern**: Enter / Shift+Enter oder Prev/Next-Buttons springen zum naechsten/vorherigen Treffer. Kamera zoomt automatisch zum Treffer-Node.
  4. **Treffer in kollabierten Subtrees**: Wenn ein Treffer in einem kollabierten Subtree liegt, wird der Subtree automatisch expandiert.
  5. **Case-insensitive Suche** als Default, Toggle fuer Case-Sensitive.
  6. **Engine-Methode**: `searchNodes(query: string): SearchResult[]` — durchsucht `content` aller Nodes, gibt Node-IDs und Match-Positionen zurueck.
  7. **Escape** schliesst Search-Bar und entfernt Highlights.
- **Out of Scope**: Semantic Search / Embeddings, Suche ueber mehrere gespeicherte Conversations, Regex-Suche, Replace-Funktion
- **Akzeptanzkriterien**:
  - Ctrl+F oeffnet Search-Bar
  - Live-Highlights waehrend der Eingabe
  - Enter springt zum naechsten Treffer mit Kamera-Follow
  - Treffer-Counter ist korrekt
  - Escape schliesst Search und entfernt Highlights
  - Funktioniert mit 100+ Nodes ohne Lag
  - Kollabierte Subtrees werden bei Treffern expandiert
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (neue `searchNodes()` Methode)
  - `src/lib/TraekCanvas.svelte` (Search-Bar UI, Highlight-Logik, Keydown fuer Ctrl+F)
  - `src/lib/TextNode.svelte` (Highlight von Suchbegriffen im Content)
  - Neue Dateien:
    - `src/lib/search/SearchBar.svelte`
    - `src/lib/search/searchUtils.ts` (Match-Logik, Highlight-Positionen)
- **Geschaetzter Aufwand**: Mittel (3-5 Tage)

---

### P1B-2: Node Edit & Delete

- **Prioritaet**: P0
- **Abhaengigkeiten**: P1A-3 (Subtree Collapse) — Delete muss mit Collapsed State umgehen. P1A-4 (Keyboard+ARIA) — Fokus-Management nach Delete.
- **Scope**:
  1. **Delete Node**: Button im NodeToolbar oder Context-Menu. Loescht Node UND alle Nachkommen. Bestaetigung bei > 3 Nachkommen ("Delete node and 5 children?"). Fokus springt zum Parent nach Delete.
  2. **Edit Node**: Doppelklick auf User-Node oeffnet Inline-Editor (bestehender Content wird editierbar). Enter speichert, Escape bricht ab. Nur User-Nodes editierbar (Assistant-Nodes sind read-only).
  3. **Re-Generate**: Button auf Assistant-Nodes der den Node loescht und eine neue Antwort generiert (ruft `onSendMessage` erneut mit dem Parent-User-Node auf).
  4. **Engine-Methoden**: `deleteNode(id)` (mit Cascade), `updateNodeContent(id, content)`.
  5. **Undo**: Einfaches Undo fuer Delete (letzter geloeschter Subtree wird 30 Sekunden in Memory gehalten). Toast-Notification "Node deleted. [Undo]".
- **Out of Scope**: Multi-Node-Selection + Batch-Delete, Undo-History (nur letztes Delete), Edit von Assistant-Nodes, Drag-and-Drop Reparenting
- **Akzeptanzkriterien**:
  - Delete entfernt Node und alle Nachkommen
  - Bestaetigung bei Cascade-Delete
  - Fokus springt zum Parent nach Delete
  - Undo stellt Node + Nachkommen wieder her (30s Timeout)
  - Doppelklick auf User-Node oeffnet Editor
  - Enter speichert, Escape bricht ab
  - Re-Generate Button auf Assistant-Nodes funktioniert
  - Geloeschte Nodes verschwinden aus der Chat-Liste (Auto-Save)
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (neue Methoden: `deleteNode()`, `updateNodeContent()`)
  - `src/lib/TraekNodeWrapper.svelte` (Delete-Button, Edit-Mode-Toggle)
  - `src/lib/TraekCanvas.svelte` (Undo-Toast, Re-Generate-Logik)
  - `src/lib/TextNode.svelte` (Inline-Edit-Mode fuer User-Nodes)
  - `src/lib/NodeToolbar.svelte` (Delete + Re-Generate Buttons)
- **Geschaetzter Aufwand**: Mittel (3-5 Tage)

---

## Phase 2: Differenzierung

**Zeitrahmen:** 3-5 Wochen nach Phase 1b
**Voraussetzung:** Phase 1a + 1b abgeschlossen

---

### P2-1: Branch-Vergleich (Side-by-Side)

- **Prioritaet**: P1
- **Abhaengigkeiten**: P1A-3 (Subtree Collapse) muss fertig sein — Vergleich nutzt aehnliche expand/collapse Mechanik. P1B-2 (Node Edit) nice-to-have (nicht blockierend).
- **Scope**:
  1. **Compare-Trigger**: Button "Compare" erscheint automatisch wenn ein Node 2+ Kinder hat (Sibling-Branches). Alternativ: Rechtsklick auf Node -> "Compare branches".
  2. **Split-View**: Overlay/Modal das zwei Branches nebeneinander zeigt. Links: Branch A, Rechts: Branch B. Synchrones Scrollen. Branch-Auswahl ueber Dropdown (wenn > 2 Branches).
  3. **Diff-Highlighting**: Textunterschiede zwischen den Branches werden farblich hervorgehoben (gelber Hintergrund). Diff-Algorithmus auf Wort-Ebene.
  4. **Close-Aktion**: X-Button oder Escape schliesst Split-View und kehrt zum Canvas zurueck.
- **Out of Scope**: Merge von Branches, AI-gestuetzte Zusammenfassung der Unterschiede, mehr als 2 Branches gleichzeitig, Export des Vergleichs
- **Akzeptanzkriterien**:
  - Compare-Button erscheint bei Nodes mit 2+ Kindern
  - Split-View zeigt beide Branches lesbar nebeneinander
  - Scrollen ist synchronisiert
  - Textunterschiede sind farblich markiert
  - Escape schliesst Vergleich
  - Funktioniert auf Mobile (stacked statt side-by-side)
- **Betroffene Dateien**:
  - `src/lib/TraekEngine.svelte.ts` (neue Methode: `getBranchContent(nodeId): MessageNode[]`)
  - `src/lib/TraekNodeWrapper.svelte` (Compare-Button in Toolbar)
  - Neue Dateien:
    - `src/lib/compare/BranchCompare.svelte` (Split-View-Komponente)
    - `src/lib/compare/DiffHighlight.svelte` (Wort-Level-Diff)
    - `src/lib/compare/diffUtils.ts` (Diff-Algorithmus)
- **Geschaetzter Aufwand**: Mittel (4-5 Tage)

---

### P2-2: Performance & Virtualization

- **Prioritaet**: P1
- **Abhaengigkeiten**: Keine harte Abhaengigkeit, aber profitiert von P1A-3 (Subtree Collapse reduziert sichtbare Nodes)
- **Scope**:
  1. **Viewport-Tracking**: `ViewportTracker` berechnet welche Nodes im sichtbaren Bereich + Buffer-Zone (200px) liegen.
  2. **Node-Virtualisierung**: Nur sichtbare Nodes werden als DOM-Elemente gerendert. Unsichtbare Nodes bekommen Placeholder-Divs mit fester Hoehe (gecacht aus letztem Render).
  3. **Connection-Line-Batching**: Alle sichtbaren Connections in ein einzelnes `<svg>` mit einem zusammengesetzten `<path>`. Lines ausserhalb des Viewports werden nicht gerendert.
  4. **Lazy Markdown-Parsing**: `marked()` und `highlight.js` nur aufrufen wenn Node sichtbar wird. Ergebnis cachen.
  5. **Konfigurierbar**: `virtualization?: boolean | { buffer: number }` Prop auf TraekCanvas (default: true ab 50 Nodes).
- **Out of Scope**: Web Worker fuer Layout, Canvas2D/WebGL Rendering, SSR, Incremental Layout (Phase 3)
- **Akzeptanzkriterien**:
  - 500 Nodes: >= 30fps beim Pan/Zoom auf aktuellem Laptop
  - DOM-Element-Count bei 500 Nodes < 200
  - Kein visuelles Flackern beim Scrollen (Buffer-Zone)
  - `virtualization={false}` deaktiviert komplett
  - Keine Regression bei < 50 Nodes
  - Snapshot-Import von 500 Nodes < 2 Sekunden
- **Betroffene Dateien**:
  - `src/lib/TraekCanvas.svelte` (Rendering-Loop umbauen auf virtualisiert)
  - `src/lib/TraekNodeWrapper.svelte` (Placeholder-Mode)
  - `src/lib/TextNode.svelte` (Lazy Parsing)
  - Neue Dateien:
    - `src/lib/performance/ViewportTracker.svelte.ts`
    - `src/lib/performance/NodePool.svelte.ts`
- **Geschaetzter Aufwand**: Gross (1-2 Wochen)

---

### P2-3: Mobile & Touch Optimization

- **Prioritaet**: P1
- **Abhaengigkeiten**: QW-1 (Touch Targets) muss fertig sein (Basis). P2-2 (Performance) hilft, ist aber nicht blockierend.
- **Scope**:
  1. **Touch-Gesten**: Eigene GestureRecognizer-Klasse (kein Hammer.js). Ein-Finger-Drag (Pan), Zwei-Finger-Pinch (Zoom), Tap (Select), Double-Tap (Activate), Long-Press 500ms (Context-Menu).
  2. **Responsive Node-Breite**: Nodes max 90vw auf Mobile, min 280px auf Desktop.
  3. **Bottom-Sheet Input**: Auf Mobile (< 640px) wird das Input-Feld als Bottom-Sheet dargestellt, das ueber der Virtual Keyboard liegt.
  4. **Scroll-Hijacking-Prevention**: `touch-action: none` auf Canvas, `touch-action: auto` auf Node-Content (fuer internes Scrollen langer Nodes).
  5. **Breakpoints**: < 640px Mobile, 640-1024px Tablet, > 1024px Desktop.
- **Out of Scope**: Native App, Offline-Support, Haptic Feedback, Swipe-Gesten fuer Branch-Navigation
- **Akzeptanzkriterien**:
  - Pinch-to-Zoom fluessig auf iOS Safari und Android Chrome
  - Ein-Finger-Pan funktioniert ohne Seiten-Scroll
  - Tap-Selektion zuverlaessig (44x44px Targets)
  - Long-Press Context-Menu nach 500ms
  - Virtual Keyboard ueberlappt nicht mit Input
  - >= 30fps auf Mittelklasse-Smartphone
  - Keine Desktop-Regression
- **Betroffene Dateien**:
  - `src/lib/TraekCanvas.svelte` (Touch-Event-Handler, Responsive CSS)
  - `src/lib/TraekNodeWrapper.svelte` (Responsive Node-Breite)
  - Neue Dateien:
    - `src/lib/touch/GestureRecognizer.svelte.ts`
    - `src/lib/touch/MobileInput.svelte`
    - `src/lib/touch/breakpoints.ts`
- **Geschaetzter Aufwand**: Gross (1-2 Wochen)

---

## Phase 3: Erweiterungen (Backlog, priorisiert)

**Zeitrahmen:** Nach Phase 2
**Reihenfolge innerhalb Phase 3 ist flexibel, Abhaengigkeiten beachten**

---

### P3-1: Context Path Breadcrumb

- **Prioritaet**: P2
- **Abhaengigkeiten**: Keine
- **Scope**: Clickable Breadcrumb (Root > Parent > Active) oben links im Canvas. Klick auf Breadcrumb-Element fokussiert den Node. Responsive: auf Mobile nur "... > Parent > Active".
- **Out of Scope**: Breadcrumb-Persistenz, Custom Breadcrumb-Styles
- **Akzeptanzkriterien**: Breadcrumb erscheint bei aktivem Node, Klick navigiert, responsive
- **Betroffene Dateien**: `src/lib/TraekCanvas.svelte`, neue Datei `src/lib/ContextBreadcrumb.svelte`
- **Geschaetzter Aufwand**: Klein (1 Tag)

---

### P3-2: Node Ghost Preview

- **Prioritaet**: P2
- **Abhaengigkeiten**: Keine
- **Scope**: Faint dotted-border "Ghost" zeigt wo ein neuer Node erscheinen wird wenn Input fokussiert ist. Position = addNode() Logik.
- **Out of Scope**: Ghost fuer Branch-Nodes, animierter Ghost
- **Akzeptanzkriterien**: Ghost erscheint bei Input-Focus, verschwindet bei Blur, Position korrekt
- **Betroffene Dateien**: `src/lib/TraekCanvas.svelte`, `src/lib/Ghost.svelte` (existiert bereits)
- **Geschaetzter Aufwand**: Klein (1 Tag)

---

### P3-3: Keyboard Navigation Phase 2 (Chord-System, Quick-Jump)

- **Prioritaet**: P2
- **Abhaengigkeiten**: P1A-4 (Keyboard+ARIA) muss fertig sein
- **Scope**: Chord-System (`gg` = Root, `zz` = Center), Quick-Jump (`1`-`9` = n-ter Root-Thread), `f` = Fuzzy-Suche ueber Node-Content, Tooltip-Hints bei erstem Hover.
- **Out of Scope**: Custom Keybindings, Audio Feedback
- **Akzeptanzkriterien**: Chords funktionieren mit 500ms Timeout, Quick-Jump zu Root-Threads, Fuzzy-Suche oeffnet und navigiert
- **Betroffene Dateien**: `src/lib/keyboard/KeyboardNavigator.svelte.ts`, `src/lib/keyboard/KeyboardHelpOverlay.svelte`
- **Geschaetzter Aufwand**: Klein (2 Tage)

---

### P3-4: Tag-System & Filter

- **Prioritaet**: P2
- **Abhaengigkeiten**: P1B-1 (Search) muss fertig sein — Filter nutzt Search-Infrastruktur. P1A-1 (Persistence) muss fertig sein — Tags muessen gespeichert werden.
- **Scope**: Vordefinierte Tags (To-Do, Important, Question, Done, Draft) mit Farben. Rechtsklick/Long-Press "Add Tag". Filter-Bar oben: "Show only [Tag]" graut nicht-passende Nodes aus. Tags werden im Snapshot gespeichert (neues `tags: string[]` Feld auf Node).
- **Out of Scope**: Custom Tags (eigene erstellen), Smart Tags (AI-Vorschlaege), Tag-basierte Suche ueber mehrere Conversations
- **Akzeptanzkriterien**: Tags koennen hinzugefuegt/entfernt werden, Filter zeigt nur getaggte Nodes, Tags persistieren
- **Betroffene Dateien**: `src/lib/TraekEngine.svelte.ts`, `src/lib/TraekNodeWrapper.svelte`, `src/lib/persistence/types.ts`, neue Datei `src/lib/tags/TagFilter.svelte`
- **Geschaetzter Aufwand**: Mittel (3 Tage)

---

### P3-5: Replay-Modus UI

- **Prioritaet**: P2
- **Abhaengigkeiten**: P1A-1 (Persistence) — Replay braucht gespeicherte Snapshots
- **Scope**: Play/Pause, Scrubber, Speed-Control (0.5x-5x), Step-Forward/Back. Baut auf existierendem `ReplayController.svelte.ts` und `ReplayControls.svelte` auf. Streaming-Simulation fuer Assistant-Nodes.
- **Out of Scope**: Replay-Sharing, Replay-Export als Video
- **Akzeptanzkriterien**: Replay spielt Conversation chronologisch ab, Kamera folgt, Pause/Step/Speed funktionieren
- **Betroffene Dateien**: `src/lib/persistence/ReplayController.svelte.ts`, `src/lib/persistence/ReplayControls.svelte`, `src/lib/TraekCanvas.svelte`
- **Geschaetzter Aufwand**: Mittel (3 Tage)

---

## Gesamtplan-Uebersicht

| Phase | Paket | Prioritaet | Aufwand | Abhaengig von | Status |
|-------|-------|-----------|---------|---------------|--------|
| **-2** | ZOD-1: Zod Integration | P0 | 2-3d | - | ERLEDIGT |
| **-1** | DAG-1: Multi-Parent Graph | P0 | 1-2w | ZOD-1 | ERLEDIGT |
| **0** | QW-1: Touch Targets | P0 | 1h | DAG-1 | ERLEDIGT |
| **0** | QW-2: Multi-Line Input | P0 | 2h | - | ERLEDIGT |
| **0** | QW-3: Action Badges Visible | P0 | 2h | - | ERLEDIGT |
| **0** | QW-4: Connection Fading | P0 | 4h | - | ERLEDIGT |
| **0** | QW-5: Error Visibility | P0 | 4h | - | ERLEDIGT |
| **0** | QW-6: Empty State | P0 | 1h | - | ERLEDIGT |
| **1a** | P1A-1: Persistence Chat-Liste | P0 | 3-5d | - | |
| **1a** | P1A-2: Onboarding Tour | P0 | 3-4d | - | |
| **1a** | P1A-3: Subtree Collapse | P0 | 3d | - | |
| **1a** | P1A-4: Keyboard + ARIA | P0 | 1-2w | - | |
| **1b** | P1B-1: Smart Search | P0 | 3-5d | P1A-1, P1A-3 | |
| **1b** | P1B-2: Node Edit & Delete | P0 | 3-5d | P1A-3, P1A-4 | |
| **2** | P2-1: Branch-Vergleich | P1 | 4-5d | P1A-3 | |
| **2** | P2-2: Performance | P1 | 1-2w | - | |
| **2** | P2-3: Mobile & Touch | P1 | 1-2w | QW-1 | |
| **3** | P3-1: Context Breadcrumb | P2 | 1d | - | |
| **3** | P3-2: Node Ghost Preview | P2 | 1d | - | |
| **3** | P3-3: Keyboard Phase 2 | P2 | 2d | P1A-4 | |
| **3** | P3-4: Tags & Filter | P2 | 3d | P1B-1, P1A-1 | |
| **3** | P3-5: Replay UI | P2 | 3d | P1A-1 | |

---

## Referenz: Bestehende Spec-Dokumente

Jedes Arbeitspaket verweist auf bestehende Specs fuer technische Details:

- Persistence: `feature/conversation-persistence.md`
- Keyboard Navigation: `feature/keyboard-navigation.md` + `feature/keyboard-navigation-ux.md`
- Accessibility: `feature/accessibility.md`
- UX Improvements: `feature/ux-improvements.md`
- User Features: `feature/user-requested-features.md`
- Mobile/Touch: `feature/mobile-touch-support.md`
- Performance: `feature/performance-large-trees.md`
- Backlog: `backlog.md`

Diese Specs enthalten detaillierte technische Spezifikationen, Code-Beispiele und offene Fragen die waehrend der Implementierung geklaert werden muessen. Die ROADMAP-FINAL definiert WAS und WANN — die Specs definieren WIE.
