import {
  getRepoState,
  type LinkStore,
  ok,
  type Problem,
  type Repo,
  type RepoStatusReport,
  type Result,
} from "@ponte/core";
import type { ResolveRepoSkills } from "./repo-resolve";

export type GetRepoStatusReport = (
  repo: Repo,
) => Promise<Result<RepoStatusReport, Problem>>;

type GetRepoStatusReportDeps = {
  resolveRepoSkills: ResolveRepoSkills;
  links: LinkStore;
};

export const createGetRepoStatusReport =
  (deps: GetRepoStatusReportDeps): GetRepoStatusReport =>
  async repo => {
    const resolution = await deps.resolveRepoSkills(repo, false);
    if (!resolution.ok) {
      return resolution;
    }
    const { plan, pending } = resolution.value;
    const actual = await deps.links.read(plan);
    return ok({
      root: repo.layout.root,
      skillsDirectory: repo.layout.skills,
      linkCount: actual.size,
      state: getRepoState(plan, actual, pending),
    });
  };
