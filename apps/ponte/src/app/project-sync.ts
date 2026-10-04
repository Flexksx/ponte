import {
  getStaleLinkPaths,
  type LinkStore,
  ok,
  type Problem,
  type Project,
  type ProjectFiles,
  type ProjectSyncReport,
  type Result,
} from "@ponte/core";
import type { ResolveProjectSkills } from "./project-resolve";

export type SyncProject = (
  project: Project,
  apply: boolean,
) => Promise<Result<ProjectSyncReport, Problem>>;

type SyncProjectDeps = {
  resolveProjectSkills: ResolveProjectSkills;
  links: LinkStore;
  projectFiles: ProjectFiles;
};

export const createSyncProject =
  (deps: SyncProjectDeps): SyncProject =>
  async (project, apply) => {
    const resolution = await deps.resolveProjectSkills(project, apply);
    if (!resolution.ok) {
      return resolution;
    }
    const { plan, lock, lockChanged, pending } = resolution.value;
    const stale = getStaleLinkPaths(plan, await deps.links.read(plan));
    if (apply) {
      await deps.links.apply(plan, stale);
      if (lockChanged) {
        await deps.projectFiles.writeLock(project.layout, lock);
      }
    }
    return ok({
      root: project.layout.root,
      vendored: pending,
      linked: plan.links.length,
      stale: stale.length,
    });
  };
