import type { AgentSession } from "./types";

export type ListAgentSessions = () => Promise<AgentSession[]>;
