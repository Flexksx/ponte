import type { RepoUpdateReport } from "../repo";
import type { AgentSession } from "../session";
import type { Result } from "../shared";
import type { SourceEntry } from "../source";
import type { Workspace, WorkspaceProblem } from "../workspace";
import type {
  Problem,
  SkillListing,
  StatusOutcome,
  SyncOutcome,
  SyncRequest,
} from "./types";

export type Sync = (
  request: SyncRequest,
  apply: boolean,
) => Promise<Result<SyncOutcome, Problem>>;

export type Status = () => Promise<Result<StatusOutcome, Problem>>;

export type ListSkills = () => Promise<Result<SkillListing, Problem>>;

export type ListSubagents = () => Promise<
  Result<readonly SourceEntry[], Problem>
>;

export type UpdateSkills = (
  name: string | undefined,
  force: boolean,
) => Promise<Result<RepoUpdateReport, Problem>>;

export type ReadSystemPrompt = () => Promise<Result<string, Problem>>;

export type SetSystemPrompt = (
  fileOrLiteral: string,
) => Promise<Result<null, Problem>>;

export type Workspaces = {
  readonly list: () => Promise<Result<Workspace[], WorkspaceProblem>>;
  readonly show: (name: string) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly forDirectory: (
    directory: string,
  ) => Promise<Result<Workspace[], WorkspaceProblem>>;
  readonly sessions: (
    name: string,
  ) => Promise<Result<AgentSession[], WorkspaceProblem>>;
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
};

export type App = {
  readonly sync: Sync;
  readonly status: Status;
  readonly listSkills: ListSkills;
  readonly listSubagents: ListSubagents;
  readonly updateSkills: UpdateSkills;
  readonly readSystemPrompt: ReadSystemPrompt;
  readonly setSystemPrompt: SetSystemPrompt;
  readonly workspaces: Workspaces;
};
