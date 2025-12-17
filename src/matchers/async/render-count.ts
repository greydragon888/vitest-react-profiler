import { cleanupAndResolve } from "@/helpers";

import {
  createRenderCountTimeoutResult,
  validateAsyncMatcherPrerequisites,
  validateNonNegativeInteger,
} from "./validation";

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
  // Validate prerequisites (component + timeout)
  const validation = validateAsyncMatcherPrerequisites(received, options);

  if (!validation.ok) {
    return validation.error;
  }

  // Validate expected count
  const countError = validateNonNegativeInteger(
    expected,
    "Expected render count",
  );

  if (countError) {
    return countError;
  }

  const { component, timeout } = validation;

  return new Promise((resolve) => {
    // Race condition protection: check if already satisfied
    if (component.getRenderCount() === expected) {
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
      resolve(
        createRenderCountTimeoutResult(
          component,
          expected,
          (actual, summary, details) =>
            `Expected component to eventually render ${expected} times within ${timeout}ms, but got ${actual} (${summary})\n\n${details}`,
        ),
      );
    }, timeout);

    // Subscribe to render events
    const unsubscribe = component.onRender(({ count }) => {
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
  // Validate prerequisites (component + timeout)
  const validation = validateAsyncMatcherPrerequisites(received, options);

  if (!validation.ok) {
    return validation.error;
  }

  // Validate minCount
  const countError = validateNonNegativeInteger(
    minCount,
    "Minimum render count",
  );

  if (countError) {
    return countError;
  }

  const { component, timeout } = validation;

  return new Promise((resolve) => {
    // Race condition protection: check if already satisfied
    if (component.getRenderCount() >= minCount) {
      const actual = component.getRenderCount();

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
      resolve(
        createRenderCountTimeoutResult(
          component,
          minCount,
          (actual, summary, details) =>
            `Expected component to eventually render at least ${minCount} times within ${timeout}ms, but got ${actual} (${summary})\n\n${details}`,
        ),
      );
    }, timeout);

    // Subscribe to render events
    const unsubscribe = component.onRender(({ count }) => {
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
