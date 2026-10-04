import { buildPontePaths, type Platform, type PontePaths } from "@ponte/core";

export const currentPlatform = (): Platform =>
  process.platform === "win32" ? "win32" : "posix";

export const currentDirectory = (): string => process.cwd();

export const homeDirectory = (): string => {
  const home = Bun.env.HOME ?? process.env.USERPROFILE;
  if (!home) {
    throw new Error("cannot determine the home directory; set HOME");
  }
  return home;
};

const environment = (name: string): string | undefined => {
  const value = Bun.env[name];
  return value === undefined || value === "" ? undefined : value;
};

export const pontePaths = (): PontePaths =>
  buildPontePaths({
    home: homeDirectory(),
    configHome: environment("XDG_CONFIG_HOME"),
    dataHome: environment("XDG_DATA_HOME"),
    cacheHome: environment("XDG_CACHE_HOME"),
  });
