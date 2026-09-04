import { describe, it, expect } from "vitest";
import { parseDateToken, parseQuickAdd } from "../src/lib/nlParse";
import { format, addDays } from "date-fns";

describe("nlParse - parseDateToken", () => {
  const base = new Date(2026, 8, 5); // 2026-09-05 (周六)

  it("parses relative days correctly", () => {
    expect(parseDateToken("今天", base)).toBe("2026-09-05");
    expect(parseDateToken("today", base)).toBe("2026-09-05");
    expect(parseDateToken("明天", base)).toBe("2026-09-06");
    expect(parseDateToken("tomorrow", base)).toBe("2026-09-06");
    expect(parseDateToken("后天", base)).toBe("2026-09-07");
    expect(parseDateToken("大后天", base)).toBe("2026-09-08");
    expect(parseDateToken("昨天", base)).toBe("2026-09-04");
  });

  it("parses standard ISO date token", () => {
    expect(parseDateToken("2026-10-01", base)).toBe("2026-10-01");
  });

  it("parses MM-DD format", () => {
    expect(parseDateToken("10月1日", base)).toBe("2026-10-01");
    expect(parseDateToken("10/1", base)).toBe("2026-10-01");
    expect(parseDateToken("10-1", base)).toBe("2026-10-01");
  });

  it("returns null for unknown tokens", () => {
    expect(parseDateToken("未知时间", base)).toBeNull();
  });
});

describe("nlParse - parseQuickAdd", () => {
  it("parses basic title", () => {
    const res = parseQuickAdd("买牛奶");
    expect(res.title).toBe("买牛奶");
    expect(res.priority).toBeNull();
    expect(res.tagNames).toEqual([]);
    expect(res.due).toBeNull();
    expect(res.scheduledAt).toBeNull();
  });

  it("parses priority and tags", () => {
    const res = parseQuickAdd("买牛奶 !p0 #生活 #购物");
    expect(res.title).toBe("买牛奶");
    expect(res.priority).toBe(0);
    expect(res.tagNames).toEqual(["生活", "购物"]);
  });

  it("parses named priorities like !urgent / !low", () => {
    expect(parseQuickAdd("紧急任务 !urgent").priority).toBe(0);
    expect(parseQuickAdd("普通任务 !mid").priority).toBe(2);
    expect(parseQuickAdd("低优任务 !low").priority).toBe(3);
  });

  it("parses schedule time and reminders", () => {
    const res = parseQuickAdd("团队站会 明天 下午3点 !remind15 #工作");
    expect(res.title).toBe("团队站会");
    expect(res.tagNames).toEqual(["工作"]);
    expect(res.due).toBe(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    expect(res.scheduledAt).toBe(
      `${format(addDays(new Date(), 1), "yyyy-MM-dd")}T15:00`
    );
    expect(res.reminderEnabled).toBe(true);
    expect(res.reminderOffset).toBe(900); // 15 * 60s
  });

  it("parses 24h colon format time", () => {
    const res = parseQuickAdd("提交报告 今天 14:30 !r30");
    expect(res.title).toBe("提交报告");
    expect(res.due).toBe(format(new Date(), "yyyy-MM-dd"));
    expect(res.scheduledAt).toBe(`${format(new Date(), "yyyy-MM-dd")}T14:30`);
    expect(res.reminderEnabled).toBe(true);
    expect(res.reminderOffset).toBe(1800); // 30 * 60s
  });
});
