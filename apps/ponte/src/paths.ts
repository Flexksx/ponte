import { join } from "node:path";

// homeDirectory returns the user's home directory. Go's os.UserHomeDir reads
// $HOME on unix and %USERPROFILE% on windows; honor the same two so a harness
// can isolate a test by overriding the env.
export function homeDirectory(): string {
  const home = Bun.env.HOME ?? process.env.USERPROFILE;
  if (!home) {
    throw new Error("cannot determine the home directory; set HOME");
  }
  return home;
}

export const configDirectoryPath = () =>
  join(homeDirectory(), ".config", "ponte");

export const storeDirectoryPath = () =>
  join(homeDirectory(), ".local", "share", "ponte", "store");

export const gitCacheDirectoryPath = () =>
  join(homeDirectory(), ".cache", "ponte", "sources");

export { join };