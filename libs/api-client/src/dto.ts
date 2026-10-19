export type WorkspaceLinkDto = {
  readonly target: string;
  readonly note: string;
};

export type DecisionDto = {
  readonly date: string;
  readonly text: string;
};

export type WorkspaceDto = {
  readonly name: string;
  readonly goal: string;
  readonly next: string;
  readonly links: readonly WorkspaceLinkDto[];
  readonly decisions: readonly DecisionDto[];
};

export type SessionDto = {
  readonly agent: "claude-code" | "pi-agent";
  readonly id: string;
  readonly directory: string;
  readonly startedAt: string;
  readonly title: string;
  readonly resume: string;
};

export type LinkStateDto = "in sync" | "drifted" | "not synced" | "disabled";

export type AgentStatusDto = {
  readonly name: string;
  readonly enabled: boolean;
  readonly linkCount: number;
  readonly state: LinkStateDto;
};

export type StatusDto =
  | {
      readonly mode: "global";
      readonly promptFile: string;
      readonly agents: readonly AgentStatusDto[];
    }
  | {
      readonly mode: "repo";
      readonly root: string;
      readonly skillsDirectory: string;
      readonly linkCount: number;
      readonly state: LinkStateDto;
    };

export type SourceKindDto = "git" | "local";

export type SkillDto = {
  readonly name: string | null;
  readonly source: string;
  readonly kind: SourceKindDto;
};

export type SkillsDto = {
  readonly mode: "repo" | "global";
  readonly skills: readonly SkillDto[];
};

export type SubagentDto = {
  readonly source: string;
  readonly kind: SourceKindDto;
};

export type SystemPromptDto = { readonly text: string };

export type ErrorDto = { readonly error: string };
