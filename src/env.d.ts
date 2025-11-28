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
  /**
   * Development/test mode flag
   *
   * - `true`: Development/test mode - enables CacheMetrics and internal logging
   * - `false`: Production mode - code is tree-shaken out
   *
   * @internal
   */
  const __DEV__: boolean;
}

// Make this a module (required for global augmentation)
export {};
