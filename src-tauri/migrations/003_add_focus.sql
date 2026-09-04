-- migrations/003_add_focus.sql · 专注统计
CREATE TABLE IF NOT EXISTS focus_sessions (
    id          TEXT PRIMARY KEY,
    task_id     TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    duration_s  INTEGER NOT NULL DEFAULT 0,
    completed   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_focus_started ON focus_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_focus_task    ON focus_sessions(task_id);
