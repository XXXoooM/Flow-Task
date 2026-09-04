import Database from "@tauri-apps/plugin-sql";
import { useStatusStore } from "@/stores/statusStore";

const DB_URL = "sqlite:flowtask.db";

let dbPromise: Promise<Database> | null = null;

/** 惰性单例：首次调用时加载 SQLite 连接（Rust 端 migrations 会随之执行建表）。 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).catch((err) => {
      // 允许下次重试，避免把失败的 Promise 缓存下来。
      dbPromise = null;
      useStatusStore.getState().fail(String(err), true);
      throw err;
    });
  }
  return dbPromise;
}

export const db = {
  /** T 为行类型数组（如 TaskRow[]）。 */
  async select<T>(sql: string, bind?: unknown[]): Promise<T> {
    const conn = await getDb();
    return conn.select<T>(sql, bind);
  },
  async selectOne<T>(sql: string, bind?: unknown[]): Promise<T | null> {
    const rows = await (await getDb()).select<T[]>(sql, bind);
    return rows[0] ?? null;
  },
  async execute(sql: string, bind?: unknown[]) {
    const conn = await getDb();
    return conn.execute(sql, bind);
  },
};

/** 短随机 ID（避免引入额外依赖）。 */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
