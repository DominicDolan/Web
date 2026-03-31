-- Generated migration file. Do not edit by hand.
-- Generated at: 2026-03-30T23:43:44.860Z
-- Source directory: apps/themeBuilder/src/models

-- Source: apps/themeBuilder/src/models/ColorDefinition.ts
DROP TABLE IF EXISTS "color_events";
CREATE TABLE IF NOT EXISTS "color_events" (
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "color_events_id_idx_1" ON "color_events" ("id");
CREATE INDEX IF NOT EXISTS "color_events_timestamp_idx_2" ON "color_events" ("timestamp");

-- Source: apps/themeBuilder/src/models/ElementStyleDefinition.ts
DROP TABLE IF EXISTS "element_style_events";
CREATE TABLE IF NOT EXISTS "element_style_events" (
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "element_style_events_id_idx_1" ON "element_style_events" ("id");
CREATE INDEX IF NOT EXISTS "element_style_events_timestamp_idx_2" ON "element_style_events" ("timestamp");

-- Source: apps/themeBuilder/src/models/ThemeDefinition.ts
DROP TABLE IF EXISTS "theme_events";
CREATE TABLE IF NOT EXISTS "theme_events" (
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "theme_events_id_idx_1" ON "theme_events" ("id");
CREATE INDEX IF NOT EXISTS "theme_events_timestamp_idx_2" ON "theme_events" ("timestamp");
