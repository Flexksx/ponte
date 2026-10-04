import type { Result } from "../shared";
import type { Config, ConfigProblem } from "./types";

export type ConfigStore = {
  readonly read: () => Promise<Result<Config | null, ConfigProblem>>;
  readonly write: (config: Config) => Promise<void>;
};

export type PromptStore = {
  readonly read: (filename: string) => Promise<string | null>;
  readonly write: (filename: string, content: string) => Promise<void>;
  readonly locate: (filename: string) => Promise<string | null>;
  readonly readFile: (path: string) => Promise<string | null>;
  readonly isFile: (path: string) => Promise<boolean>;
  readonly writeOverride: (content: string) => Promise<string>;
};
