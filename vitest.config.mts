import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Vitest configuration with React Profiler testing support
 *
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test-utils": path.resolve(__dirname, "./src/test-utils"),
      "@components": path.resolve(__dirname, "./src/components"),
    },
  },

  test: {
    /**
     * Test environment configuration
     */
    environment: "jsdom",

    /**
     * Setup files to run before tests
     * This loads jest-dom matchers
     */
    setupFiles: ["./tests/setup.ts"],

    /**
     * Enable global test APIs (describe, it, expect)
     * Without this, you need to import from 'vitest' in each test file
     */
    globals: true,

    /**
     * Coverage configuration
     */
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: [["text", { skipFull: true }], "json", "json-summary", "lcov"],
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
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },

    /**
     * Test isolation settings
     * Clear mocks and restore mocked functions after each test
     */
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    /**
     * Performance settings
     */
    isolate: true, // Run tests in isolation for accurate profiling

    /**
     * Reporter configuration
     */
    reporters: ["default"],

    /**
     * Test filtering
     * Exclude memory-intensive stress and property tests from default run.
     * Run them separately with: npm run test:stress or npm run test:properties
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
    // Limit number of concurrent workers to reduce memory usage
    maxWorkers: 4,

    // Use threads pool for better performance with async tests
    pool: "threads",
  },

  /**
   * Define global constants
   */
  define: {
    __TEST__: true,
    __DEV__: process.env.NODE_ENV !== "production",
    "import.meta.env.INTERNAL_TESTS": "true", // Enable internal metrics for tests
  },
});
