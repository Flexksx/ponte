import {
  applyWorkspaceEdit,
  checkWorkspaceName,
  err,
  findSessionsForWorkspace,
  findWorkspacesForDirectory,
  type ListAgentSessions,
  newWorkspace,
  ok,
  type Result,
  type Workspace,
  type WorkspaceEdit,
  type WorkspaceProblem,
  type WorkspaceStore,
  type Workspaces,
} from "@ponte/core";

type WorkspacesDeps = {
  store: WorkspaceStore;
  listSessions: ListAgentSessions;
  home: string;
  today: () => string;
};

export const createWorkspaces = (deps: WorkspacesDeps): Workspaces => {
  const show = async (
    name: string,
  ): Promise<Result<Workspace, WorkspaceProblem>> => {
    const checked = checkWorkspaceName(name);
    if (!checked.ok) {
      return checked;
    }
    const workspace = await deps.store.read(name);
    if (!workspace.ok) {
      return workspace;
    }
    return workspace.value === null
      ? err({ kind: "workspace-not-found", name })
      : ok(workspace.value);
  };

  const edit = async (
    name: string,
    change: WorkspaceEdit,
  ): Promise<Result<Workspace, WorkspaceProblem>> => {
    const workspace = await show(name);
    if (!workspace.ok) {
      return workspace;
    }
    const edited = applyWorkspaceEdit(workspace.value, change);
    if (edited.ok) {
      await deps.store.write(edited.value);
    }
    return edited;
  };

  return {
    list: deps.store.list,
    show,
    forDirectory: async directory => {
      const workspaces = await deps.store.list();
      return workspaces.ok
        ? ok(findWorkspacesForDirectory(workspaces.value, directory, deps.home))
        : workspaces;
    },
    sessions: async name => {
      const workspace = await show(name);
      if (!workspace.ok) {
        return workspace;
      }
      const sessions = await deps.listSessions();
      return ok(findSessionsForWorkspace(workspace.value, sessions, deps.home));
    },
    create: async (name, goal) => {
      const checked = checkWorkspaceName(name);
      if (!checked.ok) {
        return checked;
      }
      const existing = await deps.store.read(name);
      if (!existing.ok) {
        return existing;
      }
      if (existing.value !== null) {
        return err({ kind: "workspace-exists", name });
      }
      const workspace = newWorkspace(name, goal);
      await deps.store.write(workspace);
      return ok(workspace);
    },
    link: (name, target, note) => edit(name, { kind: "link", target, note }),
    unlink: (name, target) => edit(name, { kind: "unlink", target }),
    decide: (name, text) =>
      edit(name, { kind: "decide", date: deps.today(), text }),
    setNext: (name, text) => edit(name, { kind: "next", text }),
  };
};
