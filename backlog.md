# Backlog

Features die langfristig interessant sind, aber aktuell nicht priorisiert werden.

---

## Node Collaboration / Multi-User

Mehrere Nutzer auf demselben Canvas mit Echtzeit-Cursors (Figma-Style). Passt zum Spatial-Ansatz.

### Scope

- Cursor-Presence (wer ist wo auf dem Canvas)
- Gleichzeitiges Editieren / Forking von Branches
- Conflict Resolution bei gleichzeitigem Node-Move
- User-Avatare an Cursor und aktiven Nodes

### Voraussetzungen

- WebSocket- oder CRDT-basierte Sync-Schicht
- Server-Komponente für Session-Management
- Conversation Persistence (als Grundlage für shared state)

### Offene Fragen

- CRDT vs. OT vs. einfacher Last-Write-Wins?
- Hosting: self-hosted only oder auch Cloud?
- Granularität: Canvas-Level oder Node-Level Locking?
