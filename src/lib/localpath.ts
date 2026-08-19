import { open } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { pathExists } from "./api";

/** Open a native picker to select a file. Returns the absolute path or null. */
export async function pickFilePath(): Promise<string | null> {
  const result = await open({ multiple: false, directory: false });
  if (!result || typeof result !== "string") return null;
  return result;
}

/** Open a native picker to select a folder. Returns the absolute path or null. */
export async function pickFolderPath(): Promise<string | null> {
  const result = await open({ multiple: false, directory: true });
  if (!result || typeof result !== "string") return null;
  return result;
}

/** Check whether a local path currently exists on disk. */
export async function checkPath(path: string): Promise<boolean> {
  if (!path.trim()) return false;
  try {
    return await pathExists(path);
  } catch {
    return false;
  }
}

/**
 * Open a local path with the system default handler.
 * Files → opened with default program; folders → opened in file manager.
 * Throws if the path does not exist.
 */
export async function openLocalPath(path: string): Promise<void> {
  const exists = await checkPath(path);
  if (!exists) {
    throw new Error("路径不存在");
  }
 await openPath(path);
}
