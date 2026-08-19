import { getDb, withTransaction } from "./db";
import type { Item, ItemFilters, ItemInput, SortField, SortOrder, Tag } from "./types";

interface PagedItems {
  items: Item[];
  total: number;
}

const SORT_COLUMNS: Record<SortField, string> = {
  created_at: "created_at",
  updated_at: "updated_at",
  rating: "rating",
  title: "title",
};

export async function listItems(options: {
  filters?: ItemFilters;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}): Promise<PagedItems> {
  const db = await getDb();
  const filters = options.filters ?? {};
  const sortBy = options.sortBy ?? "updated_at";
  const sortOrder = options.sortOrder ?? "desc";
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;

  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    where.push("title LIKE ?");
    params.push(`%${filters.search}%`);
  }
  if (filters.category && filters.category !== "all") {
    where.push("category = ?");
    params.push(filters.category);
  }
  if (filters.status && filters.status !== "all") {
    where.push("status = ?");
    params.push(filters.status);
  }
  if (filters.ratingMin != null) {
    where.push("rating >= ?");
    params.push(filters.ratingMin);
  }
  if (filters.ratingMax != null) {
    where.push("rating <= ?");
    params.push(filters.ratingMax);
  }
  if (filters.hasLocalPath === "yes") {
    where.push("local_path IS NOT NULL AND local_path <> ''");
  }
  if (filters.hasLocalPath === "no") {
    where.push("(local_path IS NULL OR local_path = '')");
  }
  if (filters.tagIds?.length) {
    const tagIds = filters.tagIds;
    const placeholders = tagIds.map(() => "?").join(",");
    where.push(
      `id IN (SELECT item_id FROM item_tags WHERE tag_id IN (${placeholders}) GROUP BY item_id HAVING COUNT(DISTINCT tag_id) = ?)`
    );
    params.push(...tagIds, tagIds.length);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const direction = sortOrder === "asc" ? "ASC" : "DESC";
  const orderSql = `ORDER BY ${SORT_COLUMNS[sortBy]} ${direction}, id ${direction}`;

  const countRows = await db.select<Array<{ total: number }>>(
    `SELECT COUNT(*) AS total FROM items ${whereSql}`,
    params
  );
  const total = countRows[0]?.total ?? 0;

  const items = await db.select<Item[]>(
    `SELECT * FROM items ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );

  return { items, total };
}

export async function getItem(id: number): Promise<Item | null> {
  const db = await getDb();
  const rows = await db.select<Item[]>("SELECT * FROM items WHERE id = ?", [id]);
  return rows[0] ?? null;
}

export async function createItem(input: ItemInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO items (title, category, author, description, rating, review, status, cover_path, local_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.category,
      input.author,
      input.description,
      input.rating,
      input.review,
      input.status,
      input.cover_path,
      input.local_path,
    ]
  );
  return Number(result.lastInsertId);
}

export async function updateItem(id: number, input: ItemInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE items
     SET title = ?, category = ?, author = ?, description = ?, rating = ?, review = ?, status = ?, cover_path = ?, local_path = ?
     WHERE id = ?`,
    [
      input.title,
      input.category,
      input.author,
      input.description,
      input.rating,
      input.review,
      input.status,
      input.cover_path,
      input.local_path,
      id,
    ]
  );
}

export async function deleteItem(id: number): Promise<void> {
  await withTransaction(async (db) => {
    await db.execute("DELETE FROM images WHERE item_id = ?", [id]);
    await db.execute("DELETE FROM item_tags WHERE item_id = ?", [id]);
    await db.execute("DELETE FROM items WHERE id = ?", [id]);
  });
}

export async function setItemTags(itemId: number, tagIds: number[]): Promise<void> {
  await withTransaction(async (db) => {
    await db.execute("DELETE FROM item_tags WHERE item_id = ?", [itemId]);
    for (const tagId of tagIds) {
      await db.execute("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)", [itemId, tagId]);
    }
  });
}

export async function getItemTags(itemId: number): Promise<Tag[]> {
  const db = await getDb();
  return db.select<Tag[]>(
    `SELECT t.id, t.name, t.color
     FROM item_tags it
     JOIN tags t ON t.id = it.tag_id
     WHERE it.item_id = ?
     ORDER BY t.name COLLATE NOCASE`,
    [itemId]
  );
}

export async function getTagsForItems(itemIds: number[]): Promise<Record<number, Tag[]>> {
  if (!itemIds.length) return {};
  const db = await getDb();
  const placeholders = itemIds.map(() => "?").join(",");
  const rows = await db.select<Array<{ item_id: number; id: number; name: string; color: string | null }>>(
    `SELECT it.item_id, t.id, t.name, t.color
     FROM item_tags it
     JOIN tags t ON t.id = it.tag_id
     WHERE it.item_id IN (${placeholders})
     ORDER BY t.name COLLATE NOCASE`,
    itemIds
  );
  const result: Record<number, Tag[]> = {};
  for (const row of rows) {
    (result[row.item_id] ??= []).push({ id: row.id, name: row.name, color: row.color });
  }
  return result;
}

export async function countByCategory(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.select<Array<{ category: string; n: number }>>(
    "SELECT category, COUNT(*) AS n FROM items GROUP BY category"
  );
  const result: Record<string, number> = {};
  for (const row of rows) result[row.category] = row.n;
  return result;
}
