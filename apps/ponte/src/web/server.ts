import type { App, Problem, Result } from "@ponte/core";
import { describeProblem } from "../cli/problems";
import page from "./index.html";

const LOCALHOST = "127.0.0.1";

const SERVER_ERROR = 500;

const respond = <T>(result: Result<T, Problem>): Response =>
  result.ok
    ? Response.json(result.value)
    : Response.json(
        { error: describeProblem(result.error) },
        { status: SERVER_ERROR },
      );

export const serveWeb = (app: App, port: number): string =>
  Bun.serve({
    hostname: LOCALHOST,
    port,
    routes: {
      "/": page,
      "/api/workspaces": async () => respond(await app.workspaces.list()),
      "/api/skills": async () => respond(await app.listSkills()),
      "/api/subagents": async () => respond(await app.listSubagents()),
    },
  }).url.href;
