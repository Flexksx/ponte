import type { AgentSession } from "../session";
import type { Workspace } from "./types";

const NO_NEXT_STEP = "not set";

const ISO_DATE_LENGTH = 10;

const NO_SESSIONS = "No agent sessions ran in this workspace's folders.";

const section = (heading: string, lines: readonly string[]): string[] =>
  lines.length === 0 ? [] : ["", `## ${heading}`, ...lines];

export const describeWorkspace = (workspace: Workspace): string =>
  [
    `# Workspace: ${workspace.name}`,
    "",
    `Goal: ${workspace.goal}`,
    `Next: ${workspace.next === "" ? NO_NEXT_STEP : workspace.next}`,
    ...(workspace.tags.length === 0
      ? []
      : [`Tags: ${workspace.tags.join(", ")}`]),
    ...section(
      "Links",
      workspace.links.map(
        link => `- ${link.target}${link.note === "" ? "" : ` - ${link.note}`}`,
      ),
    ),
    ...section(
      "Decisions",
      workspace.decisions.map(
        decision => `- ${decision.date}: ${decision.text}`,
      ),
    ),
    "",
  ].join("\n");

export const describeSessions = (sessions: readonly AgentSession[]): string =>
  sessions.length === 0
    ? NO_SESSIONS
    : sessions
        .map(
          session =>
            `- ${session.startedAt.slice(0, ISO_DATE_LENGTH)} ${session.agent}: ${session.title}\n  ${session.resume}`,
        )
        .join("\n");

const workspaceNames = (workspaces: readonly Workspace[]): string =>
  workspaces.map(workspace => workspace.name).join(", ");

export const describeDirectoryMatch = (
  matches: readonly Workspace[],
  all: readonly Workspace[],
): string => {
  const [only] = matches;
  if (matches.length === 1 && only !== undefined) {
    return describeWorkspace(only);
  }
  if (matches.length > 1) {
    return `Several workspaces link this folder: ${workspaceNames(matches)}. Load one by name.\n`;
  }
  return all.length === 0
    ? ""
    : `No workspace links this folder. Workspaces: ${workspaceNames(all)}. Load one by name.\n`;
};
