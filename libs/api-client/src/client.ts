import type { App, Workspaces } from "@ponte/core";
import { API_ROUTES, NAME_PARAMETER } from "./routes";

export type PonteClient = Pick<
  App,
  "status" | "readSystemPrompt" | "listSkills" | "listSubagents"
> & {
  readonly workspaces: Pick<
    Workspaces,
    | "list"
    | "overview"
    | "show"
    | "sessions"
    | "pullRequests"
    | "markDone"
    | "reopen"
  >;
};

const withName = (route: string, name: string): string =>
  route.replace(NAME_PARAMETER, encodeURIComponent(name));

export const createPonteClient = (baseUrl = ""): PonteClient => {
  const request = async <R>(path: string, method: string): Promise<R> =>
    (await fetch(`${baseUrl}${path}`, { method })).json() as Promise<R>;
  const get = <R>(path: string): Promise<R> => request(path, "GET");
  const post = <R>(path: string): Promise<R> => request(path, "POST");

  return {
    status: () => get(API_ROUTES.status),
    readSystemPrompt: () => get(API_ROUTES.systemPrompt),
    listSkills: () => get(API_ROUTES.skills),
    listSubagents: () => get(API_ROUTES.subagents),
    workspaces: {
      list: () => get(API_ROUTES.workspaces),
      overview: () => get(API_ROUTES.workspaceOverview),
      show: name => get(withName(API_ROUTES.workspace, name)),
      sessions: name => get(withName(API_ROUTES.workspaceSessions, name)),
      pullRequests: name =>
        get(withName(API_ROUTES.workspacePullRequests, name)),
      markDone: name => post(withName(API_ROUTES.workspaceDone, name)),
      reopen: name => post(withName(API_ROUTES.workspaceReopen, name)),
    },
  };
};
