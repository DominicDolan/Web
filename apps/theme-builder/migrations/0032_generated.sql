-- Generated migration file. Do not edit by hand.
-- Generated at: 2026-07-10T14:22:42.055Z
-- Source directory: src/models

-- Source: src/models/ColorTokenDefinition.ts
DROP TABLE IF EXISTS "color_events";
CREATE TABLE IF NOT EXISTS "color_events" (
  event_id TEXT NOT NULL PRIMARY KEY,
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "color_events_id_idx_1" ON "color_events" ("id");
CREATE INDEX IF NOT EXISTS "color_events_timestamp_idx_2" ON "color_events" ("timestamp");

-- Source: src/models/ElementStyleDefinition.ts
DROP TABLE IF EXISTS "element_style_events";
CREATE TABLE IF NOT EXISTS "element_style_events" (
  event_id TEXT NOT NULL PRIMARY KEY,
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "element_style_events_id_idx_1" ON "element_style_events" ("id");
CREATE INDEX IF NOT EXISTS "element_style_events_timestamp_idx_2" ON "element_style_events" ("timestamp");

-- Source: src/models/ElementVariantDefinition.ts
DROP TABLE IF EXISTS "element_variant_events";
CREATE TABLE IF NOT EXISTS "element_variant_events" (
  event_id TEXT NOT NULL PRIMARY KEY,
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "element_variant_events_id_idx_1" ON "element_variant_events" ("id");
CREATE INDEX IF NOT EXISTS "element_variant_events_timestamp_idx_2" ON "element_variant_events" ("timestamp");

-- Source: src/models/ThemeDefinition.ts
DROP TABLE IF EXISTS "theme_events";
CREATE TABLE IF NOT EXISTS "theme_events" (
  event_id TEXT NOT NULL PRIMARY KEY,
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "theme_events_id_idx_1" ON "theme_events" ("id");
CREATE INDEX IF NOT EXISTS "theme_events_timestamp_idx_2" ON "theme_events" ("timestamp");

-- Source: src/models/TypefaceDefinition.ts
DROP TABLE IF EXISTS "typeface_events";
CREATE TABLE IF NOT EXISTS "typeface_events" (
  event_id TEXT NOT NULL PRIMARY KEY,
  id TEXT NOT NULL,
  path TEXT NOT NULL,
  value TEXT,
  timestamp INTEGER NOT NULL,
  "theme" TEXT
);
CREATE INDEX IF NOT EXISTS "typeface_events_id_idx_1" ON "typeface_events" ("id");
CREATE INDEX IF NOT EXISTS "typeface_events_timestamp_idx_2" ON "typeface_events" ("timestamp");
