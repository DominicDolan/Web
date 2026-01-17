-- Generated migration file. Do not edit by hand.
-- Generated at: 2025-12-22T00:59:05.917Z
-- Source directory: src/schema

-- Source: src/schema/ColorDefinitionSql.ts
DROP TABLE IF EXISTS "color_events";
CREATE TABLE IF NOT EXISTS "color_events" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  group_by_id INTEGER NOT NULL,
  FOREIGN KEY ("group_by_id") REFERENCES "themes"("theme_id")
);
CREATE INDEX IF NOT EXISTS "color_events_timestamp_group_by_id_idx_1" ON "color_events" ("timestamp", "group_by_id");
