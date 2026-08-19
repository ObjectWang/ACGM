-- ACGM 初始数据库结构
-- 由 tauri-plugin-sql 在首次连接数据库时自动执行

PRAGMA foreign_keys = ON;

-- 条目表
CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  category    TEXT    NOT NULL CHECK (category IN ('anime', 'comic', 'game', 'other')),
  author      TEXT,
  description TEXT,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  review      TEXT,
  status      TEXT    NOT NULL DEFAULT '未开始' CHECK (status IN ('未开始', '进行中', '已完成', '已弃坑')),
  cover_path  TEXT,
  local_path  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items (category);
CREATE INDEX IF NOT EXISTS idx_items_status   ON items (status);
CREATE INDEX IF NOT EXISTS idx_items_rating   ON items (rating);
CREATE INDEX IF NOT EXISTS idx_items_title    ON items (title);

-- 更新条目时自动刷新 updated_at
CREATE TRIGGER IF NOT EXISTS trg_items_updated_at
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
  UPDATE items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- 标签表
CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT    NOT NULL UNIQUE,
  color TEXT
);

-- 条目-标签关联表（多对多）
CREATE TABLE IF NOT EXISTS item_tags (
  item_id INTEGER NOT NULL,
  tag_id  INTEGER NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)  REFERENCES tags  (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags (tag_id);

-- 图片表（封面 + 截图）
CREATE TABLE IF NOT EXISTS images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id    INTEGER NOT NULL,
  file_path  TEXT    NOT NULL,
  thumb_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover   INTEGER NOT NULL DEFAULT 0 CHECK (is_cover IN (0, 1)),
  FOREIGN KEY (item_id) REFERENCES items (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_item_id ON images (item_id);
