import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.NEON_DATABASE_URL ?? "";

const pool = new Pool({
  connectionString:
    connectionString && !connectionString.includes("sslmode")
      ? `${connectionString}?sslmode=require`
      : connectionString,
});

export const db = drizzle(pool, { schema });
