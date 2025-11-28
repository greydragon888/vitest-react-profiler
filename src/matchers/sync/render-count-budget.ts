import { isProfiledComponent } from "@/matchers/type-guards";
import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";
import type { PhaseType, RenderCountBudget } from "@/types";

/**
 * Result of checking a single budget constraint
 */
interface ConstraintCheckResult {
  check: string;
  violation?: string;
}

/**
 * Check single budget constraint
 */
function checkConstraint(
  actual: number,
  max: number | undefined,
  label: string,
  violationMsg: string,
): ConstraintCheckResult | undefined {
  if (max === undefined) {
    return undefined;
  }

  const pass = actual <= max;
  const status = pass ? "✅" : "❌";

  return {
    check: `  ${label}: ${actual} (budget: ${max}) ${status}`,
    ...(pass ? {} : { violation: `${violationMsg}: ${actual} > ${max}` }),
  };
}

/**
 * Validate budget has at least one constraint and all values are valid
 */
function validateBudget(budget: RenderCountBudget): MatcherResult | undefined {
  const { maxRenders, maxMounts, maxUpdates } = budget;

  // Check at least one constraint is defined
  if (
    maxRenders === undefined &&
    maxMounts === undefined &&
    maxUpdates === undefined
  ) {
    return {
      pass: false,
      message: () =>
        "Budget must specify at least one constraint (maxRenders, maxMounts, or maxUpdates)",
    };
  }

  // Validate each constraint value
  const constraints: [string, unknown][] = [
    ["maxRenders", maxRenders],
    ["maxMounts", maxMounts],
    ["maxUpdates", maxUpdates],
  ];

  for (const [name, value] of constraints) {
    if (value === undefined) {
      continue;
    }

    if (typeof value === "object") {
      return {
        pass: false,
        message: () => `Budget.${name} must not be object or null`,
      };
    }

    if (!Number.isInteger(value) || (typeof value === "number" && value < 0)) {
      // After checking typeof === "object" above, value is primitive but TypeScript can't narrow unknown
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const stringValue = String(value);

      return {
        pass: false,
        message: () =>
          `Budget.${name} must be a non-negative integer, received ${stringValue}`,
      };
    }
  }

  return undefined;
}

/**
 * Format matcher failure message
 */
function formatFailureMessage(
  componentName: string,
  checks: string[],
  violations: string[],
  history: readonly PhaseType[],
): string {
  const summary = formatRenderSummary(history);
  const details = formatRenderHistory(history, 10);

  return (
    `Expected ${componentName} to meet render count budget:\n` +
    `${checks.join("\n")}\n\n` +
    `Violations:\n  ${violations.join("\n  ")}\n\n` +
    `Actual: ${summary}\n\n${details}`
  );
}

/**
 * Format matcher success message (for .not modifier)
 */
function formatSuccessMessage(componentName: string, checks: string[]): string {
  return `Expected ${componentName} NOT to meet render count budget, but it did:\n${checks.join("\n")}`;
}

/**
 * Assert that component renders within budget constraints
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param budget - Budget constraints
 * @returns Matcher result
 * @example
 * expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 3 })
 */
export function toMeetRenderCountBudget(
  received: unknown,
  budget: RenderCountBudget,
): MatcherResult {
  // 1. Validate received is ProfiledComponent
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  // 2. Validate budget
  const validationError = validateBudget(budget);

  if (validationError) {
    return validationError;
  }

  // 3. Extract render data
  const {
    maxRenders,
    maxMounts,
    maxUpdates,
    componentName = "Component",
  } = budget;
  const history = received.getRenderHistory();
  const actualTotal = history.length;
  const actualMounts = history.filter((p) => p === "mount").length;
  const actualUpdates = history.filter(
    (p) => p === "update" || p === "nested-update",
  ).length;

  // 4. Check constraints
  const results = [
    checkConstraint(
      actualTotal,
      maxRenders,
      "Total renders",
      "Total renders exceeded",
    ),
    checkConstraint(actualMounts, maxMounts, "Mounts", "Mount count exceeded"),
    checkConstraint(
      actualUpdates,
      maxUpdates,
      "Updates",
      "Update count exceeded",
    ),
  ].filter((r): r is ConstraintCheckResult => r !== undefined);

  const checks = results.map((r) => r.check);
  const violations = results
    .map((r) => r.violation)
    .filter((v): v is string => v !== undefined);
  const pass = violations.length === 0;

  // 5. Return result
  return {
    pass,
    message: () =>
      pass
        ? formatSuccessMessage(componentName, checks)
        : formatFailureMessage(componentName, checks, violations, history),
    actual: {
      total: actualTotal,
      mounts: actualMounts,
      updates: actualUpdates,
    },
    expected: budget,
  };
}
