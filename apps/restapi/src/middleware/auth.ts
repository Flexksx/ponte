import type { Context, Next } from "hono";
import { auth } from "../auth/index.ts";

export type AuthSession = {
  user: { id: string; name: string; email: string };
  session: { id: string };
};

export type AuthEnv = {
  Variables: {
    session: AuthSession;
  };
};

export const requireAuth = async (c: Context<AuthEnv>, next: Next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("session", session as AuthSession);
  return next();
};
