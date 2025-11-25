import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Common Vitest configuration shared across all test types
 *
 * This base configuration contains settings that are common to:
 * - Unit/Integration tests (vitest.config.unit.mts)
 * - Property-based tests (vitest.config.properties.mts)
 * - Benchmarks (vitest.config.bench.mts)
 * - Mutation testing (vitest.stryker.config.mts)
 *
 * Specialized configs extend this using mergeConfig() and override specific settings.
 *
 * @see https://vitest.dev/config/
 */
export const commonConfig = defineConfig({
  /**
   * Path aliases for imports
   * Used across all test types to resolve @/ imports
   */
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test-utils": path.resolve(__dirname, "./src/test-utils"),
      "@components": path.resolve(__dirname, "./src/components"),
    },
  },

  /**
   * Global constants available in all tests
   * These enable internal metrics and debugging features
   */
  define: {
    __TEST__: true,
    __DEV__: process.env.NODE_ENV !== "production",
    "import.meta.env.INTERNAL_TESTS": "true", // Enable CacheMetrics and internal logging
  },

  /**
   * Test configuration
   */
  test: {
    /**
     * Test environment - jsdom required for React components
     */
    environment: "jsdom",

    /**
     * Setup files to run before tests
     * Loads jest-dom matchers and React Testing Library cleanup
     */
    setupFiles: ["./tests/setup.ts"],

    /**
     * Enable global test APIs (describe, it, expect)
     * Without this, you need to import from 'vitest' in each test file
     */
    globals: true,

    /**
     * Test isolation settings
     * Clear mocks and restore mocked functions after each test
     */
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,

    /**
     * Run tests in isolation for accurate profiling
     * Each test gets a fresh environment
     */
    isolate: true,

    /**
     * Base exclude patterns
     * Specialized configs can extend this list
     */
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
  },
});
