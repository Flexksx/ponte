import {
  getStaleLinkPaths,
  type LinkStore,
  ok,
  type Problem,
  type Repo,
  type RepoFiles,
  type RepoSyncReport,
  type Result,
} from "@ponte/core";
import type { ResolveRepoSkills } from "./repo-resolve";

export type SyncRepo = (
  repo: Repo,
  apply: boolean,
) => Promise<Result<RepoSyncReport, Problem>>;

type SyncRepoDeps = {
  resolveRepoSkills: ResolveRepoSkills;
  links: LinkStore;
  repoFiles: RepoFiles;
};

export const createSyncRepo =
  (deps: SyncRepoDeps): SyncRepo =>
  async (repo, apply) => {
    const resolution = await deps.resolveRepoSkills(repo, apply);
    if (!resolution.ok) {
      return resolution;
    }
    const { plan, lock, lockChanged, pending } = resolution.value;
    const stale = getStaleLinkPaths(plan, await deps.links.read(plan));
    if (apply) {
      await deps.links.apply(plan, stale);
      if (lockChanged) {
        await deps.repoFiles.writeLock(repo.layout, lock);
      }
    }
    return ok({
      root: repo.layout.root,
      vendored: pending,
      linked: plan.links.length,
      stale: stale.length,
    });
  };
