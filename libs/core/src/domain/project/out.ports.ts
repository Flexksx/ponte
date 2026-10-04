import type { ConfigProblem } from "../config";
import type { Result } from "../shared";
import type { ProjectConfig, ProjectLayout, ProjectLock } from "./types";

export type ProjectFiles = {
  readonly findRoot: (start: string) => Promise<string | null>;
  readonly readConfig: (
    root: string,
  ) => Promise<Result<ProjectConfig, ConfigProblem>>;
  readonly readLock: (
    layout: ProjectLayout,
  ) => Promise<Result<ProjectLock, ConfigProblem>>;
  readonly writeLock: (
    layout: ProjectLayout,
    lock: ProjectLock,
  ) => Promise<void>;
};

export type VendoredSkills = {
  readonly exists: (directory: string) => Promise<boolean>;
  readonly differs: (pristine: string, directory: string) => Promise<boolean>;
  readonly copy: (from: string, directory: string) => Promise<void>;
  readonly remove: (directory: string) => Promise<void>;
};
