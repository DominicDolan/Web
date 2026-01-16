-- 1. Themes: The high-level container for a set of colors
CREATE TABLE IF NOT EXISTS themes (
                                      theme_id TEXT PRIMARY KEY,       -- e.g., 'my-dark-theme'
                                      name TEXT NOT NULL,              -- e.g., 'Dark Forest'
                                      created_at INTEGER NOT NULL
);

-- 2. Color Events: The source of truth (Immutable History)
-- We track every delta/change here.
CREATE TABLE IF NOT EXISTS color_events (
                                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                                            theme_id TEXT NOT NULL,
                                            color_id TEXT NOT NULL,          -- e.g., 'primary-bg'
                                            event_type TEXT NOT NULL,        -- 'CREATED', 'UPDATED', 'DELETED'

    -- Store name, hex, and alpha as a JSON string
    -- Example: '{"name":"Primary","hex":"#ff0000","alpha":1}'
                                            payload TEXT NOT NULL,

                                            timestamp INTEGER NOT NULL,
                                            FOREIGN KEY (theme_id) REFERENCES themes(theme_id)
    );

-- 3. Theme Snapshots: The "Squashed" State (Current View)
-- This allows you to load the theme without replaying hundreds of events.
CREATE TABLE IF NOT EXISTS theme_snapshots (
                                               theme_id TEXT PRIMARY KEY,

    -- A complete JSON object containing all current color values
    -- Example: '{"primary-bg": {"hex": "#121212", "alpha": 1}, "text": {...}}'
                                               full_state_json TEXT NOT NULL,

                                               last_event_id INTEGER NOT NULL,  -- Keep track of how "up to date" this is
                                               updated_at INTEGER NOT NULL,
                                               FOREIGN KEY (theme_id) REFERENCES themes(theme_id)
    );

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_events_theme ON color_events(theme_id);
