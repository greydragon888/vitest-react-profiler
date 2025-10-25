import { defineConfig } from "vitest/config";

/**
 * Vitest configuration with React Profiler testing support
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  test: {
    /**
     * Test environment configuration
     */
    environment: "jsdom",

    /**
     * Setup files to run before tests
     * This loads our custom matchers and automatic cleanup
     */
    // setupFiles: ["./src/test-utils/setup.ts"],

    /**
     * Enable global test APIs (describe, it, expect)
     * Without this, you need to import from 'vitest' in each test file
     */
    globals: true,

    /**
     * Coverage configuration
     */
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "examples/",
        "tests/",
        "*.config.*",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/index.ts", // Exclude barrel exports
        "**/types.ts", // Exclude type definitions
        "src/test-utils/",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      clean: true,
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
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
     */
    include: ["tests/**/*.test.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],

    /**
     * Timeout configuration
     * Increase if your components have complex lifecycle or async operations
     */
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  /**
   * Define global constants
   */
  define: {
    __TEST__: true,
    __DEV__: process.env.NODE_ENV !== "production",
  },
});
