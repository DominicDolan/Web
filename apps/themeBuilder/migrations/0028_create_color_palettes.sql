CREATE TABLE IF NOT EXISTS "color_palettes" (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                source TEXT NOT NULL,
                                                group_name TEXT NOT NULL,
                                                color_name TEXT NOT NULL,
                                                shade TEXT,
                                                color_key TEXT NOT NULL,
                                                hex_value TEXT NOT NULL,
                                                redness INTEGER NOT NULL,
                                                greenness INTEGER NOT NULL,
                                                blueness INTEGER NOT NULL,
                                                lightness REAL NOT NULL,
                                                created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    CHECK ("redness" >= 0 AND "redness" <= 255),
    CHECK ("greenness" >= 0 AND "greenness" <= 255),
    CHECK ("blueness" >= 0 AND "blueness" <= 255),
    CHECK ("lightness" >= 0 AND "lightness" <= 1)
    );

CREATE UNIQUE INDEX IF NOT EXISTS "color_palettes_source_color_key_uq"
    ON "color_palettes" ("source", "color_key");

CREATE INDEX IF NOT EXISTS "color_palettes_source_group_name_idx"
    ON "color_palettes" ("source", "group_name");

CREATE INDEX IF NOT EXISTS "color_palettes_source_shade_idx"
    ON "color_palettes" ("source", "shade");

CREATE INDEX IF NOT EXISTS "color_palettes_lightness_idx"
    ON "color_palettes" ("lightness");
