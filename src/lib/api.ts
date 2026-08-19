import { invoke } from "@tauri-apps/api/core";

export interface ImportImageResult {
  file_path: string;
  thumb_path: string;
}

export function getDataDir(): Promise<string> {
  return invoke<string>("get_data_dir");
}

export function getDbUrl(): Promise<string> {
  return invoke<string>("get_db_url");
}

export function pathExists(path: string): Promise<boolean> {
  return invoke<boolean>("path_exists", { path });
}

export function importImage(itemId: number, sourcePath: string, isCover: boolean): Promise<ImportImageResult> {
  return invoke<ImportImageResult>("import_image", { itemId, sourcePath, isCover });
}

export function deleteItemImages(itemId: number): Promise<void> {
  return invoke<void>("delete_item_images", { itemId });
}

export function deleteImageFile(relPath: string): Promise<void> {
  return invoke<void>("delete_image_file", { relPath });
}
