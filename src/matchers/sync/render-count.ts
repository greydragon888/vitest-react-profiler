import { isProfiledComponent } from "@/matchers/type-guards.ts";
import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory.ts";

import type { MatcherResult } from "@/matchers/types.ts";

/**
 * Assert that component has rendered at least once
 *
 * @param received - The component to check
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveRendered()
 */
export function toHaveRendered(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const renders = received.getRenderCount();

  return {
    pass: renders > 0,
    message: () =>
      renders > 0
        ? `Expected component not to render, but it rendered ${renders} time(s)`
        : `Expected component to render at least once, but it never rendered`,
  };
}

/**
 * Assert exact number of renders
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param expected - Expected number of renders
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveRenderedTimes(3)
 */
export function toHaveRenderedTimes(
  received: unknown,
  expected: number,
): MatcherResult {
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

  const actual = received.getRenderCount();
  const pass = actual === expected;

  return {
    message: () => {
      if (pass) {
        return `Expected component not to render ${expected} time(s), but it did`;
      }

      // Show detailed render history on failure
      const history = received.getRenderHistory();
      const summary = formatRenderSummary(history);
      const details = formatRenderHistory(history, 10);

      return `Expected ${expected} renders, but got ${actual} (${summary})\n\n${details}`;
    },
    pass,
    actual,
    expected,
  };
}
