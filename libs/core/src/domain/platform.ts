import { join } from "node:path";

export type Platform = "posix" | "win32";

export const WINDOWS_CONFIG_ROOT = join("AppData", "Roaming");
