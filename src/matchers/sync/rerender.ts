import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";

/**
 * Assert that component rerendered after snapshot()
 *
 * Without argument: checks at least 1 rerender occurred.
 * With argument: checks exact number of rerenders.
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param expected - Optional expected count (undefined = at least 1)
 * @returns Matcher result
 * @example
 * // At least one rerender
 * ProfiledComponent.snapshot();
 * triggerAction();
 * expect(ProfiledComponent).toHaveRerendered();
 *
 * @example
 * // Exact count
 * ProfiledComponent.snapshot();
 * triggerMultipleUpdates();
 * expect(ProfiledComponent).toHaveRerendered(3);
 * @since v1.11.0
 */
export function toHaveRerendered(
  received: unknown,
  expected?: number,
): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const actual = received.getRendersSinceSnapshot();

  // Case 1: No argument - check >= 1 (at least one rerender)
  if (expected === undefined) {
    const pass = actual >= 1;

    return {
      pass,
      message: () => {
        if (pass) {
          const times = actual === 1 ? "time" : "times";

          return `Expected component not to rerender after snapshot, but it rerendered ${actual} ${times}`;
        }

        return `Expected component to rerender after snapshot, but it did not`;
      },
      actual,
      // Stryker disable next-line StringLiteral
      expected: "≥1",
    };
  }

  // Case 2: Validate expected parameter
  // Note: Number.isInteger() returns false for all non-numbers, so typeof check is redundant
  if (!Number.isInteger(expected) || expected < 0) {
    return {
      pass: false,
      message: () =>
        `Invalid expected value: ${String(expected)}. Must be a non-negative integer.`,
    };
  }

  // Case 3: Exact count check
  const pass = actual === expected;

  return {
    pass,
    message: () => {
      if (pass) {
        const times = expected === 1 ? "time" : "times";

        return `Expected component not to rerender ${expected} ${times} after snapshot, but it did`;
      }

      // Show render history for debugging
      const history = received.getRenderHistory();
      const details = formatRenderHistory(history, 10);
      const actualTimes = actual === 1 ? "time" : "times";
      const expectedTimes = expected === 1 ? "time" : "times";

      return `Expected component to rerender ${expected} ${expectedTimes} after snapshot, but it rerendered ${actual} ${actualTimes}\n\n${details}`;
    },
    actual,
    expected,
  };
}

/**
 * Assert that component rerendered exactly once since snapshot()
 *
 * @param received - The component to check (must be created with withProfiler)
 * @returns Matcher result
 * @example
 * ProfiledComponent.snapshot();
 * rerender(<ProfiledComponent newProp={value} />);
 * expect(ProfiledComponent).toHaveRerenderedOnce();
 */
export function toHaveRerenderedOnce(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const rendersSinceSnapshot = received.getRendersSinceSnapshot();
  const pass = rendersSinceSnapshot === 1;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected component not to rerender after snapshot, but it rerendered once`;
      }

      if (rendersSinceSnapshot === 0) {
        return `Expected component to rerender once after snapshot, but it did not rerender`;
      }

      // Show render history for debugging
      const history = received.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      return `Expected component to rerender once after snapshot, but it rerendered ${rendersSinceSnapshot} times\n\n${
        details
      }`;
    },
    actual: rendersSinceSnapshot,
    expected: 1,
  };
}

/**
 * Assert that component did not rerender since snapshot()
 *
 * @param received - The component to check (must be created with withProfiler)
 * @returns Matcher result
 * @example
 * ProfiledComponent.snapshot();
 * updateUnrelatedState();
 * expect(ProfiledComponent).toNotHaveRerendered();
 */
export function toNotHaveRerendered(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const rendersSinceSnapshot = received.getRendersSinceSnapshot();
  const pass = rendersSinceSnapshot === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected component to rerender after snapshot, but it did not`;
      }

      // Show render history for debugging
      const history = received.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      const times = rendersSinceSnapshot === 1 ? "time" : "times";

      return `Expected component not to rerender after snapshot, but it rerendered ${rendersSinceSnapshot} ${times}\n\n${
        details
      }`;
    },
    actual: rendersSinceSnapshot,
    expected: 0,
  };
}
