import { cleanupAndResolve } from "@/helpers";
import { isProfiledComponent } from "@/matchers/type-guards";
import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory";

import type { WaitOptions, MatcherResult } from "@/matchers/types";

/**
 * Assert that component eventually renders exact number of times (async)
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param expected - Expected number of renders
 * @param options - Wait options (timeout only, no interval)
 * @returns Promise with matcher result
 *
 * @since v1.6.0 - Rewritten to use event-based approach (no polling)
 *
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

  const { timeout = 1000 } = options ?? {};

  if (!Number.isFinite(timeout) || timeout <= 0) {
    return {
      pass: false,
      message: () =>
        `Expected timeout to be a positive number, received ${timeout}`,
    };
  }

  return new Promise((resolve) => {
    // Race condition protection: check if already satisfied
    if (received.getRenderCount() === expected) {
      resolve({
        pass: true,
        message: () =>
          `Expected component not to eventually render ${expected} times within ${timeout}ms, but it did`,
        actual: expected,
        expected,
      });

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();

      const actual = received.getRenderCount();
      const history = received.getRenderHistory();
      const summary = formatRenderSummary(history);
      const details = formatRenderHistory(history, 10);

      resolve({
        pass: false,
        message: () =>
          `Expected component to eventually render ${expected} times within ${timeout}ms, but got ${actual} (${summary})\n\n${details}`,
        actual,
        expected,
      });
    }, timeout);

    // Subscribe to render events
    const unsubscribe = received.onRender(({ count }) => {
      if (count === expected) {
        cleanupAndResolve(timeoutId, unsubscribe, resolve, {
          pass: true,
          message: () =>
            `Expected component not to eventually render ${expected} times within ${timeout}ms, but it did`,
          actual: count,
          expected,
        });
      }
    });
  });
}

/**
 * Assert that component eventually renders at least N times (async)
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param minCount - Minimum expected number of renders
 * @param options - Wait options (timeout only, no interval)
 * @returns Promise with matcher result
 *
 * @since v1.6.0 - Rewritten to use event-based approach (no polling)
 *
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

  const { timeout = 1000 } = options ?? {};

  if (!Number.isFinite(timeout) || timeout <= 0) {
    return {
      pass: false,
      message: () =>
        `Expected timeout to be a positive number, received ${timeout}`,
    };
  }

  return new Promise((resolve) => {
    // Race condition protection: check if already satisfied
    if (received.getRenderCount() >= minCount) {
      const actual = received.getRenderCount();

      resolve({
        pass: true,
        message: () =>
          `Expected component not to eventually render at least ${minCount} times within ${timeout}ms, but it rendered ${actual} times`,
        actual,
        expected: minCount,
      });

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();

      const actual = received.getRenderCount();
      const history = received.getRenderHistory();
      const summary = formatRenderSummary(history);
      const details = formatRenderHistory(history, 10);

      resolve({
        pass: false,
        message: () =>
          `Expected component to eventually render at least ${minCount} times within ${timeout}ms, but got ${actual} (${summary})\n\n${details}`,
        actual,
        expected: minCount,
      });
    }, timeout);

    // Subscribe to render events
    const unsubscribe = received.onRender(({ count }) => {
      if (count >= minCount) {
        cleanupAndResolve(timeoutId, unsubscribe, resolve, {
          pass: true,
          message: () =>
            `Expected component not to eventually render at least ${minCount} times within ${timeout}ms, but it rendered ${count} times`,
          actual: count,
          expected: minCount,
        });
      }
    });
  });
}
