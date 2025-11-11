// vitest.config.bench.mts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test-utils": path.resolve(__dirname, "./src/test-utils"),
      "@components": path.resolve(__dirname, "./src/components"),
    },
  },

  cacheDir: "./.vitest-bench", // Separate cache for benchmarks
  test: {
    // Settings for benchmark stability (Vitest 4+)
    pool: "forks", // Process isolation
    isolate: true, // Full isolation
    execArgv: [
      // Node.js flags
      "--expose-gc", // Access to GC
      "--max-old-space-size=4096", // More memory per process
      // "--predictable", // Predictability (optional, slower)
    ],

    // Disable unnecessary features for benchmarks
    globals: false,
    environment: "jsdom", // Need jsdom for React components
    clearMocks: false,
    mockReset: false,
    restoreMocks: false,
    unstubEnvs: false,
    unstubGlobals: false,

    // Timeouts for long benchmarks
    testTimeout: 600000, // 10 minutes per test
    hookTimeout: 60000, // 1 minute for hooks

    // Only benchmarks
    includeSource: [],
    include: [], // Clear regular tests

    // Setup files for benchmarks (includes RTL cleanup)
    setupFiles: ["./tests/setup.bench.ts"],

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

  // Define global constants for benchmarks
  define: {
    "import.meta.env.INTERNAL_TESTS": "true", // Enable internal metrics for benchmarks
  },

  // Build optimization for benchmarks
  optimizeDeps: {
    force: true, // Force optimization
  },

  // Disable logging for clean results
  logLevel: "error",
});
