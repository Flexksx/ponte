import type { ProjectLayout } from "../domain/project";
import type { ProjectConfig, ProjectLock } from "../domain/project-config";

export type FindProjectRoot = (start: string) => Promise<string | null>;
export type ReadProjectConfig = (root: string) => Promise<ProjectConfig>;
export type ReadProjectLock = (layout: ProjectLayout) => Promise<ProjectLock>;
export type WriteProjectLock = (
  layout: ProjectLayout,
  lock: ProjectLock,
) => Promise<void>;
