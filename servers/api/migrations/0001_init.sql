-- Træk Cloud Persistence API — D1 Schema
-- Migration: 0001_init

-- API keys table. Stores hashed keys mapped to a workspace.
-- The raw key is shown once at creation and never stored.
CREATE TABLE IF NOT EXISTS api_keys (
	id         TEXT PRIMARY KEY,               -- random UUID
	key_hash   TEXT NOT NULL UNIQUE,           -- SHA-256 hex of raw key
	workspace_id TEXT NOT NULL,               -- logical tenant identifier
	label      TEXT NOT NULL DEFAULT '',       -- human-readable name
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	last_used_at TEXT
);

-- Conversations table. One row per saved conversation.
CREATE TABLE IF NOT EXISTS conversations (
	id           TEXT PRIMARY KEY,             -- client-supplied UUID
	workspace_id TEXT NOT NULL,
	title        TEXT NOT NULL DEFAULT '',
	snapshot     TEXT NOT NULL,               -- JSON blob (ConversationSnapshot)
	tags         TEXT NOT NULL DEFAULT '[]',  -- JSON array of strings
	meta         TEXT NOT NULL DEFAULT '{}',  -- JSON object
	created_at   TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for tenant isolation + time-based sorting
CREATE INDEX IF NOT EXISTS idx_conv_workspace_updated
	ON conversations (workspace_id, updated_at DESC);

-- Index for tag filtering (JSON each() needed at query time)
CREATE INDEX IF NOT EXISTS idx_conv_workspace_created
	ON conversations (workspace_id, created_at DESC);

-- Full-text search virtual table for title + snapshot text
CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts
	USING fts5(
		id UNINDEXED,
		workspace_id UNINDEXED,
		title,
		content=conversations,
		content_rowid=rowid
	);

-- Keep FTS in sync with the main table
CREATE TRIGGER IF NOT EXISTS conv_ai AFTER INSERT ON conversations BEGIN
	INSERT INTO conversations_fts (rowid, id, workspace_id, title)
		VALUES (new.rowid, new.id, new.workspace_id, new.title);
END;

CREATE TRIGGER IF NOT EXISTS conv_au AFTER UPDATE ON conversations BEGIN
	INSERT INTO conversations_fts (conversations_fts, rowid, id, workspace_id, title)
		VALUES ('delete', old.rowid, old.id, old.workspace_id, old.title);
	INSERT INTO conversations_fts (rowid, id, workspace_id, title)
		VALUES (new.rowid, new.id, new.workspace_id, new.title);
END;

CREATE TRIGGER IF NOT EXISTS conv_ad AFTER DELETE ON conversations BEGIN
	INSERT INTO conversations_fts (conversations_fts, rowid, id, workspace_id, title)
		VALUES ('delete', old.rowid, old.id, old.workspace_id, old.title);
END;
