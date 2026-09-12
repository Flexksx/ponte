import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../middleware/auth.ts";
import * as service from "./service.ts";

export const teamRoutes = new Hono<AuthEnv>();

teamRoutes.use("/*", requireAuth);

teamRoutes.get("/:orgId/teams", async c => {
  const teams = await service.listByOrg(c.req.param("orgId"));
  return c.json(teams);
});

teamRoutes.post("/:orgId/teams", async c => {
  const body = await c.req.json<{ name: string }>();
  const team = await service.create({
    orgId: c.req.param("orgId"),
    name: body.name,
  });
  return c.json(team, 201);
});

teamRoutes.get("/:orgId/teams/:teamId", async c => {
  const team = await service.getById(
    c.req.param("orgId"),
    c.req.param("teamId"),
  );
  if (!team) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(team);
});

teamRoutes.patch("/:orgId/teams/:teamId", async c => {
  const body = await c.req.json<{ name?: string }>();
  const team = await service.update(
    c.req.param("orgId"),
    c.req.param("teamId"),
    body,
  );
  if (!team) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(team);
});

teamRoutes.delete("/:orgId/teams/:teamId", async c => {
  const deleted = await service.remove(
    c.req.param("orgId"),
    c.req.param("teamId"),
  );
  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ deleted: true });
});

teamRoutes.post("/:orgId/teams/:teamId/members", async c => {
  const body = await c.req.json<{ userId: string }>();
  await service.addMember(c.req.param("teamId"), body.userId);
  return c.json({ added: true }, 201);
});
