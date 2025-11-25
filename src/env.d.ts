/**
 * Internal environment type definitions
 *
 * These types are used internally during development and testing.
 * They are NOT exported to library consumers.
 *
 * @internal
 * @since v1.6.0
 */

declare global {
  interface ImportMetaEnv {
    /**
     * Flag to enable internal testing metrics collection.
     *
     * - `true`: Metrics are collected (internal tests, benchmarks)
     * - `false`: Metrics code is tree-shaken out (production build)
     *
     * @internal
     */
    readonly INTERNAL_TESTS: "true" | "false";
    /**
     * Flag
     *
     * @internal
     */
    readonly BENCHMARK_TESTS: "true" | "false";
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Make this a module (required for global augmentation)
export {};
