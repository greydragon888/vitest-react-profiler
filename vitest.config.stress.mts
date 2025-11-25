import { defineConfig, mergeConfig } from "vitest/config";
import { commonConfig } from "./vitest.config.common.mjs";

/**
 * Vitest configuration for stress testing and memory profiling
 *
 * Stress tests measure memory consumption, GC behavior, and performance
 * under extreme loads using V8 heap statistics and PerformanceObserver.
 *
 * Extends common config with overrides:
 * - Coverage disabled (stress tests don't contribute to coverage metrics)
 * - Process isolation (forks pool for accurate memory measurements)
 * - Extended timeout (60s for GC profiling operations)
 * - Verbose reporter (detailed output for memory analysis)
 * - --expose-gc flag (enables manual GC triggering)
 *
 * Usage:
 *   npm run test:stress
 *
 * @see https://vitest.dev/config/
 * @see https://nodejs.org/en/learn/diagnostics/memory/using-gc-traces
 */
export default mergeConfig(
  commonConfig,
  defineConfig({
    cacheDir: "./.vitest-stress", // Separate cache for stress tests

    // Stress tests use normal MAX_SAFE_RENDERS (10,000) to test real limits
    // Only benchmarks need high limit via INTERNAL_TESTS flag
    define: {
      "import.meta.env.INTERNAL_TESTS": "false", // Disable to use real MAX_SAFE_RENDERS=10,000
    },

    // Disable logging for clean memory measurements
    logLevel: "warn",

    test: {
      // Process isolation for accurate memory measurements (Vitest 4+)
      pool: "forks", // OVERRIDE common config's threads
      isolate: true, // Full isolation per test file

      execArgv: [
        // Node.js flags for GC profiling
        "--expose-gc", // Access to globalThis.gc()
        "--max-old-space-size=8192", // 8 GB heap limit for large tests
      ],

      // Disable unnecessary features for stress tests (OVERRIDE common config)
      globals: false,
      clearMocks: false,
      mockReset: false,
      restoreMocks: false,
      unstubEnvs: false,
      unstubGlobals: false,

      // Setup files for stress tests (OVERRIDE common config)
      setupFiles: ["./tests/setup.ts"], // Standard RTL setup

      // Extended timeouts for GC profiling operations
      testTimeout: 60000, // 60 seconds per test
      hookTimeout: 10000, // 10 seconds for hooks

      // Only stress tests
      include: [
        "./tests/stress/**/*.stress.ts",
        "./tests/stress/**/*.stress.tsx",
      ],
      exclude: [
        "node_modules",
        "dist",
        "**/node_modules/**",
        "**/*.bench.ts",
        "**/*.bench.tsx",
        "**/*.properties.tsx",
      ],

      // Disable coverage for stress tests
      coverage: {
        enabled: false,
      },

      // Verbose reporter for detailed memory analysis
      reporters: ["verbose"],

      // Output settings
      outputFile: "./.vitest-stress/output.txt",

      // Disable watch for stress tests
      watch: false,

      // Parallelism: sequential execution for stable memory measurements
      maxConcurrency: 1, // One test at a time
      maxWorkers: 1, // Single worker for memory stability
    },
  }),
);
