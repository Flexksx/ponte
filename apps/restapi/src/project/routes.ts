import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../middleware/auth.ts";
import * as service from "./service.ts";

export const projectRoutes = new Hono<AuthEnv>();

projectRoutes.use("/*", requireAuth);

projectRoutes.get("/:orgId/projects", async c => {
  const list = await service.listByOrg(c.req.param("orgId"));
  return c.json(list);
});

projectRoutes.post("/:orgId/projects", async c => {
  const body = await c.req.json<{ name: string; teamId?: string }>();
  const project = await service.create({
    orgId: c.req.param("orgId"),
    name: body.name,
    teamId: body.teamId,
  });
  return c.json(project, 201);
});

projectRoutes.get("/:orgId/projects/:projectId", async c => {
  const project = await service.getById(
    c.req.param("orgId"),
    c.req.param("projectId"),
  );
  if (!project) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(project);
});

projectRoutes.patch("/:orgId/projects/:projectId", async c => {
  const body = await c.req.json<{ name?: string; teamId?: string | null }>();
  const project = await service.update(
    c.req.param("orgId"),
    c.req.param("projectId"),
    body,
  );
  if (!project) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(project);
});

projectRoutes.delete("/:orgId/projects/:projectId", async c => {
  const deleted = await service.remove(
    c.req.param("orgId"),
    c.req.param("projectId"),
  );
  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ deleted: true });
});
