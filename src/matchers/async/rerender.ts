import { cleanupAndResolve } from "@/helpers";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import {
  validateAsyncMatcherPrerequisites,
  validateNonNegativeInteger,
} from "./validation";

import type { WaitOptions, MatcherResult } from "@/matchers/types";

/**
 * Helper function for pluralization of "time"/"times"
 */
const pluralTimes = (n: number): string => (n === 1 ? "time" : "times");

/**
 * Wait for component to rerender after snapshot() (async)
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param options - Wait options (timeout only, no interval)
 * @returns Promise with matcher result
 *
 * @since v1.11.0
 *
 * @example
 * ProfiledComponent.snapshot();
 * triggerAsyncUpdate();
 * await expect(ProfiledComponent).toEventuallyRerender();
 *
 * @example
 * await expect(ProfiledComponent).toEventuallyRerender({ timeout: 5000 });
 */
export async function toEventuallyRerender(
  received: unknown,
  options?: WaitOptions,
): Promise<MatcherResult> {
  // Validate prerequisites (component + timeout)
  const validation = validateAsyncMatcherPrerequisites(received, options);

  if (!validation.ok) {
    return validation.error;
  }

  const { component, timeout } = validation;

  return new Promise((resolve) => {
    // Race condition protection: check if already rerendered
    const initialCount = component.getRendersSinceSnapshot();

    if (initialCount >= 1) {
      const times = initialCount === 1 ? "time" : "times";

      resolve({
        pass: true,
        message: () =>
          `Expected component not to rerender after snapshot within ${timeout}ms, but it rerendered ${initialCount} ${times}`,
        actual: initialCount,
        // Stryker disable next-line StringLiteral
        expected: "≥1",
      });

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();

      const history = component.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      resolve({
        pass: false,
        message: () =>
          `Expected component to rerender after snapshot within ${timeout}ms, but it did not\n\n${details}`,
        actual: 0,
        // Stryker disable next-line StringLiteral
        expected: "≥1",
      });
    }, timeout);

    // Subscribe to render events
    // Note: When this callback fires, currentCount will always be 1 because:
    // - Initial check passed (count was 0)
    // - This is the first onRender callback (we clean up immediately after)
    // The plural case (count > 1) is only reachable via the initial check above
    const unsubscribe = component.onRender(() => {
      cleanupAndResolve(timeoutId, unsubscribe, resolve, {
        pass: true,
        message: () =>
          `Expected component not to rerender after snapshot within ${timeout}ms, but it rerendered 1 time`,
        actual: 1,
        // Stryker disable next-line StringLiteral
        expected: "≥1",
      });
    });
  });
}

/**
 * Wait for exact number of rerenders after snapshot() (async)
 *
 * Uses event-based approach with onRender() for instant notification.
 * No polling overhead - resolves immediately when condition is met.
 * Fails early if count exceeds expected (doesn't wait for timeout).
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param expected - Expected number of rerenders
 * @param options - Wait options (timeout only, no interval)
 * @returns Promise with matcher result
 *
 * @since v1.11.0
 *
 * @example
 * ProfiledComponent.snapshot();
 * triggerMultipleAsyncUpdates();
 * await expect(ProfiledComponent).toEventuallyRerenderTimes(3);
 *
 * @example
 * await expect(ProfiledComponent).toEventuallyRerenderTimes(5, { timeout: 5000 });
 */
export async function toEventuallyRerenderTimes(
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
    "Expected rerender count",
  );

  if (countError) {
    return countError;
  }

  const { component, timeout } = validation;

  return new Promise((resolve) => {
    const actual = component.getRendersSinceSnapshot();

    // Already met condition
    if (actual === expected) {
      resolve({
        pass: true,
        message: () =>
          `Expected component not to rerender ${expected} ${pluralTimes(expected)} after snapshot within ${timeout}ms, but it did`,
        actual,
        expected,
      });

      return;
    }

    // Already exceeded - early failure
    // Stryker disable next-line EqualityOperator
    if (actual > expected) {
      const history = component.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      resolve({
        pass: false,
        message: () =>
          `Expected component to rerender ${expected} ${pluralTimes(expected)} after snapshot, but already got ${actual} ${pluralTimes(actual)} (exceeded)\n\n${details}`,
        actual,
        expected,
      });

      return;
    }

    // Setup timeout
    const timeoutId = setTimeout(() => {
      unsubscribe();

      const finalActual = component.getRendersSinceSnapshot();
      const history = component.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      resolve({
        pass: false,
        message: () =>
          `Expected component to rerender ${expected} ${pluralTimes(expected)} after snapshot within ${timeout}ms, but got ${finalActual} ${pluralTimes(finalActual)}\n\n${details}`,
        actual: finalActual,
        expected,
      });
    }, timeout);

    // Subscribe to render events
    const unsubscribe = component.onRender(() => {
      const currentCount = component.getRendersSinceSnapshot();

      if (currentCount === expected) {
        cleanupAndResolve(timeoutId, unsubscribe, resolve, {
          pass: true,
          message: () =>
            `Expected component not to rerender ${expected} ${pluralTimes(expected)} after snapshot within ${timeout}ms, but it did`,
          actual: currentCount,
          expected,
        });
      }
      // Note: We don't check currentCount > expected here because onRender
      // fires for each render sequentially, so we always hit === expected
      // before > expected. The "exceeded" case is handled by the initial check.
    });
  });
}
