import type { PullRequestLookup } from "../pull-request";
import type { AgentSession } from "../session";
import type { Result } from "../shared";
import type { Workspace, WorkspaceOverview, WorkspaceProblem } from "./types";

export type Workspaces = {
  readonly list: () => Promise<Result<Workspace[], WorkspaceProblem>>;
  readonly overview: () => Promise<
    Result<WorkspaceOverview[], WorkspaceProblem>
  >;
  readonly show: (name: string) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly forDirectory: (
    directory: string,
  ) => Promise<Result<Workspace[], WorkspaceProblem>>;
  readonly sessions: (
    name: string,
  ) => Promise<Result<AgentSession[], WorkspaceProblem>>;
  readonly pullRequests: (
    name: string,
  ) => Promise<Result<PullRequestLookup[], WorkspaceProblem>>;
  readonly create: (
    name: string,
    goal: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly link: (
    name: string,
    target: string,
    note: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly unlink: (
    name: string,
    target: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly decide: (
    name: string,
    text: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly setNext: (
    name: string,
    text: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly tag: (
    name: string,
    tag: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly untag: (
    name: string,
    tag: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly markDone: (
    name: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly reopen: (
    name: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
};
