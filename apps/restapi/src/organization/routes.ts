import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../middleware/auth.ts";
import * as service from "./service.ts";

export const organizationRoutes = new Hono<AuthEnv>();

organizationRoutes.use("/*", requireAuth);

organizationRoutes.get("/", async c => {
  const session = c.get("session");
  const orgs = await service.listForUser(session.user.id);
  return c.json(orgs);
});

organizationRoutes.post("/", async c => {
  const session = c.get("session");
  const body = await c.req.json<{ name: string; slug: string }>();
  const org = await service.createWithOwner(body, session.user.id);
  return c.json(org, 201);
});

organizationRoutes.get("/:id", async c => {
  const org = await service.getById(c.req.param("id"));
  if (!org) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(org);
});

organizationRoutes.patch("/:id", async c => {
  const body = await c.req.json<{ name?: string; slug?: string }>();
  const org = await service.update(c.req.param("id"), body);
  if (!org) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(org);
});

organizationRoutes.delete("/:id", async c => {
  const deleted = await service.remove(c.req.param("id"));
  if (!deleted) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({ deleted: true });
});
