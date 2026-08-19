import { getDb, withTransaction } from "./db";
import type { ItemImage } from "./types";

export async function listImages(itemId: number): Promise<ItemImage[]> {
  const db = await getDb();
  return db.select<ItemImage[]>(
    "SELECT * FROM images WHERE item_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC",
    [itemId]
  );
}

export async function addImage(
  itemId: number,
  filePath: string,
  thumbPath: string,
  isCover: boolean
): Promise<number> {
  return withTransaction(async (db) => {
    if (isCover) {
      await db.execute("UPDATE images SET is_cover = 0 WHERE item_id = ?", [itemId]);
    }
    const rows = await db.select<Array<{ m: number }>>(
      "SELECT COALESCE(MAX(sort_order), 0) AS m FROM images WHERE item_id = ?",
      [itemId]
    );
    const sortOrder = (rows[0]?.m ?? 0) + 1;
    const result = await db.execute(
      "INSERT INTO images (item_id, file_path, thumb_path, sort_order, is_cover) VALUES (?, ?, ?, ?, ?)",
      [itemId, filePath, thumbPath, sortOrder, isCover ? 1 : 0]
    );
    return Number(result.lastInsertId);
  });
}

export async function setCover(itemId: number, imageId: number): Promise<void> {
  await withTransaction(async (db) => {
    await db.execute("UPDATE images SET is_cover = 0 WHERE item_id = ?", [itemId]);
    await db.execute("UPDATE images SET is_cover = 1 WHERE id = ? AND item_id = ?", [imageId, itemId]);
  });
}

export async function deleteImage(id: number): Promise<ItemImage | null> {
  const db = await getDb();
  const rows = await db.select<ItemImage[]>("SELECT * FROM images WHERE id = ?", [id]);
  const image = rows[0] ?? null;
  if (image) {
    await db.execute("DELETE FROM images WHERE id = ?", [id]);
  }
  return image;
}
