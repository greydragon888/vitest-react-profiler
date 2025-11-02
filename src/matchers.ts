import { expect } from "vitest";

import {
  formatRenderHistory,
  formatRenderSummary,
} from "./utils/formatRenderHistory";

import type { ProfiledComponent } from "./types";

/**
 * Helper to validate profiled component
 */
function isProfiledComponent(
  received: unknown,
): received is ProfiledComponent<unknown> {
  return (
    received !== null &&
    typeof received === "function" &&
    "getRenderCount" in received &&
    "getRenderHistory" in received &&
    "getLastRender" in received
  );
}

/**
 * Custom Vitest matchers for profiled components
 */
expect.extend({
  /**
   * Assert that component has rendered at least once
   *
   * @example
   * expect(ProfiledComponent).toHaveRendered()
   */
  toHaveRendered(received: unknown) {
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
  },

  /**
   * Assert exact number of renders
   *
   * @param received - The component to check (must be created with withProfiler)
   * @param expected - Expected number of renders
   * @example
   * expect(ProfiledComponent).toHaveRenderedTimes(3)
   */
  toHaveRenderedTimes(received: unknown, expected: number) {
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
      pass,
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
      actual,
      expected,
    };
  },

  /**
   * Assert that component mounted exactly once
   *
   * @example
   * expect(ProfiledComponent).toHaveMountedOnce()
   */
  toHaveMountedOnce(received: unknown) {
    if (!isProfiledComponent(received)) {
      return {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      };
    }

    const mounts = received.getRendersByPhase("mount");
    const mountCount = mounts.length;
    const pass = mountCount === 1;

    return {
      pass,
      message: () => {
        if (mountCount === 0) {
          return `Expected component to mount once, but it never mounted`;
        }
        if (pass) {
          return `Expected component not to mount, but it mounted once`;
        }

        // Show all mount renders
        const mountDetails = formatRenderHistory(mounts, 10);

        return `Expected component to mount once, but it mounted ${mountCount} times\n\nMount renders:\n${mountDetails}`;
      },
      actual: mountCount,
      expected: 1,
    };
  },

  /**
   * Assert that component never mounted
   *
   * @example
   * expect(ProfiledComponent).toHaveNeverMounted()
   */
  toHaveNeverMounted(received: unknown) {
    if (!isProfiledComponent(received)) {
      return {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      };
    }

    const hasMounted = received.hasMounted();

    return {
      pass: !hasMounted,
      message: () =>
        hasMounted
          ? `Expected component never to mount, but it mounted`
          : `Expected component to mount, but it never did`,
    };
  },

  /**
   * Assert that component only updated (never mounted in current test)
   *
   * @example
   * expect(ProfiledComponent).toHaveOnlyUpdated()
   */
  toHaveOnlyUpdated(received: unknown) {
    if (!isProfiledComponent(received)) {
      return {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      };
    }

    const history = received.getRenderHistory();
    const hasMounts = history.some((r) => r.phase === "mount");
    const hasUpdates = history.some((r) => r.phase === "update");
    const pass = !hasMounts && hasUpdates;

    return {
      pass,
      message: () => {
        if (history.length === 0) {
          return `Expected component to have only updates, but it never rendered`;
        }
        if (hasMounts && hasUpdates) {
          return `Expected component to have only updates, but it also mounted`;
        }
        if (hasMounts && !hasUpdates) {
          return `Expected component to have only updates, but it only mounted`;
        }

        return `Expected component not to have only updates, but it did`;
      },
    };
  },

  /**
   * Assert that component eventually renders exact number of times (async)
   *
   * @param received - The component to check (must be created with withProfiler)
   * @param expected - Expected number of renders
   * @param options - Wait options
   * @param options.timeout - Maximum wait time in milliseconds (default: 1000)
   * @param options.interval - Polling interval in milliseconds (default: 50)
   * @example
   * await expect(ProfiledComponent).toEventuallyRenderTimes(3)
   * await expect(ProfiledComponent).toEventuallyRenderTimes(5, { timeout: 2000 })
   */
  async toEventuallyRenderTimes(
    received: unknown,
    expected: number,
    options?: { timeout?: number; interval?: number },
  ) {
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
  },

  /**
   * Assert that component eventually renders at least N times (async)
   *
   * @param received - The component to check (must be created with withProfiler)
   * @param minCount - Minimum expected number of renders
   * @param options - Wait options
   * @param options.timeout - Maximum wait time in milliseconds (default: 1000)
   * @param options.interval - Polling interval in milliseconds (default: 50)
   * @example
   * await expect(ProfiledComponent).toEventuallyRenderAtLeast(2)
   * await expect(ProfiledComponent).toEventuallyRenderAtLeast(3, { timeout: 2000 })
   */
  async toEventuallyRenderAtLeast(
    received: unknown,
    minCount: number,
    options?: { timeout?: number; interval?: number },
  ) {
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
  },

  /**
   * Assert that component eventually reaches specific render phase (async)
   *
   * @param received - The component to check (must be created with withProfiler)
   * @param phase - Expected render phase ('mount', 'update', or 'nested-update')
   * @param options - Wait options
   * @param options.timeout - Maximum wait time in milliseconds (default: 1000)
   * @param options.interval - Polling interval in milliseconds (default: 50)
   * @example
   * await expect(ProfiledComponent).toEventuallyReachPhase('update')
   * await expect(ProfiledComponent).toEventuallyReachPhase('mount', { timeout: 2000 })
   */
  async toEventuallyReachPhase(
    received: unknown,
    phase: "mount" | "update" | "nested-update",
    options?: { timeout?: number; interval?: number },
  ) {
    if (!isProfiledComponent(received)) {
      return {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      };
    }

    const validPhases = ["mount", "update", "nested-update"];

    if (!validPhases.includes(phase)) {
      return {
        pass: false,
        message: () =>
          `Phase must be one of: ${validPhases.join(", ")}, received ${phase}`,
      };
    }

    const { timeout = 1000, interval = 50 } = options ?? {};
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const history = received.getRenderHistory();
      const hasPhase = history.some((r) => r.phase === phase);

      if (hasPhase) {
        return {
          pass: true,
          message: () =>
            `Expected component not to eventually reach phase "${phase}" within ${timeout}ms, but it did`,
        };
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    const history = received.getRenderHistory();
    const phases = history.map((r) => r.phase).join(", ");
    const summary = formatRenderSummary(history);

    return {
      pass: false,
      message: () =>
        `Expected component to eventually reach phase "${phase}" within ${timeout}ms, but it didn't (${summary}).\n\nCurrent phases: [${phases}]`,
    };
  },
});
