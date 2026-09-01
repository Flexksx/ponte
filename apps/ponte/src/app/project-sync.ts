import { staleLinkPaths } from "../domain/link";
import { applyPlan, readSymlinks } from "../infra/links";
import { writeProjectLock } from "../infra/project-file";
import { type Project, resolveProject } from "./project";

export type ProjectSyncReport = {
  readonly root: string;
  readonly vendored: number;
  readonly linked: number;
  readonly stale: number;
};

const syncProject = async (project: Project, apply: boolean): Promise<ProjectSyncReport> => {
  const resolution = await resolveProject(project, apply);
  const stale = staleLinkPaths(resolution.plan, await readSymlinks(resolution.plan));
  if (apply) {
    await applyPlan(resolution.plan, stale);
    if (resolution.vendored.length > 0) await writeProjectLock(project.layout, resolution.lock);
  }
  return {
    root: project.layout.root,
    vendored: resolution.vendored.length,
    linked: resolution.plan.links.length,
    stale: stale.length,
  };
};

export const planProjectSync = (project: Project): Promise<ProjectSyncReport> =>
  syncProject(project, false);

export const runProjectSync = (project: Project): Promise<ProjectSyncReport> =>
  syncProject(project, true);
