import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:acgm.db";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<Array<{ n: number }>>(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('items', 'tags', 'item_tags', 'images')"
  );
  return rows[0]?.n ?? 0;
}

export async function withTransaction<T>(fn: (db: Database) => Promise<T>): Promise<T> {
  const db = await getDb();
  await db.execute("BEGIN IMMEDIATE");
  try {
    const result = await fn(db);
    await db.execute("COMMIT");
    return result;
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}
