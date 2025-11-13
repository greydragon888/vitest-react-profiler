import { defineConfig, mergeConfig } from "vitest/config";

import { commonConfig } from "./vitest.config.common.mjs";

/**
 * Vitest configuration for Stryker mutation testing
 *
 * Mutation testing runs tests multiple times with code mutations to verify
 * test quality. Optimized for speed and minimal output.
 *
 * Extends common config with overrides:
 * - Process isolation (forks pool)
 * - Minimal reporter (dot)
 * - Optimized timeouts (5s)
 * - Separate cache directory
 *
 * @see https://vitest.dev/config/
 * @see https://stryker-mutator.io/
 */
export default mergeConfig(
  commonConfig,
  defineConfig({
    cacheDir: "./.vitest-stryker",

    test: {
      /**
       * Reporter - minimal for speed
       */
      reporters: ["dot"], // Minimal reporter for speed
      watch: false,

      /**
       * Include test files
       */
      include: ["./tests/**/*.test.ts", "./tests/**/*.test.tsx"],

      /**
       * Optimized timeouts for mutation testing
       */
      testTimeout: 5000, // 5s per test
      hookTimeout: 5000, // 5s per hook

      /**
       * Optimize memory usage (Vitest 4+)
       * Use forks for better isolation during mutation testing
       */
      pool: "forks", // OVERRIDE common config's threads
      isolate: true,
    },
  }),
);
