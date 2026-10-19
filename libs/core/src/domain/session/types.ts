export type SessionAgent = "claude-code" | "pi-agent";

export type AgentSession = {
  readonly agent: SessionAgent;
  readonly id: string;
  readonly directory: string;
  readonly startedAt: string;
  readonly lastActiveAt: string;
  readonly title: string;
  readonly resume: string;
  readonly mentions: readonly string[];
};
