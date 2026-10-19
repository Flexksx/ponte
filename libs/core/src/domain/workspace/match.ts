import { isAbsolute, join, relative } from "node:path";
import { type AgentSession, extractMentions } from "../session";
import type { Workspace } from "./types";

const HOME_PREFIX = "~/";

export const resolveLocalPath = (
  target: string,
  home: string,
): string | null => {
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
    const path = resolveLocalPath(link.target, home);
    return path !== null && isInside(path, directory);
  });

export const findWorkspacesForDirectory = (
  workspaces: readonly Workspace[],
  directory: string,
  home: string,
): Workspace[] =>
  workspaces.filter(workspace => ownsDirectory(workspace, directory, home));

const identifiersOf = (workspace: Workspace): Set<string> =>
  new Set(extractMentions(workspace.links.map(link => link.target).join("\n")));

export const findSessionsForWorkspace = (
  workspace: Workspace,
  sessions: readonly AgentSession[],
  home: string,
): AgentSession[] => {
  const identifiers = identifiersOf(workspace);
  return sessions
    .filter(
      session =>
        ownsDirectory(workspace, session.directory, home) ||
        session.mentions.some(mention => identifiers.has(mention)),
    )
    .sort((first, second) =>
      second.lastActiveAt.localeCompare(first.lastActiveAt),
    );
};
