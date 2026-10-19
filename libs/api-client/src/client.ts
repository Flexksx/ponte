import type {
  ErrorDto,
  SessionDto,
  SkillsDto,
  StatusDto,
  SubagentDto,
  SystemPromptDto,
  WorkspaceDto,
} from "./dto";
import { API_ROUTES, NAME_PARAMETER } from "./routes";

export class PonteApiError extends Error {}

export type PonteClient = {
  readonly workspaces: () => Promise<WorkspaceDto[]>;
  readonly workspace: (name: string) => Promise<WorkspaceDto>;
  readonly workspaceSessions: (name: string) => Promise<SessionDto[]>;
  readonly status: () => Promise<StatusDto>;
  readonly systemPrompt: () => Promise<SystemPromptDto>;
  readonly skills: () => Promise<SkillsDto>;
  readonly subagents: () => Promise<SubagentDto[]>;
};

const withName = (route: string, name: string): string =>
  route.replace(NAME_PARAMETER, encodeURIComponent(name));

export const createPonteClient = (baseUrl = ""): PonteClient => {
  const get = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${baseUrl}${path}`);
    const body: unknown = await response.json();
    if (!response.ok) {
      throw new PonteApiError((body as ErrorDto).error);
    }
    return body as T;
  };

  return {
    workspaces: () => get(API_ROUTES.workspaces),
    workspace: name => get(withName(API_ROUTES.workspace, name)),
    workspaceSessions: name =>
      get(withName(API_ROUTES.workspaceSessions, name)),
    status: () => get(API_ROUTES.status),
    systemPrompt: () => get(API_ROUTES.systemPrompt),
    skills: () => get(API_ROUTES.skills),
    subagents: () => get(API_ROUTES.subagents),
  };
};
