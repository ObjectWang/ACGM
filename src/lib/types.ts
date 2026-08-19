export type Category = "anime" | "comic" | "game" | "other";
export type ItemStatus = "未开始" | "进行中" | "已完成" | "已弃坑";
export type LocalPathFilter = "all" | "yes" | "no";
export type SortField = "created_at" | "updated_at" | "rating" | "title";
export type SortOrder = "asc" | "desc";

export interface Item {
  id: number;
  title: string;
  category: Category;
  author: string | null;
  description: string | null;
  rating: number | null;
  review: string | null;
  status: ItemStatus;
  cover_path: string | null;
  local_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface ItemImage {
  id: number;
  item_id: number;
  file_path: string;
  thumb_path: string | null;
  sort_order: number;
  is_cover: number;
}

export interface ItemInput {
  title: string;
  category: Category;
  author: string | null;
  description: string | null;
  rating: number | null;
  review: string | null;
  status: ItemStatus;
  cover_path: string | null;
  local_path: string | null;
}

export interface ItemFilters {
  search?: string;
  category?: Category | "all";
  status?: ItemStatus | "all";
  tagIds?: number[];
  ratingMin?: number | null;
  ratingMax?: number | null;
  hasLocalPath?: LocalPathFilter;
}
