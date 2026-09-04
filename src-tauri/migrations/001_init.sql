-- migrations/001_init.sql  ·  FlowTask 基础表
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    parent_id    TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    note_md      TEXT NOT NULL DEFAULT '',
    completed    INTEGER NOT NULL DEFAULT 0,
    priority     INTEGER NOT NULL DEFAULT 3,          -- 0 紧急 / 1 高 / 2 中 / 3 低
    due_date     TEXT,                                 -- ISO 8601 或 null
    sort_order   REAL NOT NULL DEFAULT 0,
    view_type    TEXT NOT NULL DEFAULT 'list',         -- list | kanban | calendar
    kanban_col   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_parent    ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due       ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_sort      ON tasks(sort_order);

CREATE TABLE IF NOT EXISTS tags (
    id    TEXT PRIMARY KEY,
    name  TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366F1'
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);
