-- Generated migration file. Do not edit by hand.
-- Generated at: 2026-01-17T08:30:46.656Z
-- Source directory: src/models

-- Source: src/models/ColorDefinition.ts
DROP TABLE IF EXISTS "color_events";
CREATE TABLE IF NOT EXISTS "color_events" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "color_events_timestamp_idx_1" ON "color_events" ("timestamp");

-- Source: src/models/ThemeDefinition.ts
DROP TABLE IF EXISTS "theme_events";
CREATE TABLE IF NOT EXISTS "theme_events" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "theme_events_timestamp_idx_1" ON "theme_events" ("timestamp");
