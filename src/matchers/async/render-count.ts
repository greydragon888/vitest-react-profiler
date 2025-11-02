import { isProfiledComponent } from "@/matchers/type-guards.ts";
import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory.ts";

import type { WaitOptions, MatcherResult } from "@/matchers/types.ts";

/**
 * Assert that component eventually renders exact number of times (async)
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param expected - Expected number of renders
 * @param options - Wait options
 * @returns Promise with matcher result
 * @example
 * await expect(ProfiledComponent).toEventuallyRenderTimes(3)
 * await expect(ProfiledComponent).toEventuallyRenderTimes(5, { timeout: 2000 })
 */
export async function toEventuallyRenderTimes(
  received: unknown,
  expected: number,
  options?: WaitOptions,
): Promise<MatcherResult> {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  if (!Number.isInteger(expected) || expected < 0) {
    return {
      pass: false,
      message: () =>
        `Expected render count must be a non-negative integer, received ${expected}`,
    };
  }

  const { timeout = 1000, interval = 50 } = options ?? {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const actual = received.getRenderCount();

    if (actual === expected) {
      return {
        pass: true,
        message: () =>
          `Expected component not to eventually render ${expected} times within ${timeout}ms, but it did`,
        actual,
        expected,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const actual = received.getRenderCount();
  const history = received.getRenderHistory();
  const summary = formatRenderSummary(history);
  const details = formatRenderHistory(history, 10);

  return {
    pass: false,
    message: () =>
      `Expected component to eventually render ${expected} times within ${timeout}ms, but got ${actual} (${summary})\n\n${details}`,
    actual,
    expected,
  };
}

/**
 * Assert that component eventually renders at least N times (async)
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param minCount - Minimum expected number of renders
 * @param options - Wait options
 * @returns Promise with matcher result
 * @example
 * await expect(ProfiledComponent).toEventuallyRenderAtLeast(2)
 * await expect(ProfiledComponent).toEventuallyRenderAtLeast(3, { timeout: 2000 })
 */
export async function toEventuallyRenderAtLeast(
  received: unknown,
  minCount: number,
  options?: WaitOptions,
): Promise<MatcherResult> {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  if (!Number.isInteger(minCount) || minCount < 0) {
    return {
      pass: false,
      message: () =>
        `Minimum render count must be a non-negative integer, received ${minCount}`,
    };
  }

  const { timeout = 1000, interval = 50 } = options ?? {};
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const actual = received.getRenderCount();

    if (actual >= minCount) {
      return {
        pass: true,
        message: () =>
          `Expected component not to eventually render at least ${minCount} times within ${timeout}ms, but it rendered ${actual} times`,
        actual,
        expected: minCount,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  const actual = received.getRenderCount();
  const history = received.getRenderHistory();
  const summary = formatRenderSummary(history);
  const details = formatRenderHistory(history, 10);

  return {
    pass: false,
    message: () =>
      `Expected component to eventually render at least ${minCount} times within ${timeout}ms, but got ${actual} (${summary})\n\n${details}`,
    actual,
    expected: minCount,
  };
}
