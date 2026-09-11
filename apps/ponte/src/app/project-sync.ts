import {
  type ApplyPlan,
  getStaleLinkPaths,
  type ReadSymlinks,
  type WriteProjectLock,
} from "@ponte/core";
import type { Project } from "./find-project";
import type { ResolveProjectSkills } from "./project-resolve";

export type ProjectSyncReport = {
  readonly root: string;
  readonly vendored: number;
  readonly linked: number;
  readonly stale: number;
};

type SyncProjectDeps = {
  resolveProjectSkills: ResolveProjectSkills;
  readSymlinks: ReadSymlinks;
  applyPlan: ApplyPlan;
  writeProjectLock: WriteProjectLock;
};

export const createSyncProject =
  (deps: SyncProjectDeps) =>
  async (project: Project, apply: boolean): Promise<ProjectSyncReport> => {
    const resolution = await deps.resolveProjectSkills(project, apply);
    const stale = getStaleLinkPaths(
      resolution.plan,
      await deps.readSymlinks(resolution.plan),
    );
    if (apply) {
      await deps.applyPlan(resolution.plan, stale);
      if (resolution.vendored.length > 0)
        await deps.writeProjectLock(project.layout, resolution.lock);
    }
    return {
      root: project.layout.root,
      vendored: resolution.vendored.length,
      linked: resolution.plan.links.length,
      stale: stale.length,
    };
  };
