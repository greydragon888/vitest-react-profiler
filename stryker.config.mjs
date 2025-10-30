/**
 * ✨ Mutation testing configuration for vitest-react-profiler
 *
 * Configuration includes:
 * ✅ Vitest runner + perTest coverage
 * ✅ TypeScript checker for mutation validation
 * ✅ Incremental mode for caching results
 * ✅ HTML reports for mutation coverage analysis
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
export default {
  packageManager: "npm",
  testRunner: "vitest",
  checkers: ["typescript"],

  // Mutate all sources except barrel exports, types and constants
  mutate: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/index.ts", // Barrel export - skip
    "!src/types.ts", // Type definitions - skip
  ],

  // Vitest runner with optimized configuration
  vitest: {
    configFile: "vitest.stryker.config.mts",
    related: false, // Disable related test detection (barrel export issue)
  },

  // ✨ CRITICAL: "perTest" is ignored for Vitest, but kept for compatibility
  // Workspace dependencies work via absolute paths in vitest.stryker.config.mts
  coverageAnalysis: "perTest",

  // Local tsconfig
  tsconfigFile: "tsconfig.json",

  // Mutation score thresholds
  thresholds: {
    high: 90, // Plugin complexity - moderate threshold
    low: 70,
    break: 60,
  },

  // Performance settings
  concurrency: 2, // 2 parallel processes
  timeoutMS: 10000, // 10s (tests are fast)
  timeoutFactor: 3, // 3x safety margin

  // Reporters
  reporters: ["progress", "clear-text", "html", "dashboard"],
  htmlReporter: {
    fileName: "reports/mutation-report.html",
  },
  dashboard: {
    project: "github.com/greydragon888/vitest-react-profiler",
    version: "master",
    module: "vitest-react-profiler",
  },

  // ⚠️ CRITICAL: DO NOT exclude tests/ - they are needed in sandbox!
  ignorePatterns: [
    "dist",
    "coverage",
    "node_modules",
    ".turbo",
    ".vitest",
    ".bench",
    // ❌ DO NOT ADD "tests/**" - tests MUST be in sandbox!
  ],

  // Incremental mode (cache results)
  incremental: true,
  incrementalFile: ".stryker-tmp/incremental.json",

  // Clean temp dir between runs
  cleanTempDir: true,

  // 🎯 Strict type checking for each mutant
  disableTypeChecks: false,
  maxTestRunnerReuse: 0, // Fresh runner for each mutant
};
