import {
  getVendorState,
  type ReadSymlinks,
  type VendorState,
} from "@ponte/core";
import type { Project } from "./find-project";
import type { ResolveProjectSkills } from "./project-resolve";

export type ProjectStatusReport = {
  readonly root: string;
  readonly skillsDirectory: string;
  readonly linkCount: number;
  readonly state: VendorState;
};

export type GetProjectStatusReport = (
  project: Project,
) => Promise<ProjectStatusReport>;

type GetProjectStatusReportDeps = {
  resolveProjectSkills: ResolveProjectSkills;
  readSymlinks: ReadSymlinks;
};

export const createGetProjectStatusReport =
  (deps: GetProjectStatusReportDeps): GetProjectStatusReport =>
  async project => {
    const { plan } = await deps.resolveProjectSkills(project, false);
    const actual = await deps.readSymlinks(plan);
    return {
      root: project.layout.root,
      skillsDirectory: project.layout.skills,
      linkCount: actual.size,
      state: getVendorState(plan, actual),
    };
  };
