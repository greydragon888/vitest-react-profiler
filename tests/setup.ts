import "@testing-library/jest-dom/vitest";
import { afterAll } from "vitest";

// Import custom matchers (must be imported to register with vitest)
import "../src/matchers";

// Import cache metrics for reporting
import { cacheMetrics } from "@/profiler/core/CacheMetrics.ts";

/**
 * Report cache metrics after all tests complete
 *
 * @since v1.6.0 - Phase 1: CacheMetrics implementation
 */
afterAll(() => {
  console.log("\n📊 Cache Performance Metrics:\n");
  console.log(cacheMetrics.report());
  console.log("");
});
