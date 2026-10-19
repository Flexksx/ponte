import {
  applyWorkspaceEdit,
  checkWorkspaceName,
  err,
  findWorkspacesForDirectory,
  newWorkspace,
  ok,
  type Result,
  type Workspace,
  type WorkspaceProblem,
  type WorkspaceStore,
  type Workspaces,
} from "@ponte/core";

type WorkspacesDeps = {
  store: WorkspaceStore;
  cwd: string;
  home: string;
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

  return {
    list: deps.store.list,
    show,
    forCurrentDirectory: async () => {
      const workspaces = await deps.store.list();
      return workspaces.ok
        ? ok(findWorkspacesForDirectory(workspaces.value, deps.cwd, deps.home))
        : workspaces;
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
    edit: async (name, edit) => {
      const workspace = await show(name);
      if (!workspace.ok) {
        return workspace;
      }
      const edited = applyWorkspaceEdit(workspace.value, edit);
      if (edited.ok) {
        await deps.store.write(edited.value);
      }
      return edited;
    },
  };
};
