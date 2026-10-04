import { isAbsolute, join } from "node:path";
import type { DirectoriesInput, PontePaths } from "./types";

const PONTE_DIRECTORY = "ponte";

const CONFIG_FILE = "config.toml";

const OVERRIDE_PROMPT_FILE = "instruction";

const SOURCE_CACHE_DIRECTORY = "sources";

// An XDG variable counts only when it holds an absolute path.
const baseDirectory = (xdg: string | undefined, fallback: string): string =>
  xdg !== undefined && isAbsolute(xdg) ? xdg : fallback;

export const buildPontePaths = (input: DirectoriesInput): PontePaths => {
  const config = join(
    baseDirectory(input.configHome, join(input.home, ".config")),
    PONTE_DIRECTORY,
  );
  const data = join(
    baseDirectory(input.dataHome, join(input.home, ".local", "share")),
    PONTE_DIRECTORY,
  );
  const cache = join(
    baseDirectory(input.cacheHome, join(input.home, ".cache")),
    PONTE_DIRECTORY,
  );
  return {
    config,
    configFile: join(config, CONFIG_FILE),
    overridePrompt: join(data, OVERRIDE_PROMPT_FILE),
    sourceCache: join(cache, SOURCE_CACHE_DIRECTORY),
  };
};
