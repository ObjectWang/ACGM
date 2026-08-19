import { convertFileSrc } from "@tauri-apps/api/core";
import { getDataDir } from "./api";

let dataDir = "";

export async function initDataDir(): Promise<string> {
  dataDir = await getDataDir();
  return dataDir;
}

export function assetUrl(relPath: string | null): string {
  if (!relPath || !dataDir) return "";
  const sep = dataDir.endsWith("/") || dataDir.endsWith("\\") ? "" : "/";
  return convertFileSrc(`${dataDir}${sep}${relPath}`);
}
