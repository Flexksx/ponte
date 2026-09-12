import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://ponte:ponte@localhost:5432/ponte";

const client = postgres(DATABASE_URL);

export const db = drizzle(client, { schema });
