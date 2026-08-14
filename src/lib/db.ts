import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function db() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const client = postgres(connectionString, { max: 1, prepare: false });
  database = drizzle(client, { schema });
  return database;
}
