export const NAME_PARAMETER = ":name";

export const API_ROUTES = {
  workspaces: "/api/workspaces",
  workspace: `/api/workspaces/${NAME_PARAMETER}`,
  workspaceSessions: `/api/workspaces/${NAME_PARAMETER}/sessions`,
  status: "/api/status",
  systemPrompt: "/api/system-prompt",
  skills: "/api/skills",
  subagents: "/api/subagents",
} as const;

export const MCP_ROUTE = "/mcp";
