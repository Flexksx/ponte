import { err, ok, type Result } from "../shared";
import type {
  Workspace,
  WorkspaceEdit,
  WorkspaceLink,
  WorkspaceProblem,
} from "./types";

const WORKSPACE_NAME = /^[a-z0-9][a-z0-9-]*$/;

export const checkWorkspaceName = (
  name: string,
): Result<string, WorkspaceProblem> =>
  WORKSPACE_NAME.test(name)
    ? ok(name)
    : err({ kind: "invalid-workspace-name", name });

export const newWorkspace = (name: string, goal: string): Workspace => ({
  name,
  goal,
  next: "",
  links: [],
  decisions: [],
});

const putLink = (
  links: readonly WorkspaceLink[],
  link: WorkspaceLink,
): WorkspaceLink[] =>
  links.some(existing => existing.target === link.target)
    ? links.map(existing => (existing.target === link.target ? link : existing))
    : [...links, link];

export const applyWorkspaceEdit = (
  workspace: Workspace,
  edit: WorkspaceEdit,
): Result<Workspace, WorkspaceProblem> => {
  switch (edit.kind) {
    case "link":
      return ok({
        ...workspace,
        links: putLink(workspace.links, {
          target: edit.target,
          note: edit.note,
        }),
      });
    case "unlink": {
      const links = workspace.links.filter(link => link.target !== edit.target);
      return links.length === workspace.links.length
        ? err({ kind: "link-not-found", target: edit.target })
        : ok({ ...workspace, links });
    }
    case "decide":
      return ok({
        ...workspace,
        decisions: [
          ...workspace.decisions,
          { date: edit.date, text: edit.text },
        ],
      });
    case "next":
      return ok({ ...workspace, next: edit.text });
  }
};
