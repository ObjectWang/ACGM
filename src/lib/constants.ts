import type { Category, ItemStatus } from "./types";

export const CATEGORY_OPTIONS: Array<{ value: Category; label: string; color: string }> = [
  { value: "anime", label: "动画", color: "#409EFF" },
  { value: "comic", label: "漫画", color: "#67C23A" },
  { value: "game", label: "游戏", color: "#A855F7" },
  { value: "other", label: "其它", color: "#909399" },
];

export const STATUS_OPTIONS: ItemStatus[] = ["未开始", "进行中", "已完成", "已弃坑"];

export function categoryLabel(category: Category): string {
  return CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? category;
}

export function categoryColor(category: Category): string {
  return CATEGORY_OPTIONS.find((item) => item.value === category)?.color ?? "#909399";
}
