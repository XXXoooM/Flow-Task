import { describe, it, expect } from "vitest";
import { isInDnd, computeDueReminders } from "../src/lib/reminderEngine";
import type { Task } from "../src/types/task";

describe("reminderEngine - isInDnd", () => {
  it("returns false if dnd is disabled", () => {
    const d = new Date(2026, 8, 5, 23, 30);
    expect(isInDnd(d, false, 22 * 60, 8 * 60)).toBe(false);
  });

  it("handles standard daytime range", () => {
    const d1 = new Date(2026, 8, 5, 14, 0); // 14:00
    const d2 = new Date(2026, 8, 5, 18, 0); // 18:00
    expect(isInDnd(d1, true, 13 * 60, 15 * 60)).toBe(true);
    expect(isInDnd(d2, true, 13 * 60, 15 * 60)).toBe(false);
  });

  it("handles cross-midnight range (e.g., 22:00 to 07:00)", () => {
    const start = 22 * 60; // 22:00
    const end = 7 * 60; // 07:00

    const lateNight = new Date(2026, 8, 5, 23, 15); // 23:15
    const earlyMorning = new Date(2026, 8, 5, 6, 30); // 06:30
    const daytime = new Date(2026, 8, 5, 12, 0); // 12:00

    expect(isInDnd(lateNight, true, start, end)).toBe(true);
    expect(isInDnd(earlyMorning, true, start, end)).toBe(true);
    expect(isInDnd(daytime, true, start, end)).toBe(false);
  });
});

describe("reminderEngine - computeDueReminders", () => {
  const baseTask: Task = {
    id: "task-1",
    parent_id: null,
    title: "测试日程",
    note_md: "",
    completed: 0,
    priority: 1,
    due_date: "2026-09-05",
    sort_order: 0,
    view_type: "list",
    kanban_col: null,
    created_at: "2026-09-05T00:00:00.000Z",
    updated_at: "2026-09-05T00:00:00.000Z",
    completed_at: null,
    scheduled_at: "2026-09-05T15:00:00",
    reminder_enabled: 1,
    reminder_offset: 900, // 提前 15 分钟 (14:45 响)
    last_reminded_at: null,
    tags: [],
    recurrence: null,
    subtasks: [],
  };

  it("triggers reminder when now >= scheduled_at - offset", () => {
    // 14:45 时刻
    const fireTime = new Date(2026, 8, 5, 14, 45).getTime();
    const reminders = computeDueReminders([baseTask], fireTime, 300_000);
    expect(reminders.length).toBe(1);
    expect(reminders[0].task.id).toBe("task-1");
    expect(reminders[0].missed).toBe(false);
  });

  it("does not trigger before reminder time", () => {
    // 14:30 (早于 14:45)
    const earlyTime = new Date(2026, 8, 5, 14, 30).getTime();
    const reminders = computeDueReminders([baseTask], earlyTime, 300_000);
    expect(reminders.length).toBe(0);
  });

  it("respects cooldownMs when last_reminded_at is set", () => {
    const fireTime = new Date(2026, 8, 5, 14, 50).getTime();
    const taskWithReminded: Task = {
      ...baseTask,
      last_reminded_at: new Date(2026, 8, 5, 14, 48).toISOString(), // 2分钟前刚提醒过
    };
    // 冷却时间 5 分钟 (300,000ms)
    const reminders = computeDueReminders([taskWithReminded], fireTime, 300_000);
    expect(reminders.length).toBe(0);
  });

  it("flags as missed if current time is past scheduled_at", () => {
    // 15:05 (已过了 15:00)
    const pastTime = new Date(2026, 8, 5, 15, 5).getTime();
    const reminders = computeDueReminders([baseTask], pastTime, 300_000);
    expect(reminders.length).toBe(1);
    expect(reminders[0].missed).toBe(true);
  });

  it("ignores completed tasks or tasks with reminder disabled", () => {
    const pastTime = new Date(2026, 8, 5, 15, 5).getTime();
    const completedTask: Task = { ...baseTask, completed: 1 };
    const disabledTask: Task = { ...baseTask, reminder_enabled: 0 };

    expect(computeDueReminders([completedTask], pastTime, 300_000).length).toBe(0);
    expect(computeDueReminders([disabledTask], pastTime, 300_000).length).toBe(0);
  });
});
