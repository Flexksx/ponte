import {
  getProjectEnabledVendors,
  ok,
  type Platform,
  type Problem,
  type Project,
  type ProjectFiles,
  projectLayout,
  type Result,
  resolveProjectConfigPaths,
} from "@ponte/core";
import type { ReadVendorVersions } from "./vendor-versions";

export type FindProject = () => Promise<Result<Project | null, Problem>>;

type FindProjectDeps = {
  projectFiles: ProjectFiles;
  cwd: string;
  platform: Platform;
  readVendorVersions: ReadVendorVersions;
};

export const createFindProject =
  (deps: FindProjectDeps): FindProject =>
  async () => {
    const root = await deps.projectFiles.findRoot(deps.cwd);
    if (root === null) {
      return ok(null);
    }
    const declared = await deps.projectFiles.readConfig(root);
    if (!declared.ok) {
      return declared;
    }
    const config = resolveProjectConfigPaths(declared.value, root);
    const layout = projectLayout(
      {
        root,
        platform: deps.platform,
        scope: "project",
        versions: await deps.readVendorVersions(),
      },
      getProjectEnabledVendors(config),
    );
    return ok({ layout, config });
  };
