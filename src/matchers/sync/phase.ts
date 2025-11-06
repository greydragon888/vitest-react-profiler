import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";

/**
 * Assert that component mounted exactly once
 *
 * @param received - The component to check
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveMountedOnce()
 */
export function toHaveMountedOnce(received: unknown): MatcherResult {
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
}

/**
 * Assert that component never mounted
 *
 * @param received - The component to check
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveNeverMounted()
 */
export function toHaveNeverMounted(received: unknown): MatcherResult {
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
}

/**
 * Assert that component only mounted (never updated in current test)
 *
 * @param received - The component to check
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveOnlyMounted()
 */
export function toHaveOnlyMounted(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const history = received.getRenderHistory();
  const hasMounts = history.includes("mount");
  const hasUpdates = history.includes("update");
  const pass = hasMounts && !hasUpdates;

  return {
    pass,
    message: () => {
      if (history.length === 0) {
        return `Expected component to have only mounts, but it never rendered`;
      }
      if (hasMounts && hasUpdates) {
        return `Expected component to have only mounts, but it also updated`;
      }
      if (!hasMounts && hasUpdates) {
        return `Expected component to have only mounts, but it only updated`;
      }

      return `Expected component not to have only mounts, but it did`;
    },
  };
}

/**
 * Assert that component only updated (never mounted in current test)
 *
 * @param received - The component to check
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveOnlyUpdated()
 */
export function toHaveOnlyUpdated(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const history = received.getRenderHistory();
  const hasMounts = history.includes("mount");
  const hasUpdates = history.includes("update");
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
}
