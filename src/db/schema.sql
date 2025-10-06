-- src/db/schema.sql

-- Table to store subscribed users
CREATE TABLE IF NOT EXISTS users (
  chat_id INTEGER PRIMARY KEY,
  username TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Table to store the pool of object IDs
CREATE TABLE IF NOT EXISTS objects (
  id TEXT PRIMARY KEY,
  checked BOOLEAN NOT NULL DEFAULT 0
);