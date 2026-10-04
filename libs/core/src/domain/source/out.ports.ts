import type { Result } from "../shared";
import type { SkillSource, SourceProblem } from "./types";

export type ResolvedSource = {
  readonly directory: string;
  readonly commit: string | null;
};

export type Sources = {
  readonly resolve: (
    source: SkillSource,
  ) => Promise<Result<ResolvedSource, SourceProblem>>;
};
