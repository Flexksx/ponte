import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./connection.ts";

await migrate(db, { migrationsFolder: "./drizzle" });

console.log("Migrations complete.");
process.exit(0);
