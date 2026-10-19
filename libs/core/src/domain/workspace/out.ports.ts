import type { Result } from "../shared";
import type { Workspace, WorkspaceProblem } from "./types";

export type WorkspaceStore = {
  readonly list: () => Promise<Result<Workspace[], WorkspaceProblem>>;
  readonly read: (
    name: string,
  ) => Promise<Result<Workspace | null, WorkspaceProblem>>;
  readonly write: (workspace: Workspace) => Promise<void>;
};
