import { getDb, withTransaction } from "./db";
import type { ItemImage } from "./types";
import { importImage, deleteImageFile } from "./api";
import { updateCoverPath } from "./items";

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

/** Upload a cover image: copy file → generate thumbnail → add DB row → sync items.cover_path. */
export async function uploadCoverImage(itemId: number, sourcePath: string): Promise<ItemImage> {
  const result = await importImage(itemId, sourcePath, true);
  const imageId = await addImage(itemId, result.file_path, result.thumb_path, true);
  await updateCoverPath(itemId, result.file_path);
  return {
    id: imageId,
    item_id: itemId,
    file_path: result.file_path,
    thumb_path: result.thumb_path,
    sort_order: 0,
    is_cover: 1,
  };
}

/** Upload a screenshot: copy file → generate thumbnail → add DB row. */
export async function uploadScreenshot(itemId: number, sourcePath: string): Promise<ItemImage> {
  const result = await importImage(itemId, sourcePath, false);
  const imageId = await addImage(itemId, result.file_path, result.thumb_path, false);
  return {
    id: imageId,
    item_id: itemId,
    file_path: result.file_path,
    thumb_path: result.thumb_path,
    sort_order: 0,
    is_cover: 0,
  };
}

/** Set an existing image as the cover and sync items.cover_path. */
export async function setCoverImage(itemId: number, imageId: number, filePath: string): Promise<void> {
  await setCover(itemId, imageId);
  await updateCoverPath(itemId, filePath);
}

/** Delete an image: remove DB row + physical files, and clear cover_path if it was the cover. */
export async function deleteImageComplete(itemId: number, imageId: number): Promise<void> {
  const image = await deleteImage(imageId);
  if (!image) return;
  await deleteImageFile(image.file_path);
  if (image.thumb_path) {
    await deleteImageFile(image.thumb_path);
  }
  if (image.is_cover) {
    await updateCoverPath(itemId, null);
  }
}
