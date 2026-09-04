-- migrations/004_add_schedule_mode.sql · 双模式：日程模式字段
-- tauri 迁移每个版本只执行一次，ALTER ADD COLUMN 安全。
ALTER TABLE tasks ADD COLUMN scheduled_at TEXT;                             -- ISO 日期时间, NULL=纯进度
ALTER TABLE tasks ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0;   -- 0/1，需用户显式开启
ALTER TABLE tasks ADD COLUMN reminder_offset INTEGER NOT NULL DEFAULT 900;  -- 提前量（秒），默认 15min
ALTER TABLE tasks ADD COLUMN last_reminded_at TEXT;                         -- 冷却：上次提醒时间

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled
  ON tasks(scheduled_at)
  WHERE scheduled_at IS NOT NULL AND reminder_enabled = 1;
