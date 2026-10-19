export const NAME_PARAMETER = ":name";

export const API_ROUTES = {
  workspaces: "/api/workspaces",
  workspaceOverview: "/api/workspace-overview",
  workspace: `/api/workspaces/${NAME_PARAMETER}`,
  workspaceSessions: `/api/workspaces/${NAME_PARAMETER}/sessions`,
  workspacePullRequests: `/api/workspaces/${NAME_PARAMETER}/pull-requests`,
  workspaceDone: `/api/workspaces/${NAME_PARAMETER}/done`,
  workspaceReopen: `/api/workspaces/${NAME_PARAMETER}/reopen`,
  status: "/api/status",
  systemPrompt: "/api/system-prompt",
  skills: "/api/skills",
  subagents: "/api/subagents",
} as const;

export const MCP_ROUTE = "/mcp";
