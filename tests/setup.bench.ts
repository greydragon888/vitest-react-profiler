import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeEach } from "vitest";

// Import custom matchers (must be imported to register with vitest)
import "../src/matchers";

// Import cache metrics for reporting
import { cacheMetrics } from "@/profiler/core/CacheMetrics.ts";

/**
 * Setup file for benchmarks
 *
 * CRITICAL: Benchmarks need RTL cleanup() to prevent memory leaks
 * Unlike regular tests, benchmarks run thousands of iterations and accumulate
 * massive amounts of DOM nodes in JSDOM if not cleaned up properly.
 *
 * Without cleanup():
 * - 5 benchmark files × 2000 iterations × 100 renders = 1,000,000+ DOM nodes
 * - Causes GC pressure, high RME variance (±20-40%), and OOM crashes
 *
 * GC strategy:
 * - beforeEach: Force GC to start with clean memory state
 * - afterEach: cleanup() to remove DOM nodes, then force GC
 * - Requires --expose-gc flag in NODE_OPTIONS
 *
 * @since v1.6.0 - Benchmark stabilization
 */
beforeEach(() => {
  if (globalThis.gc) {
    globalThis.gc(); // Force garbage collection before each benchmark
  }
});

afterEach(() => {
  cleanup(); // Clear React Testing Library DOM nodes

  if (globalThis.gc) {
    globalThis.gc(); // Force garbage collection after cleanup
  }
});

/**
 * Report cache metrics after all benchmarks complete
 *
 * @since v1.6.0 - Phase 1: CacheMetrics implementation
 */
afterAll(() => {
  console.log("\n📊 Cache Performance Metrics:\n");
  console.log(cacheMetrics.report());
  console.log("");
});
