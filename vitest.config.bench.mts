// vitest.config.bench.mts
import { defineConfig } from "vitest/config";
import path from "path";

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
    // Settings for benchmark stability
    pool: "forks", // Process isolation
    poolOptions: {
      forks: {
        singleFork: true, // One test per process
        isolate: true, // Full isolation
        execArgv: [
          // Node.js flags
          "--expose-gc", // Access to GC
          "--max-old-space-size=4096", // More memory
          // "--predictable", // Predictability (optional, slower)
        ],
      },
    },

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

    // Setup files for React Testing Library
    setupFiles: ["./tests/setup.ts"],

    // Benchmark settings
    benchmark: {
      // Reporters
      reporters: ["default"],

      // Output results
      outputJson: "./.bench/results.json",
      // compare: "./.bench/baseline.json", // Comparison file

      // Benchmark paths
      include: ["./benchmarks/**/*.bench.ts", "./benchmarks/**/*.bench.tsx"],
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

  // Build optimization for benchmarks
  optimizeDeps: {
    force: true, // Force optimization
  },

  // Disable logging for clean results
  logLevel: "error",
});
