import {
  type FindProjectRoot,
  getProjectEnabledVendors,
  type Platform,
  type Project,
  projectLayout,
  type ReadProjectConfig,
} from "@ponte/core";

export type FindProject = () => Promise<Project | null>;

type FindProjectDeps = {
  findProjectRoot: FindProjectRoot;
  readProjectConfig: ReadProjectConfig;
  cwd: string;
  platform: Platform;
};

export const createFindProject =
  (deps: FindProjectDeps): FindProject =>
  async () => {
    const root = await deps.findProjectRoot(deps.cwd);
    if (root === null) return null;
    const config = await deps.readProjectConfig(root);
    const enabled = getProjectEnabledVendors(config);
    return { layout: projectLayout(root, deps.platform, enabled), config };
  };
