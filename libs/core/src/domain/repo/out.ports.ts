import type { ConfigProblem } from "../config";
import type { Result } from "../shared";
import type { RepoConfig, RepoLayout, RepoLock } from "./types";

export type RepoFiles = {
  readonly findRoot: (start: string) => Promise<string | null>;
  readonly readConfig: (
    root: string,
  ) => Promise<Result<RepoConfig, ConfigProblem>>;
  readonly readLock: (
    layout: RepoLayout,
  ) => Promise<Result<RepoLock, ConfigProblem>>;
  readonly writeLock: (layout: RepoLayout, lock: RepoLock) => Promise<void>;
};

export type VendoredSkills = {
  readonly exists: (directory: string) => Promise<boolean>;
  readonly differs: (pristine: string, directory: string) => Promise<boolean>;
  readonly copy: (from: string, directory: string) => Promise<void>;
  readonly remove: (directory: string) => Promise<void>;
};
