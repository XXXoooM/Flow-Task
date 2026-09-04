import { create } from "zustand";
import { db, newId } from "@/lib/db";
import { recordHistory } from "@/stores/historyStore";
import type { Tag } from "@/types/task";

interface TagState {
  tags: Tag[];
  loaded: boolean;
  loadTags: () => Promise<void>;
  createTag: (name: string, color?: string) => Promise<Tag>;
  renameTag: (id: string, name: string) => Promise<void>;
  setTagColor: (id: string, color: string) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

export const TAG_COLORS = [
  "#6366F1", // indigo
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#71717A", // zinc
];

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loaded: false,

  loadTags: async () => {
    const tags = await db.select<Tag[]>(
      "SELECT id, name, color FROM tags ORDER BY name COLLATE NOCASE"
    );
    set({ tags, loaded: true });
  },

  createTag: async (name, color = TAG_COLORS[0]) => {
    const trimmed = name.trim();
    const existing = await db.selectOne<Tag>(
      "SELECT id, name, color FROM tags WHERE name = $1",
      [trimmed]
    );
    if (existing) return existing;
    const tag: Tag = { id: newId(), name: trimmed, color };
    await recordHistory("新建标签", async () => {
      await db.execute("INSERT INTO tags (id, name, color) VALUES ($1, $2, $3)", [
        tag.id,
        tag.name,
        tag.color,
      ]);
      await get().loadTags();
    });
    return tag;
  },

  renameTag: async (id, name) => {
    await recordHistory("重命名标签", async () => {
      await db.execute("UPDATE tags SET name = $1 WHERE id = $2", [
        name.trim(),
        id,
      ]);
      await get().loadTags();
    });
  },

  setTagColor: async (id, color) => {
    await recordHistory("修改标签颜色", async () => {
      await db.execute("UPDATE tags SET color = $1 WHERE id = $2", [color, id]);
      await get().loadTags();
    });
  },

  deleteTag: async (id) => {
    await recordHistory("删除标签", async () => {
      await db.execute("DELETE FROM tags WHERE id = $1", [id]);
      await get().loadTags();
    });
  },
}));
