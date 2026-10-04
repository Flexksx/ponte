import {
  type ConfigStore,
  err,
  ok,
  type PontePaths,
  type PromptStore,
  resolvePromptPath,
} from "@ponte/core";
import { decodeConfig, encodeConfig, parseToml } from "./config-codec";
import { fileExists, readTextFile, writeText } from "./filesystem";

export const createConfigStore = (paths: PontePaths): ConfigStore => ({
  read: async () => {
    const text = await readTextFile(paths.configFile);
    if (text === null) {
      return ok(null);
    }
    const parsed = parseToml(text);
    const config = parsed.ok ? decodeConfig(parsed.value) : parsed;
    return config.ok
      ? config
      : err({ kind: "invalid-config", issues: config.error });
  },
  write: config => writeText(paths.configFile, encodeConfig(config)),
});

export const createPromptStore = (paths: PontePaths): PromptStore => {
  const promptPath = (filename: string): string =>
    resolvePromptPath(paths.config, filename);

  return {
    read: filename => readTextFile(promptPath(filename)),
    write: (filename, content) => writeText(promptPath(filename), content),
    locate: async filename => {
      const path = promptPath(filename);
      return (await fileExists(path)) ? path : null;
    },
    readFile: readTextFile,
    isFile: fileExists,
    writeOverride: async content => {
      await writeText(paths.overridePrompt, content);
      return paths.overridePrompt;
    },
  };
};
