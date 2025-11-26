import { defineConfig, mergeConfig } from "vitest/config";
import { commonConfig } from "./vitest.config.common.mjs";

/**
 * Vitest configuration for unit and integration tests
 *
 * Extends common config with:
 * - Code coverage enabled (95% thresholds)
 * - Includes all tests except property-based and memory tests
 * - Default test timeout (10s)
 * - 4 workers for parallelism
 *
 * @see https://vitest.dev/config/
 */
export default mergeConfig(
  commonConfig,
  defineConfig({
    test: {
      /**
       * Coverage configuration
       * Enabled with strict 95% thresholds
       */
      coverage: {
        enabled: true,
        provider: "v8",
        reporter: [
          ["text", { skipFull: true }],
          "json",
          "json-summary",
          "lcov",
        ],
        reportsDirectory: "./coverage",
        exclude: [
          "**/node_modules/**",
          "**/dist/**",
          "**/coverage/**",
          "**/examples/**",
          "**/tests/**",
          "**/*.config.*",
          "**/*.d.ts",
          "**/*.test.{ts,tsx}",
          "**/*.spec.{ts,tsx}",
          "**/types.ts", // Exclude type definitions
          "**/test-utils/**",
          // Barrel exports (except matchers/index.ts which has logic)
          "**/hooks/index.ts",
          "**/profiler/components/index.ts",
          "**/profiler/core/index.ts",
          "**/profiler/api/index.ts",
          "**/utils/index.ts",
          "**/matchers/sync/index.ts",
          "**/matchers/async/index.ts",
          // Internal debugging/metrics (not production code)
          "**/profiler/core/CacheMetrics.ts",
          "**/profiler/core/constants.ts",
        ],
        thresholds: {
          statements: 95,
          branches: 95,
          functions: 95,
          lines: 95,
        },
      },

      /**
       * Reporter configuration
       */
      reporters: ["default"],

      /**
       * Test filtering
       * Exclude memory-intensive property and memory tests from default run.
       * Run them separately with:
       *   - npm run test:properties (property-based tests)
       */
      include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
      exclude: [
        "node_modules",
        "dist",
        ".idea",
        ".git",
        ".cache",
        "tests/property/**/*.properties.{ts,tsx}",
      ],

      /**
       * Timeout configuration
       * Increase if your components have complex lifecycle or async operations
       */
      testTimeout: 10000,
      hookTimeout: 10000,

      /**
       * Worker configuration (Vitest 4+)
       * Limit parallelism to prevent memory exhaustion
       */
      maxWorkers: 4,

      // Use threads pool for better performance with async tests
      pool: "threads",
    },
  }),
);
