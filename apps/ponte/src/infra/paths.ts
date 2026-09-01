import { isAbsolute, join } from "node:path";
import type { Platform } from "../domain/vendor";

const CONFIG_FILE = "config.toml";

const OVERRIDE_PROMPT_FILE = "instruction";

export const currentPlatform = (): Platform => (process.platform === "win32" ? "win32" : "posix");

export const currentDirectory = (): string => process.cwd();

export const homeDirectory = (): string => {
  const home = Bun.env.HOME ?? process.env.USERPROFILE;
  if (!home) throw new Error("cannot determine the home directory; set HOME");
  return home;
};

export const configDirectoryPath = (): string => join(homeDirectory(), ".config", "ponte");

export const dataDirectoryPath = (): string => join(homeDirectory(), ".local", "share", "ponte");

export const overridePromptPath = (): string => join(dataDirectoryPath(), OVERRIDE_PROMPT_FILE);

export const gitCacheDirectoryPath = (): string =>
  join(homeDirectory(), ".cache", "ponte", "sources");

export const configFilePath = (): string => join(configDirectoryPath(), CONFIG_FILE);

export const promptFilePath = (filename: string): string =>
  isAbsolute(filename) ? filename : join(configDirectoryPath(), filename);
