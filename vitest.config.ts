import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // These hit a real Postgres connection (see tests/helpers/db.ts) — run
    // serially so fixture cleanup in one test can't race another test's setup.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
