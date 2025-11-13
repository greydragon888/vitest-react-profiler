import { defineConfig, mergeConfig } from "vitest/config";
import { commonConfig } from "./vitest.config.common.mjs";

/**
 * Vitest configuration for memory leak testing
 *
 * Memory tests verify garbage collection using jest-leak-detector.
 * They require --expose-gc flag (passed via npm script) and longer timeouts.
 *
 * Extends common config with:
 * - Coverage disabled (focus on GC, not coverage)
 * - Extended timeout (60s for multiple GC cycles)
 * - Reduced workers (2 to prevent memory pressure)
 * - Verbose reporter
 *
 * @see https://vitest.dev/config/
 * @see https://www.npmjs.com/package/jest-leak-detector
 */
export default mergeConfig(
  commonConfig,
  defineConfig({
    test: {
      /**
       * Coverage configuration - disabled for memory tests
       * Memory tests focus on garbage collection, not code coverage
       */
      coverage: {
        enabled: false,
      },

      /**
       * Reporter configuration - verbose for detailed GC info
       */
      reporters: ["verbose"],

      /**
       * Test filtering - only memory tests
       */
      include: ["tests/memory/**/*.test.{ts,tsx}"],
      exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],

      /**
       * Timeout configuration
       * Memory tests require longer timeouts due to:
       * - Multiple GC cycles (10 cycles × 200ms = 2s per test minimum)
       * - Large-scale renders (1000-2000 renders)
       * - LeakDetector async verification
       */
      testTimeout: 60000, // 60 seconds per test
      hookTimeout: 10000, // 10 seconds for hooks
      teardownTimeout: 10000, // 10 seconds for cleanup

      /**
       * Worker configuration (Vitest 4+)
       * Limit parallelism to prevent memory pressure interference
       * between concurrent memory tests
       */
      maxWorkers: 2, // Reduced parallelism for memory tests
      pool: "threads",

      /**
       * NOTE: --expose-gc flag is passed via npm script:
       * "test:memory": "node --expose-gc node_modules/.bin/vitest ..."
       *
       * We don't use execArgv here because:
       * 1. npm script already passes --expose-gc to Node
       * 2. Avoids duplication and potential conflicts
       */
    },
  }),
);
