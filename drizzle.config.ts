import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Neon terminates every connection over TLS.
    url: url && !url.includes("sslmode") ? `${url}?sslmode=require` : url,
  },
});
