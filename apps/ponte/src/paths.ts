import { join } from "node:path";

export function homeDirectory(): string {
  const home = Bun.env.HOME ?? process.env.USERPROFILE;
  if (!home) throw new Error("cannot determine the home directory; set HOME");
  return home;
}

export const configDirectoryPath = () => join(homeDirectory(), ".config", "ponte");

export const storeDirectoryPath = () => join(homeDirectory(), ".local", "share", "ponte", "store");

export const gitCacheDirectoryPath = () => join(homeDirectory(), ".cache", "ponte", "sources");

export { join };
