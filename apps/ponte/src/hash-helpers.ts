import { createHash } from "node:crypto";

export const sha256Hex = (s: string): string =>
  createHash("sha256").update(s).digest("hex");

export const shortHash = (hash: string): string =>
  hash.length <= 12 ? hash : hash.slice(0, 12);

// firstPathSegment returns the hash segment under the store from an absolute
// store path, or null when the path is not inside the store.
export function hashFromStorePath(storeDir: string, target: string): string | null {
  const sep = process.platform === "win32" ? "\\" : "/";
  const prefix = storeDir.endsWith(sep) ? storeDir : storeDir + sep;
  if (!target.startsWith(prefix)) return null;
  const rest = target.slice(prefix.length);
  const hash = rest.includes("/") ? rest.split("/")[0] : rest.split("\\")[0];
  if (hash === "" || hash === "." || hash === "..") return null;
  return hash;
}