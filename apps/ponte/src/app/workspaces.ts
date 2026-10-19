import {
  applyWorkspaceEdit,
  checkWorkspaceName,
  err,
  findSessionsForWorkspace,
  findWorkspacesForDirectory,
  isPullRequestUrl,
  type ListAgentSessions,
  newWorkspace,
  ok,
  parseGitHubRepository,
  type ReadPullRequest,
  type ReadRepository,
  type Repository,
  type Result,
  resolveLocalPath,
  type Workspace,
  type WorkspaceEdit,
  type WorkspaceOverview,
  type WorkspaceProblem,
  type WorkspaceStore,
  type Workspaces,
} from "@ponte/core";

type WorkspacesDeps = {
  store: WorkspaceStore;
  listSessions: ListAgentSessions;
  readPullRequest: ReadPullRequest;
  readRepository: ReadRepository;
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

  const repositoryOf = async (target: string): Promise<Repository | null> => {
    const path = resolveLocalPath(target, deps.home);
    return path === null
      ? parseGitHubRepository(target)
      : deps.readRepository(path);
  };

  const describe = async (workspace: Workspace): Promise<WorkspaceOverview> => {
    const found = await Promise.all(
      workspace.links.map(link => repositoryOf(link.target)),
    );
    const unique = new Map(
      found
        .filter(repository => repository !== null)
        .map(repository => [
          `${repository.owner}/${repository.name}`,
          repository,
        ]),
    );
    return {
      workspace,
      repositories: [...unique.entries()]
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([, repository]) => repository),
    };
  };

  return {
    list: deps.store.list,
    overview: async () => {
      const workspaces = await deps.store.list();
      return workspaces.ok
        ? ok(await Promise.all(workspaces.value.map(describe)))
        : workspaces;
    },
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
    pullRequests: async name => {
      const workspace = await show(name);
      if (!workspace.ok) {
        return workspace;
      }
      const urls = workspace.value.links
        .map(link => link.target)
        .filter(isPullRequestUrl);
      return ok(await Promise.all(urls.map(deps.readPullRequest)));
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
    tag: (name, tag) => edit(name, { kind: "tag", tag }),
    untag: (name, tag) => edit(name, { kind: "untag", tag }),
  };
};
