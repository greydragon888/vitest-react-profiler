/**
 * Safety limits for detecting bugs and preventing memory leaks
 *
 * @packageDocumentation
 * @module profiler/core/constants
 */

/**
 * Maximum number of renders before throwing error (Circuit Breaker)
 *
 * Detects infinite render loops caused by:
 * - useEffect with missing/wrong dependencies
 * - setState called during render
 * - Circular state updates
 *
 * Real-world usage: Most components render < 100 times in tests
 * 10,000 = 100x safety margin
 *
 * Can be overridden via INTERNAL_TESTS flag for benchmarks where
 * the same component is rendered thousands of times across iterations.
 *
 * @internal
 */
export const MAX_SAFE_RENDERS =
  // Stryker disable next-line all
  import.meta.env.BENCHMARK_TESTS === "true" ? 1_000_000 : 10_000;

/**
 * Maximum number of event listeners before throwing error (Memory Leak Detection)
 *
 * Detects memory leaks caused by:
 * - Forgot to call unsubscribe() in useEffect cleanup
 * - Listeners added in render function instead of useEffect
 * - Component remounting repeatedly without cleanup
 *
 * Real-world usage: 1-5 listeners per component
 * 100 = 20x-100x safety margin
 *
 * @internal
 */
export const MAX_LISTENERS = 100;
