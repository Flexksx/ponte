import type { Config } from "../domain/config";
import { readConfig } from "../infra/config-file";

export class ConfigNotInitializedError extends Error {
  constructor() {
    super("config not initialized - run `ponte sync` first");
  }
}

export const requireConfig = async (): Promise<Config> => {
  const config = await readConfig();
  if (config === null) throw new ConfigNotInitializedError();
  return config;
};
