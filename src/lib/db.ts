import Database from "@tauri-apps/plugin-sql";

// DB_URL is set dynamically after getDataDir() returns the exe directory path.
// tauri-plugin-sql resolves "sqlite:<path>" relative to the app data dir,
// but we store data next to the exe. We build the full path at runtime.
let DB_URL = "sqlite:acgm.db";

let dbPromise: Promise<Database> | null = null;

export function setDbUrl(url: string): void {
  DB_URL = url;
  // Reset so next getDb() uses the new URL.
  dbPromise = null;
}

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
