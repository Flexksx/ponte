import {
  getRepoEnabledVendors,
  ok,
  type Platform,
  type Problem,
  type Repo,
  type RepoFiles,
  type Result,
  repoLayout,
  resolveRepoConfigPaths,
} from "@ponte/core";
import type { ReadVendorVersions } from "./vendor-versions";

export type FindRepo = () => Promise<Result<Repo | null, Problem>>;

type FindRepoDeps = {
  repoFiles: RepoFiles;
  cwd: string;
  platform: Platform;
  readVendorVersions: ReadVendorVersions;
};

export const createFindRepo =
  (deps: FindRepoDeps): FindRepo =>
  async () => {
    const root = await deps.repoFiles.findRoot(deps.cwd);
    if (root === null) {
      return ok(null);
    }
    const declared = await deps.repoFiles.readConfig(root);
    if (!declared.ok) {
      return declared;
    }
    const config = resolveRepoConfigPaths(declared.value, root);
    const layout = repoLayout(
      {
        root,
        platform: deps.platform,
        scope: "repo",
        versions: await deps.readVendorVersions(),
      },
      getRepoEnabledVendors(config),
    );
    return ok({ layout, config });
  };
