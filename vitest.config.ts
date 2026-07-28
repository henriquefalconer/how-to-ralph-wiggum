import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/env.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Tests hit the real Neon DB (no mocks). Each test file gets its own
    // connection pool, and running files concurrently causes enough
    // serverless cold-start contention to blow past a short timeout —
    // run files one at a time and give queries generous headroom.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@sdk": path.resolve(__dirname, "./packages/sdk/src"),
    },
  },
});
