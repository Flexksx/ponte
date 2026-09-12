import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/connection.ts";
import * as schema from "../db/schema.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: (process.env.TRUSTED_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map(o => o.trim()),
});
