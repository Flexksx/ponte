import type { RepoUpdateReport } from "../repo";
import type { Result } from "../shared";
import type { SourceEntry } from "../source";
import type { Workspace, WorkspaceEdit, WorkspaceProblem } from "../workspace";
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
  readonly forCurrentDirectory: () => Promise<
    Result<Workspace[], WorkspaceProblem>
  >;
  readonly create: (
    name: string,
    goal: string,
  ) => Promise<Result<Workspace, WorkspaceProblem>>;
  readonly edit: (
    name: string,
    edit: WorkspaceEdit,
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
