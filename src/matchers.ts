import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import type { ProfiledComponent } from "./types";

/**
 * Track all profiled components to automatically clean them after each test
 */
const profiledComponents = new Set<ProfiledComponent<unknown>>();

/**
 * Automatically clear all profiler data after each test
 * This prevents test pollution and ensures isolation
 */
afterEach(() => {
  profiledComponents.forEach((component) => {
    component.clearCounters();
  });
  profiledComponents.clear();
});

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
    "clearCounters" in received
  );
}

/**
 * Custom Vitest matchers for profiled components
 */
expect.extend({
  /**
   * Assert that component has rendered at least once
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

    profiledComponents.add(received);
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
   * @param received
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

    profiledComponents.add(received);
    const actual = received.getRenderCount();

    return {
      pass: actual === expected,
      message: () =>
        actual === expected
          ? `Expected component not to render ${expected} time(s), but it did`
          : `Expected component to render ${expected} time(s), but it rendered ${actual} time(s)`,
      actual,
      expected,
    };
  },

  /**
   * Assert that the last render completed within specified duration
   * @param received
   * @param maxDuration - Maximum allowed render duration in milliseconds
   * @example
   * expect(ProfiledComponent).toHaveRenderedWithin(16) // 60fps = ~16ms per frame
   */
  toHaveRenderedWithin(received: unknown, maxDuration: number) {
    if (!isProfiledComponent(received)) {
      return {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      };
    }

    if (typeof maxDuration !== "number" || maxDuration <= 0) {
      return {
        pass: false,
        message: () =>
          `Expected duration must be a positive number, received ${maxDuration}`,
      };
    }

    profiledComponents.add(received);
    const lastRender = received.getLastRender();

    if (!lastRender) {
      return {
        pass: false,
        message: () =>
          `Component has not rendered yet, cannot check render duration`,
      };
    }

    const duration = lastRender.actualDuration;
    const pass = duration <= maxDuration;

    return {
      pass,
      message: () =>
        pass
          ? `Expected render to take more than ${maxDuration}ms, but it took ${duration.toFixed(2)}ms`
          : `Expected render to take at most ${maxDuration}ms, but it took ${duration.toFixed(2)}ms`,
      actual: duration,
      expected: maxDuration,
    };
  },

  /**
   * Assert that component mounted exactly once
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

    profiledComponents.add(received);
    const mounts = received.getRendersByPhase("mount");
    const mountCount = mounts.length;

    return {
      pass: mountCount === 1,
      message: () => {
        if (mountCount === 0) {
          return `Expected component to mount once, but it never mounted`;
        }
        if (mountCount === 1) {
          return `Expected component not to mount, but it mounted once`;
        }

        return `Expected component to mount once, but it mounted ${mountCount} times`;
      },
      actual: mountCount,
      expected: 1,
    };
  },

  /**
   * Assert that component never mounted
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

    profiledComponents.add(received);
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

    profiledComponents.add(received);
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
   * Assert average render time across all renders
   * @param received
   * @param maxAverage - Maximum allowed average render time in milliseconds
   * @example
   * expect(ProfiledComponent).toHaveAverageRenderTime(10)
   */
  toHaveAverageRenderTime(received: unknown, maxAverage: number) {
    if (!isProfiledComponent(received)) {
      return {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      };
    }

    if (typeof maxAverage !== "number" || maxAverage <= 0) {
      return {
        pass: false,
        message: () =>
          `Expected average duration must be a positive number, received ${maxAverage}`,
      };
    }

    profiledComponents.add(received);

    if (received.getRenderCount() === 0) {
      return {
        pass: false,
        message: () =>
          `Component has not rendered yet, cannot calculate average render time`,
      };
    }

    const average = received.getAverageRenderTime();
    const pass = average <= maxAverage;

    return {
      pass,
      message: () =>
        pass
          ? `Expected average render time to be more than ${maxAverage}ms, but it was ${average.toFixed(2)}ms`
          : `Expected average render time to be at most ${maxAverage}ms, but it was ${average.toFixed(2)}ms`,
      actual: average,
      expected: maxAverage,
    };
  },
});
