import { err, ok, type Result } from "../shared";
import type {
  Workspace,
  WorkspaceEdit,
  WorkspaceLink,
  WorkspaceProblem,
} from "./types";

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export const checkWorkspaceName = (
  name: string,
): Result<string, WorkspaceProblem> =>
  SLUG.test(name) ? ok(name) : err({ kind: "invalid-workspace-name", name });

export const newWorkspace = (name: string, goal: string): Workspace => ({
  name,
  goal,
  next: "",
  tags: [],
  doneOn: null,
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
    case "tag":
      if (!SLUG.test(edit.tag)) {
        return err({ kind: "invalid-tag", tag: edit.tag });
      }
      return ok({
        ...workspace,
        tags: [...new Set([...workspace.tags, edit.tag])].sort(),
      });
    case "untag":
      return workspace.tags.includes(edit.tag)
        ? ok({
            ...workspace,
            tags: workspace.tags.filter(tag => tag !== edit.tag),
          })
        : err({ kind: "tag-not-found", tag: edit.tag });
    case "done":
      return workspace.doneOn === null
        ? ok({ ...workspace, doneOn: edit.date })
        : err({ kind: "workspace-already-done", name: workspace.name });
    case "reopen":
      return workspace.doneOn === null
        ? err({ kind: "workspace-not-done", name: workspace.name })
        : ok({ ...workspace, doneOn: null });
  }
};
