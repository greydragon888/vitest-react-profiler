import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for Stryker mutation testing
 */
export default defineConfig({
  cacheDir: "./.vitest-stryker",

  // Path aliases (required for tests to resolve @/ imports)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  test: {
    clearMocks: true,
    globals: true,
    environment: "jsdom",
    reporters: ["dot"], // Minimal reporter for speed
    watch: false,

    // Setup files to load jest-dom matchers
    setupFiles: ["./tests/setup.ts"],

    // Optimized timeouts
    testTimeout: 5000, // 5s per test
    hookTimeout: 5000, // 5s per hook

    // Include test files
    include: ["./tests/**/*.test.ts", "./tests/**/*.test.tsx"],

    // Optimize memory usage
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
      },
    },
  },
});
