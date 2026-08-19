import { getDb, withTransaction } from "./db";
import type { Tag } from "./types";

export async function listTags(): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>("SELECT * FROM tags ORDER BY name COLLATE NOCASE");
}

export async function createTag(name: string, color: string | null): Promise<number> {
  const db = await getDb();
  const result = await db.execute("INSERT INTO tags (name, color) VALUES (?, ?)", [name, color]);
  return Number(result.lastInsertId);
}

export async function updateTag(id: number, name: string, color: string | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE tags SET name = ?, color = ? WHERE id = ?", [name, color, id]);
}

export async function deleteTag(id: number): Promise<void> {
  await withTransaction(async (db) => {
    await db.execute("DELETE FROM item_tags WHERE tag_id = ?", [id]);
    await db.execute("DELETE FROM tags WHERE id = ?", [id]);
  });
}

/** Count how many items use each tag. Returns a map of tagId → count. */
export async function countTagUsage(): Promise<Record<number, number>> {
  const db = await getDb();
  const rows = await db.select<Array<{ tag_id: number; n: number }>>(
    "SELECT tag_id, COUNT(*) AS n FROM item_tags GROUP BY tag_id"
  );
  const result: Record<number, number> = {};
  for (const row of rows) result[row.tag_id] = row.n;
  return result;
}
