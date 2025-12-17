import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";
import type { PhaseType } from "@/types";

/** Valid phase types for validation */
const VALID_PHASES: readonly PhaseType[] = ["mount", "update", "nested-update"];

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
      // At this point, if hasUpdates is true, hasMounts must be false
      // (otherwise the previous condition would have returned)
      if (hasUpdates) {
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

/**
 * Assert that last render was of specific phase
 *
 * @param received - The component to check
 * @param expectedPhase - Expected render phase ('mount', 'update', or 'nested-update')
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toHaveLastRenderedWithPhase('update')
 * expect(ProfiledComponent).toHaveLastRenderedWithPhase('mount')
 * @since v1.10.0
 */
export function toHaveLastRenderedWithPhase(
  received: unknown,
  expectedPhase: PhaseType,
): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  // Validate phase parameter
  if (!VALID_PHASES.includes(expectedPhase)) {
    const validPhasesStr = VALID_PHASES.map((p) => `'${p}'`).join(", ");

    return {
      pass: false,
      message: () =>
        `Expected phase must be one of: ${validPhasesStr}, received '${expectedPhase}'`,
    };
  }

  const lastRender = received.getLastRender();

  // Handle case when component has not rendered
  if (lastRender === undefined) {
    return {
      pass: false,
      message: () =>
        `Expected last render to be '${expectedPhase}', but component has not rendered yet`,
      actual: undefined,
      expected: expectedPhase,
    };
  }

  const pass = lastRender === expectedPhase;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected last render not to be '${expectedPhase}', but it was`;
      }

      // Show render history for context
      const history = received.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      return `Expected last render to be '${expectedPhase}', but it was '${lastRender}'\n\n${details}`;
    },
    actual: lastRender,
    expected: expectedPhase,
  };
}
