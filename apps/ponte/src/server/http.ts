import { StreamableHTTPTransport } from "@hono/mcp";
import type { ErrorDto } from "@ponte/api-client/dto";
import { API_ROUTES, MCP_ROUTE } from "@ponte/api-client/routes";
import type { App, Problem, Result } from "@ponte/core";
import page from "@ponte/web/index.html";
import { type Context, Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { describeProblem } from "../cli/problems";
import {
  toSessionDto,
  toSkillsDto,
  toStatusDto,
  toSubagentDto,
  toWorkspaceDto,
} from "./dto-mappers";
import { createMcpServer } from "./mcp-tools";

const LOCALHOST = "127.0.0.1";

const LOCAL_HOST_NAMES = [LOCALHOST, "localhost"];

const SERVER_ERROR = 500;

const FORBIDDEN = 403;

const STATUS_BY_PROBLEM: Partial<
  Record<Problem["kind"], ContentfulStatusCode>
> = {
  "workspace-not-found": 404,
  "invalid-workspace-name": 400,
};

const respond = <T, D>(
  context: Context,
  result: Result<T, Problem>,
  toDto: (value: T) => D,
): Response =>
  result.ok
    ? context.json(toDto(result.value))
    : context.json<ErrorDto>(
        { error: describeProblem(result.error) },
        STATUS_BY_PROBLEM[result.error.kind] ?? SERVER_ERROR,
      );

const createApi = (app: App, allowedHosts: ReadonlySet<string>): Hono => {
  const api = new Hono();
  const mcp = createMcpServer(app);
  const transport = new StreamableHTTPTransport();

  api.use(async (context, next) => {
    if (!allowedHosts.has(context.req.header("host") ?? "")) {
      return context.json<ErrorDto>({ error: "unknown host" }, FORBIDDEN);
    }
    await next();
  });

  api.get(API_ROUTES.workspaces, async context =>
    respond(context, await app.workspaces.list(), workspaces =>
      workspaces.map(toWorkspaceDto),
    ),
  );
  api.get(API_ROUTES.workspace, async context =>
    respond(
      context,
      await app.workspaces.show(context.req.param("name")),
      toWorkspaceDto,
    ),
  );
  api.get(API_ROUTES.workspaceSessions, async context =>
    respond(
      context,
      await app.workspaces.sessions(context.req.param("name")),
      sessions => sessions.map(toSessionDto),
    ),
  );
  api.get(API_ROUTES.status, async context =>
    respond(context, await app.status(), toStatusDto),
  );
  api.get(API_ROUTES.systemPrompt, async context =>
    respond(context, await app.readSystemPrompt(), prompt => ({
      text: prompt,
    })),
  );
  api.get(API_ROUTES.skills, async context =>
    respond(context, await app.listSkills(), toSkillsDto),
  );
  api.get(API_ROUTES.subagents, async context =>
    respond(context, await app.listSubagents(), entries =>
      entries.map(toSubagentDto),
    ),
  );
  api.all(MCP_ROUTE, async context => {
    if (!mcp.isConnected()) {
      await mcp.connect(transport);
    }
    return transport.handleRequest(context);
  });
  return api;
};

export const serve = (app: App, port: number): string => {
  const allowedHosts = new Set<string>();
  const api = createApi(app, allowedHosts);
  const server = Bun.serve({
    hostname: LOCALHOST,
    port,
    routes: { "/": page },
    fetch: api.fetch,
  });
  for (const name of LOCAL_HOST_NAMES) {
    allowedHosts.add(`${name}:${server.port}`);
  }
  return server.url.href;
};
