import { StreamableHTTPTransport } from "@hono/mcp";
import { API_ROUTES, MCP_ROUTE } from "@ponte/api-client/routes";
import type { App, Problem, Result } from "@ponte/core";
import page from "@ponte/web/index.html";
import { type Context, Hono } from "hono";
import { createMcpServer } from "../mcp/tools";

const LOCALHOST = "127.0.0.1";

const LOCAL_HOST_NAMES = [LOCALHOST, "localhost"];

const OK = 200;

const UNPROCESSABLE = 422;

const FORBIDDEN = 403;

const HTTP_SCHEME = "http://";

const send = async <T>(
  context: Context,
  pending: Promise<Result<T, Problem>>,
): Promise<Response> => {
  const result = await pending;
  return context.json(result, result.ok ? OK : UNPROCESSABLE);
};

const createApi = (app: App, allowedHosts: ReadonlySet<string>): Hono => {
  const api = new Hono();
  const mcp = createMcpServer(app);
  const transport = new StreamableHTTPTransport();

  api.use(async (context, next) => {
    if (!allowedHosts.has(context.req.header("host") ?? "")) {
      return context.text("unknown host", FORBIDDEN);
    }
    const origin = context.req.header("origin");
    if (
      context.req.method !== "GET" &&
      origin !== undefined &&
      !allowedHosts.has(origin.replace(HTTP_SCHEME, ""))
    ) {
      return context.text("cross-site request", FORBIDDEN);
    }
    await next();
  });
  api.get(API_ROUTES.workspaces, context =>
    send(context, app.workspaces.list()),
  );
  api.get(API_ROUTES.workspaceOverview, context =>
    send(context, app.workspaces.overview()),
  );
  api.get(API_ROUTES.workspace, context =>
    send(context, app.workspaces.show(context.req.param("name"))),
  );
  api.get(API_ROUTES.workspaceSessions, context =>
    send(context, app.workspaces.sessions(context.req.param("name"))),
  );
  api.get(API_ROUTES.workspacePullRequests, context =>
    send(context, app.workspaces.pullRequests(context.req.param("name"))),
  );
  api.post(API_ROUTES.workspaceDone, context =>
    send(context, app.workspaces.markDone(context.req.param("name"))),
  );
  api.post(API_ROUTES.workspaceReopen, context =>
    send(context, app.workspaces.reopen(context.req.param("name"))),
  );
  api.get(API_ROUTES.status, context => send(context, app.status()));
  api.get(API_ROUTES.systemPrompt, context =>
    send(context, app.readSystemPrompt()),
  );
  api.get(API_ROUTES.skills, context => send(context, app.listSkills()));
  api.get(API_ROUTES.subagents, context => send(context, app.listSubagents()));
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
  const server = Bun.serve({
    hostname: LOCALHOST,
    port,
    routes: { "/": page },
    fetch: createApi(app, allowedHosts).fetch,
  });
  for (const name of LOCAL_HOST_NAMES) {
    allowedHosts.add(`${name}:${server.port}`);
  }
  return server.url.href;
};
