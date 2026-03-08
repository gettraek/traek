# UX-Spezifikation: Canvas Minimap (TRK-109)

**Status:** Entwurf
**Autor:** UX Expert
**Datum:** 2026-03-08
**Bezieht sich auf:** `packages/svelte/src/lib/canvas/Minimap.svelte`

---

## Ausgangslage

Ein grundlegendes `Minimap.svelte` existiert bereits mit: SVG-Übersicht aller Nodes, Viewport-Indikator, Click-to-Navigate, Drag-to-Pan und Expand/Collapse-Toggle. Die Implementierung hat eine solide Basis, aber drei Kernfeatures aus TRK-109 fehlen komplett, und es gibt mehrere Accessibility-Probleme, die behoben werden müssen.

---

## Fehlende Features (Must-Have)

### 1. Auto-Hide wenn Canvas in Viewport passt

**Verhalten:**
Die Minimap wird automatisch ausgeblendet, wenn der gesamte Canvas-Inhalt im Viewport sichtbar ist — d.h. wenn kein Scrollen/Panning nötig ist.

**Definition „passt in Viewport":**
Canvas passt, wenn der Viewport-Indikator-Rect die gesamte Minimap-Fläche abdeckt (≥ 95 % Überlappung in X und Y). Formel:

```
viewportW >= contentW * bounds.scale * 0.95
viewportH >= contentH * bounds.scale * 0.95
```

**Zustände:**

| Zustand | Minimap sichtbar? | Toggle sichtbar? |
|---|---|---|
| Canvas passt in Viewport | Nein (auto-hidden) | Nein |
| Canvas ist größer als Viewport | Ja (wenn expanded) | Ja |
| Nutzer hat manuell kollabiert | Nein | Ja |
| Nutzer hat manuell expandiert | Ja | Ja |

**Wichtig:** Auto-hide überschreibt niemals eine bewusste Nutzerentscheidung. Wenn ein Nutzer `isExpanded = true` setzt und dann der Canvas in den Viewport passt, soll die Minimap trotzdem sichtbar bleiben. Erst beim nächsten vollständigen Page-Reload soll das Auto-hide wieder greifen.

**Transition:**
Ein-/Ausblenden mit `opacity` + `scale` Transition (150ms, ease-out). Bei `prefers-reduced-motion`: sofortige Anzeige/Versteckung ohne Animation.

```
fade out: opacity 1→0, scale 1→0.95 (150ms)
fade in:  opacity 0→1, scale 0.95→1 (150ms)
```

---

### 2. Konfigurierbare Eckenpositionierung

**Prop:** `position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'` (Default: `'bottom-left'`)

**Alle vier Ecken:**

```
top-left:     top: 20px; left: 20px;
top-right:    top: 20px; right: 20px;
bottom-left:  bottom: 20px; left: 20px;  (current default)
bottom-right: bottom: 20px; right: 20px;
```

**Stacking-Reihenfolge:**
Der Toggle-Button soll immer nahe der Minimap-Karte sein — die Flex-Direction passt sich der Position an:

- `top-*`: Toggle unterhalb der Minimap (`flex-direction: column`, Toggle zuletzt)
- `bottom-*`: Toggle oberhalb der Minimap (`flex-direction: column-reverse`, Toggle zuerst)

**Kollision mit anderen Panels:**
Bei `bottom-left` existiert der Toggle bereits; wenn andere Panels (z.B. `ZoomControls`) dieselbe Ecke belegen, soll eine `offset`-Prop einen Pixelversatz ermöglichen (Standard: 0):

```typescript
offset?: { x?: number; y?: number }
// z.B. offset={{ y: 60 }} um 60px nach innen zu rücken
```

---

### 3. Node-Dichte-Heatmap für große Bäume

**Aktivierungsschwelle:**
Die Heatmap ersetzt die einzelnen Node-Rechtecke wenn `nodes.length > 50` (konfigurierbar via Prop `heatmapThreshold?: number`, Default: `50`).

**Visuelles Konzept:**
Die Minimap-Fläche wird in ein 10×10-Gitter unterteilt. Für jede Zelle wird die Anzahl der Nodes gezählt, die in diesen Bereich fallen. Die Zellen werden mit einer Farbskala eingefärbt:

- 0 Nodes: transparent
- 1–2 Nodes: `--traek-heatmap-low` (z.B. rgba(0, 216, 255, 0.15))
- 3–5 Nodes: `--traek-heatmap-mid` (z.B. rgba(0, 216, 255, 0.35))
- 6–10 Nodes: `--traek-heatmap-high` (z.B. rgba(0, 216, 255, 0.6))
- 11+ Nodes: `--traek-heatmap-peak` (z.B. rgba(0, 216, 255, 0.85))

**Implementierungsnotiz:**
Kein externes Bibliothek — reine SVG `<rect>`-Elemente für jede nicht-leere Zelle, mit `fill-opacity` gesteuert. Der Viewport-Indikator bleibt sichtbar (z-Index über Heatmap).

**Übergangsschwelle:**
Bei `nodes.length` nahe am Schwellenwert (45–50) soll kein ständiges Umschalten passieren. Ein Hysterese-Puffer von 5 Nodes: Heatmap aktiviert sich bei 50+, deaktiviert sich erst bei unter 45.

**CSS Custom Properties (neu hinzuzufügen):**

```css
--traek-heatmap-low:  rgba(0, 216, 255, 0.15)
--traek-heatmap-mid:  rgba(0, 216, 255, 0.35)
--traek-heatmap-high: rgba(0, 216, 255, 0.6)
--traek-heatmap-peak: rgba(0, 216, 255, 0.85)
```

---

## Accessibility-Probleme (Must-Fix)

Die bestehende Implementierung hat zwei mit `<!-- svelte-ignore a11y_* -->` unterdrückte Warnings, die echte Barrierefreiheitsprobleme darstellen.

### Problem 1: SVG ist nicht keyboard-navigierbar

**Aktuell:** Das SVG-Element hat `role="img"` — damit ist es ein statisches Bild für Screen Reader, aber keine interaktive Komponente.

**Lösung:** Das SVG erhält `role="application"` oder `role="group"` mit einem beschreibenden `aria-label`. Der Viewport-Indikator wird mit `tabindex="0"` versehen und akzeptiert Pfeiltasten-Navigation:

```
ArrowUp/Down/Left/Right: Bewegt den Viewport um 10% des Canvas
Shift + ArrowKeys: Bewegt den Viewport um 25% des Canvas
Home: Zentriert auf alle Nodes (fit-all)
```

**ARIA-Attribute für das SVG:**

```html
<svg
  role="application"
  aria-label="Minimap: Klicken oder Pfeiltasten zum Navigieren"
  aria-roledescription="Minimap-Navigation"
  tabindex="0"
>
```

### Problem 2: Click-Events ohne Key-Events

**Aktuell:** `onmousedown` und `onclick` ohne entsprechende `onkeydown`-Handler.

**Lösung:** Click-Navigation per Tastatur via `onkeydown` mit `Enter` und `Space` auf dem SVG. Zusätzlich Pfeiltasten für inkrementelles Panning.

### Problem 3: Toggle-Button Verbesserungen

**Aktuell:** Nur `title` und `aria-label` — kein sichtbares Label.

**Empfehlung:** Eine optionale Text-Badge neben dem Icon für Nutzende, die das +/- Icon nicht kennen:

```
[⊞]  (collapsed state – shows grid icon)
[⊟]  (expanded state – shows minimize icon)
```

Alternativ: Tooltip mit `role="tooltip"` statt nur `title`.

### Problem 4: Kein Touch-Support

**Aktuell:** Nur Mouse-Events (`onmousedown`, `onmousemove`).

**Lösung:** Touch-Events parallel hinzufügen:

```typescript
ontouchstart: (e) => { isDragging = true; handleTouchNav(e); }
ontouchmove: (e) => { if (isDragging) handleTouchNav(e); e.preventDefault(); }
ontouchend: () => { isDragging = false; }
```

Mit `{ passive: false }` für `ontouchmove` um `e.preventDefault()` zu erlauben.

---

## Erweiterte API-Spezifikation

### Props (vollständig)

```typescript
interface MinimapProps {
  viewport: ViewportManager;
  nodes: Node[];
  config: TraekEngineConfig;
  annotations?: Annotation[];

  // Neue Props
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  offset?: { x?: number; y?: number };
  heatmapThreshold?: number;  // Default: 50
  defaultExpanded?: boolean;   // Default: false
  disableAutoHide?: boolean;   // Default: false – wenn true, nie auto-hidden
}
```

### Minimap-Größe

Die hardcodierten `WIDTH=150, HEIGHT=100` sollen durch eine berechnete Größe ersetzt werden:

- **Default:** 160×110px
- **Bei mehr als 100 Nodes:** 200×140px (mehr Übersicht)
- **Bei Heatmap-Modus:** 200×160px (Gridstruktur braucht mehr Fläche)
- **Maximum:** 240×180px

Die Größe soll als Svelte `$derived` berechnet werden basierend auf `nodes.length` und dem aktiven Modus.

---

## Interaktionsfluss

```
Nutzer öffnet Canvas
  ↓
Canvas hat wenige Nodes und passt in Viewport
  → Minimap auto-hidden (kein Toggle sichtbar)

Canvas wächst / Nutzer zoomt herein
  → Canvas überschreitet Viewport-Größe
  → Toggle erscheint (fade-in, 150ms)
  → Minimap bleibt kollabiert (Nutzer öffnet bewusst)

Nutzer klickt Toggle
  → Minimap expandiert (slide-down + fade-in)
  → Viewport-Indikator aktualisiert sich reaktiv

Nutzer interagiert mit Minimap
  Option A: Klick auf Minimap-Stelle
    → Viewport springt zu dieser Position (animate: centerOnPoint)
  Option B: Drag über Minimap
    → Viewport folgt live dem Drag
  Option C: Pfeiltasten (wenn Minimap fokussiert)
    → Viewport bewegt sich um 10% des Canvas pro Tastendruck

Baum wächst auf 50+ Nodes
  → Einzelne Node-Rects werden durch Heatmap-Gitter ersetzt (300ms Crossfade)
  → Viewport-Indikator bleibt sichtbar über der Heatmap
```

---

## Visuelle Spezifikation

### Minimap-Karte

```
┌────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │  ← minimap-bg (node-bg, opacity 0.92)
│ ░░░ ■■ ■■ ■■ ░░░░░░░░░░░░░░░░░░   │  ← Nodes als farbige Rects
│ ░░░  ■■  ■■  ░░░░░░░░░░░░░░░░░░   │
│ ░░░░░┌──────────────┐░░░░░░░░░░   │  ← viewport-indicator (cyan Outline)
│ ░░░░░│              │░░░░░░░░░░   │
│ ░░░░░└──────────────┘░░░░░░░░░░   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
└────────────────────────────────────┘
  border: 1px solid --traek-node-border
  border-radius: 10px
  box-shadow: 0 8px 24px rgba(0,0,0,0.4)
  backdrop-filter: blur(4px)
```

### Heatmap-Modus (50+ Nodes)

```
┌────────────────────────────────────┐
│ ░░░▒▒▓▓██▓▓▒▒░░░░░░░░░░░░░░░░░░   │  ← Gitterzellen nach Dichte
│ ░░░▓▓████████▓▓░░░░░░░░░░░░░░░   │
│ ░░░▒▒▓▓██████▓▓░░░░░░░░░░░░░░░   │
│ ░░░░░┌──────────────┐░░░░░░░░░░   │  ← viewport-indicator bleibt
│ ░░░░░│   (oben)     │░░░░░░░░░░   │
│ ░░░░░└──────────────┘░░░░░░░░░░   │
└────────────────────────────────────┘
  Legende nicht nötig – Nutzer lernt die Dichte-Visualisierung intuitiv
```

### Toggle-Button

```
Kollabiert:  [⊞]  32×32px, icon-only mit title/tooltip
Expandiert:  [⊟]  32×32px, icon-only mit title/tooltip

Hover:       background: --traek-input-button-bg (cyan)
             color: --traek-input-button-text (schwarz)
Focus:       outline: 2px solid --traek-input-button-bg, offset: 2px
```

---

## Edge Cases

| Szenario | Verhalten |
|---|---|
| 0 Nodes (leerer Canvas) | Minimap nicht rendern (kein Toggle) |
| 1 Node im Viewport | Minimap auto-hidden, Toggle nicht sichtbar |
| Alle Nodes sind `thought`-Typ | Minimap nicht rendern (kein Toggle) |
| Nodes außerhalb Canvas-Grenzen (manualPosition) | Werden in Bounds-Berechnung eingeschlossen |
| Viewport sehr klein (< 400px breit) | Minimap-Größe auf 120×85px reduzieren |
| Sehr große Bäume (1000+ Nodes) | Heatmap-Modus, bounds-Berechnung geht nur über sichtbare Nodes (performance) |
| `disableAutoHide=true` | Toggle immer sichtbar, auch wenn Canvas passt |

---

## Was bereits funktioniert (nicht anfassen)

- Bounds-Berechnung für Node-Koordinaten (`$derived.by`)
- Annotations-Rendering (sticky, pin, marker)
- Viewport-Indikator-Berechnung
- Basic Click-to-Navigate Logik
- `--traek-*` CSS Custom Property Nutzung
- `focus-visible` Outline auf Toggle-Button

---

## Akzeptanzkriterien

- [ ] Canvas mit < 2 sichtbaren Nodes → Minimap auto-hidden, kein Toggle sichtbar
- [ ] Canvas wächst über Viewport → Toggle erscheint, Minimap kann expandiert werden
- [ ] Nutzer expandiert, dann schrumpft Canvas → Minimap bleibt sichtbar (kein Auto-collapse nach Nutzerinteraktion)
- [ ] `position="bottom-right"` → Minimap erscheint rechts unten, Toggle-Button korrekt positioniert
- [ ] `position="top-left"` → Minimap erscheint links oben, Toggle-Button unterhalb der Minimap
- [ ] Mit 60 Nodes → Heatmap-Gitter statt einzelne Rects
- [ ] Heatmap: Zellen mit mehr Nodes sind intensiver eingefärbt
- [ ] SVG ist keyboard-fokussierbar, Pfeiltasten bewegen Viewport
- [ ] Touch-Drag auf Minimap navigiert Canvas korrekt
- [ ] `prefers-reduced-motion: reduce` → keine Transitions
- [ ] Alle WCAG 2.1 AA Kriterien erfüllt (kein svelte-ignore für a11y-Warnings)

---

## Implementierungshinweise für Dev

1. **Kein externes State-Management** — alle neuen Props sind lokal in Minimap.svelte mit Svelte 5 Runes
2. **Heatmap-Algorithmus** — reine SVG `<rect>`-Elemente, kein Canvas-Element (konsistent mit bestehendem SVG-Ansatz)
3. **Touch-Events** — mit `{ passive: false }` Option registrieren für `touchmove` um `preventDefault()` zu ermöglichen
4. **Auto-hide** — als `$derived`-Boolean, nicht als separater `$effect`
5. **Position-Prop** — via CSS-Klassen umsetzen, nicht via inline styles (ermöglicht externe Überschreibung)
6. **Hysterese-Schwelle** — muss in einer lokalen Variable getrackt werden, nicht im `$derived`
