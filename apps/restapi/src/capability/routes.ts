import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../middleware/auth.ts";
import * as service from "./service.ts";

export const capabilityRoutes = new Hono<AuthEnv>();

capabilityRoutes.use("/*", requireAuth);

capabilityRoutes.get("/:orgId/capabilities", async c => {
  const caps = await service.listByOrg(c.req.param("orgId"));
  return c.json(caps);
});

capabilityRoutes.post("/:orgId/capabilities", async c => {
  const body = await c.req.json<{ name: string; description?: string }>();
  const cap = await service.create(c.req.param("orgId"), body);
  return c.json(cap, 201);
});

capabilityRoutes.get("/:orgId/capabilities/:capId", async c => {
  const detail = await service.getDetail(
    c.req.param("orgId"),
    c.req.param("capId"),
  );
  if (!detail) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(detail);
});

capabilityRoutes.delete("/:orgId/capabilities/:capId", async c => {
  const deleted = await service.remove(
    c.req.param("orgId"),
    c.req.param("capId"),
  );
  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ deleted: true });
});

capabilityRoutes.post("/:orgId/teams/:teamId/capabilities", async c => {
  const body = await c.req.json<{ capabilityId: string }>();
  await service.assignToTeam(c.req.param("teamId"), body.capabilityId);
  return c.json({ assigned: true }, 201);
});

capabilityRoutes.get("/:orgId/teams/:teamId/capabilities", async c => {
  const caps = await service.listByTeam(c.req.param("teamId"));
  return c.json(caps);
});

capabilityRoutes.post("/:orgId/capabilities/:capId/skills", async c => {
  const body = await c.req.json<{
    name: string;
    source: string;
    ref?: string;
    subdir?: string;
  }>();
  const skill = await service.addSkill({
    capabilityId: c.req.param("capId"),
    ...body,
  });
  return c.json(skill, 201);
});

capabilityRoutes.post("/:orgId/capabilities/:capId/subagents", async c => {
  const body = await c.req.json<{
    name: string;
    source: string;
    ref?: string;
    subdir?: string;
  }>();
  const sub = await service.addSubagent({
    capabilityId: c.req.param("capId"),
    ...body,
  });
  return c.json(sub, 201);
});

capabilityRoutes.post("/:orgId/capabilities/:capId/mcp-servers", async c => {
  const body = await c.req.json<{
    name: string;
    url: string;
    config?: Record<string, unknown>;
  }>();
  const server = await service.addMcpServer({
    capabilityId: c.req.param("capId"),
    ...body,
  });
  return c.json(server, 201);
});
