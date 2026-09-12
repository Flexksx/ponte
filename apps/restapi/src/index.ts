import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { auth } from "./auth/index.ts";
import { capabilityRoutes } from "./capability/routes.ts";
import { organizationRoutes } from "./organization/routes.ts";
import { projectRoutes } from "./project/routes.ts";
import { teamRoutes } from "./team/routes.ts";

const app = new Hono();

app.use("/*", logger());
app.use(
  "/*",
  cors({
    origin: (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map(o => o.trim()),
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/**", c => {
  return auth.handler(c.req.raw);
});

app.route("/api/orgs", organizationRoutes);
app.route("/api/orgs", teamRoutes);
app.route("/api/orgs", projectRoutes);
app.route("/api/orgs", capabilityRoutes);

app.get("/api/health", c => c.json({ status: "ok" }));

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};
