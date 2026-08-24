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

function parseToRgba(value: string): [number, number, number, number] | null {
  const str = value.trim().toLowerCase();
  const hexMatch = str.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = [...hex].map((ch) => parseInt(ch + ch, 16));
      const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      return [r, g, b, a];
    }
    if (hex.length === 6 || hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      ];
    }
    return null;
  }
  const rgbMatch = str.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return [parts[0], parts[1], parts[2], parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1];
    }
  }
  return null;
}

export function tagTextColor(color: string | null | undefined): string {
  const rgba = color ? parseToRgba(color) : null;
  if (!rgba) return "#fff";
  const [r0, g0, b0, a] = rgba;
  const blend = (c: number) => Math.round(c * a + 255 * (1 - a));
  const luminance = 0.2126 * blend(r0) + 0.7152 * blend(g0) + 0.0722 * blend(b0);
  return luminance > 186 ? "#303133" : "#fff";
}
