import { isProfiledComponent } from "@/matchers/type-guards";
import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory";

import type { MatcherResult, WaitOptions } from "@/matchers/types";
import type { PhaseType, ProfiledComponent } from "@/types";

/**
 * Valid render phases
 */
const VALID_PHASES: readonly PhaseType[] = ["mount", "update", "nested-update"];

/**
 * Validation result for async matchers
 *
 * Either contains error (validation failed) or component + timeout (validation passed)
 */
export type ValidationResult<P> =
  | { ok: false; error: MatcherResult }
  | { ok: true; component: ProfiledComponent<P>; timeout: number };

/**
 * Validates common async matcher prerequisites:
 * 1. Received is a profiled component
 * 2. Timeout is a positive number (default: 1000)
 *
 * Returns either validation error or validated component + timeout.
 *
 * @param received - Value to validate
 * @param options - Wait options (timeout)
 * @returns Validation result
 *
 * @example
 * const validation = validateAsyncMatcherPrerequisites(received, options);
 * if (!validation.ok) {
 *   return validation.error;
 * }
 * const { component, timeout } = validation;
 *
 * @since v1.12.0
 * @internal
 */
export function validateAsyncMatcherPrerequisites<P>(
  received: unknown,
  options?: WaitOptions,
): ValidationResult<P> {
  if (!isProfiledComponent(received)) {
    return {
      ok: false,
      error: {
        pass: false,
        message: () =>
          `Expected a profiled component created with withProfiler(), received ${typeof received}`,
      },
    };
  }

  const { timeout = 1000 } = options ?? {};

  if (!Number.isFinite(timeout) || timeout <= 0) {
    return {
      ok: false,
      error: {
        pass: false,
        message: () =>
          `Expected timeout to be a positive number, received ${timeout}`,
      },
    };
  }

  return {
    ok: true,
    component: received as ProfiledComponent<P>,
    timeout,
  };
}

/**
 * Validates that a numeric argument is a non-negative integer.
 *
 * Returns null if valid, or MatcherResult with error if invalid.
 *
 * @param value - Value to validate
 * @param paramName - Parameter name for error message
 * @returns null if valid, MatcherResult if invalid
 *
 * @example
 * const error = validateNonNegativeInteger(expected, 'Expected render count');
 * if (error) return error;
 *
 * @since v1.12.0
 * @internal
 */
export function validateNonNegativeInteger(
  value: number,
  paramName: string,
): MatcherResult | null {
  if (!Number.isInteger(value) || value < 0) {
    return {
      pass: false,
      message: () =>
        `${paramName} must be a non-negative integer, received ${value}`,
    };
  }

  return null;
}

/**
 * Validates that a phase is one of valid render phases.
 *
 * Returns null if valid, or MatcherResult with error if invalid.
 *
 * @param phase - Phase to validate
 * @returns null if valid, MatcherResult if invalid
 *
 * @example
 * const error = validatePhase(phase);
 * if (error) return error;
 *
 * @since v1.12.0
 * @internal
 */
export function validatePhase(phase: PhaseType): MatcherResult | null {
  if (!VALID_PHASES.includes(phase)) {
    return {
      pass: false,
      message: () =>
        `Phase must be one of: ${VALID_PHASES.join(", ")}, received ${phase}`,
    };
  }

  return null;
}

/**
 * Creates a timeout failure result for render count matchers.
 *
 * Extracts common pattern of getting render count, history, formatting them,
 * and building a failure MatcherResult.
 *
 * @param component - The profiled component
 * @param expected - Expected value for the result
 * @param messageBuilder - Function that builds the message from actual, summary, details
 * @returns MatcherResult with pass: false
 *
 * @example
 * resolve(createRenderCountTimeoutResult(
 *   component,
 *   expected,
 *   (actual, summary, details) =>
 *     `Expected component to render ${expected} times, but got ${actual} (${summary})\n\n${details}`
 * ));
 *
 * @since v1.12.0
 * @internal
 */
export function createRenderCountTimeoutResult<P>(
  component: ProfiledComponent<P>,
  expected: number,
  messageBuilder: (actual: number, summary: string, details: string) => string,
): MatcherResult {
  const actual = component.getRenderCount();
  const history = component.getRenderHistory();
  const summary = formatRenderSummary(history);
  const details = formatRenderHistory(history, 10);

  return {
    pass: false,
    message: () => messageBuilder(actual, summary, details),
    actual,
    expected,
  };
}
