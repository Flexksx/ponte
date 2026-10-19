import { isAbsolute, join, relative } from "node:path";
import type { AgentSession } from "../session";
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

const ownsDirectory = (
  workspace: Workspace,
  directory: string,
  home: string,
): boolean =>
  workspace.links.some(link => {
    const path = localPath(link.target, home);
    return path !== null && isInside(path, directory);
  });

export const findWorkspacesForDirectory = (
  workspaces: readonly Workspace[],
  directory: string,
  home: string,
): Workspace[] =>
  workspaces.filter(workspace => ownsDirectory(workspace, directory, home));

export const findSessionsForWorkspace = (
  workspace: Workspace,
  sessions: readonly AgentSession[],
  home: string,
): AgentSession[] =>
  sessions
    .filter(session => ownsDirectory(workspace, session.directory, home))
    .sort((first, second) => second.startedAt.localeCompare(first.startedAt));
