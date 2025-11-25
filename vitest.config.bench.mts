import { defineConfig, mergeConfig } from "vitest/config";
import { commonConfig } from "./vitest.config.common.mjs";

/**
 * Vitest configuration for benchmarking
 *
 * Benchmarks measure performance with process isolation for stable results.
 *
 * Extends common config with overrides:
 * - Coverage disabled
 * - Process isolation (forks pool)
 * - Minimal features enabled (globals: false)
 * - Separate setup file for RTL cleanup
 * - Extended timeout (10 minutes)
 * - Single worker for stability
 *
 * @see https://vitest.dev/config/
 */
export default mergeConfig(
  commonConfig,
  defineConfig({
    cacheDir: "./.vitest-bench", // Separate cache for benchmarks

    // Minimal define (benchmarks don't need __TEST__ or __DEV__)
    define: {
      "import.meta.env.BENCHMARK_TESTS": "true", // Enable benchmark metrics
    },

    // Build optimization for benchmarks
    optimizeDeps: {
      force: true, // Force optimization
    },

    // Disable logging for clean results
    logLevel: "error",

    test: {
      // Settings for benchmark stability (Vitest 4+)
      pool: "forks", // Process isolation (OVERRIDE common config's threads)
      isolate: true, // Full isolation

      execArgv: [
        // Node.js flags
        "--expose-gc", // Access to GC
        "--max-old-space-size=4096", // More memory per process
        // "--predictable", // Predictability (optional, slower)
      ],

      // Disable unnecessary features for benchmarks (OVERRIDE common config)
      globals: false,
      clearMocks: false,
      mockReset: false,
      restoreMocks: false,
      unstubEnvs: false,
      unstubGlobals: false,

      // Setup files for benchmarks (OVERRIDE common config)
      setupFiles: ["./tests/setup.bench.ts"], // Includes RTL cleanup

      // Timeouts for long benchmarks
      testTimeout: 600000, // 10 minutes per test
      hookTimeout: 60000, // 1 minute for hooks

      // Only benchmarks
      includeSource: [],
      include: [], // Clear regular tests

      // Benchmark settings
      benchmark: {
        // Reporters
        reporters: ["default"],

        // Output results
        outputJson: "./.bench/results.json",

        // Benchmark paths
        include: [
          "./tests/benchmarks/**/*.bench.ts",
          "./tests/benchmarks/**/*.bench.tsx",
        ],
        exclude: ["node_modules", "dist", "**/*.test.ts"],

        // Result verbosity
        includeSamples: false,
      },

      // Disable coverage for benchmarks
      coverage: {
        enabled: false,
      },

      // Output settings
      reporters: ["basic"], // Minimal output
      outputFile: "./.bench/output.txt",

      // Disable watch for benchmarks
      watch: false,

      // Parallelism
      maxConcurrency: 1, // One test at a time for stability
      maxWorkers: 1, // One worker
    },
  }),
);
