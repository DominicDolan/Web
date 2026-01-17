-- Generated migration file. Do not edit by hand.
-- Generated at: 2025-12-22T00:48:13.596Z
-- Source directory: src/schema

-- Source: src/schema/ColorDefinitionSql.ts
CREATE TABLE IF NOT EXISTS "color_events" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  group_by_id INTEGER NOT NULL,
  theme_id TEXT NOT NULL,
  FOREIGN KEY ("theme_id") REFERENCES "themes"("them_id")
);
CREATE INDEX IF NOT EXISTS "color_events_timestamp_idx_1" ON "color_events" ("timestamp");
CREATE INDEX IF NOT EXISTS "color_events_theme_id_idx_2" ON "color_events" ("theme_id");
