-- migrations/002_add_recurrence.sql · 重复任务规则
CREATE TABLE IF NOT EXISTS recurrences (
    id         TEXT PRIMARY KEY,
    task_id    TEXT NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    freq       TEXT NOT NULL,                       -- daily | weekly | monthly
    interval   INTEGER NOT NULL DEFAULT 1,          -- 每 N 天/周/月
    weekdays   TEXT,                                -- 预留：JSON [1,3,5]
    end_date   TEXT,                                -- 重复截止日（可空=永不）
    max_count  INTEGER                              -- 预留：最多次数
);

CREATE INDEX IF NOT EXISTS idx_recurrences_task ON recurrences(task_id);
