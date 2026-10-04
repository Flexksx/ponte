import {
  getProjectState,
  type LinkStore,
  ok,
  type Problem,
  type Project,
  type ProjectStatusReport,
  type Result,
} from "@ponte/core";
import type { ResolveProjectSkills } from "./project-resolve";

export type GetProjectStatusReport = (
  project: Project,
) => Promise<Result<ProjectStatusReport, Problem>>;

type GetProjectStatusReportDeps = {
  resolveProjectSkills: ResolveProjectSkills;
  links: LinkStore;
};

export const createGetProjectStatusReport =
  (deps: GetProjectStatusReportDeps): GetProjectStatusReport =>
  async project => {
    const resolution = await deps.resolveProjectSkills(project, false);
    if (!resolution.ok) {
      return resolution;
    }
    const { plan, pending } = resolution.value;
    const actual = await deps.links.read(plan);
    return ok({
      root: project.layout.root,
      skillsDirectory: project.layout.skills,
      linkCount: actual.size,
      state: getProjectState(plan, actual, pending),
    });
  };
