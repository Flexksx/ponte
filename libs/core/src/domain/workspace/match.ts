import { isAbsolute, join, relative } from "node:path";
import type { Workspace } from "./types";

const HOME_PREFIX = "~/";

const localPath = (target: string, home: string): string | null => {
  if (target.startsWith(HOME_PREFIX)) {
    return join(home, target.slice(HOME_PREFIX.length));
  }
  return isAbsolute(target) ? target : null;
};

const isInside = (directory: string, path: string): boolean => {
  const fromDirectory = relative(directory, path);
  return !fromDirectory.startsWith("..") && !isAbsolute(fromDirectory);
};

export const findWorkspacesForDirectory = (
  workspaces: readonly Workspace[],
  directory: string,
  home: string,
): Workspace[] =>
  workspaces.filter(workspace =>
    workspace.links.some(link => {
      const path = localPath(link.target, home);
      return path !== null && isInside(path, directory);
    }),
  );
