import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";
import type { PhaseType, RenderLoopOptions } from "@/types";

/**
 * Result of loop detection
 */
interface LoopResult {
  hasLoop: boolean;
  loopPhase?: PhaseType;
  consecutiveCount?: number;
  startIndex?: number;
  endIndex?: number;
}

/**
 * Statistics about max consecutive runs
 */
interface RunStats {
  maxUpdateRun: number;
  maxNestedRun: number;
}

/**
 * Normalized options with defaults applied
 */
interface NormalizedOptions {
  maxConsecutiveUpdates: number;
  maxConsecutiveNested: number;
  ignoreInitialUpdates: number;
  showFullHistory: boolean;
  componentName: string;
}

/**
 * Validate and normalize options with defaults
 */
function normalizeOptions(
  options: RenderLoopOptions = {},
): NormalizedOptions | MatcherResult {
  const {
    maxConsecutiveUpdates = 10,
    maxConsecutiveNested,
    ignoreInitialUpdates = 0,
    showFullHistory = false,
    componentName = "Component",
  } = options;

  if (!Number.isInteger(maxConsecutiveUpdates) || maxConsecutiveUpdates < 1) {
    return {
      pass: false,
      message: () =>
        `maxConsecutiveUpdates must be a positive integer, received ${maxConsecutiveUpdates}`,
    };
  }

  const effectiveMaxNested = maxConsecutiveNested ?? maxConsecutiveUpdates;

  if (!Number.isInteger(effectiveMaxNested) || effectiveMaxNested < 1) {
    return {
      pass: false,
      message: () =>
        `maxConsecutiveNested must be a positive integer, received ${maxConsecutiveNested}`,
    };
  }

  if (!Number.isInteger(ignoreInitialUpdates) || ignoreInitialUpdates < 0) {
    return {
      pass: false,
      message: () =>
        `ignoreInitialUpdates must be a non-negative integer, received ${ignoreInitialUpdates}`,
    };
  }

  return {
    maxConsecutiveUpdates,
    maxConsecutiveNested: effectiveMaxNested,
    ignoreInitialUpdates,
    showFullHistory,
    componentName,
  };
}

/**
 * Detect render loops in history using single-pass O(n) algorithm
 * Returns early on first loop detection for efficiency.
 */
function detectLoop(
  history: readonly PhaseType[],
  options: NormalizedOptions,
): LoopResult {
  const { maxConsecutiveUpdates, maxConsecutiveNested, ignoreInitialUpdates } =
    options;

  let currentPhase: PhaseType | undefined = undefined;
  let consecutiveCount = 0;
  let startIndex = 0;
  let updatesSeen = 0;

  for (const [i, phase] of history.entries()) {
    if (
      (phase === "update" || phase === "nested-update") &&
      updatesSeen < ignoreInitialUpdates
    ) {
      updatesSeen++;
      currentPhase = undefined;
      consecutiveCount = 0;

      continue;
    }

    if (phase === "mount") {
      currentPhase = phase;
      consecutiveCount = 1;
      startIndex = i;

      continue;
    }

    if (phase === currentPhase) {
      consecutiveCount++;
      const threshold =
        phase === "update" ? maxConsecutiveUpdates : maxConsecutiveNested;

      if (consecutiveCount > threshold) {
        return {
          hasLoop: true,
          loopPhase: phase,
          consecutiveCount,
          startIndex,
          endIndex: i,
        };
      }
    } else {
      currentPhase = phase;
      consecutiveCount = 1;
      startIndex = i;
    }
  }

  return { hasLoop: false };
}

/**
 * Record max run for the given phase type
 */
function recordMaxRun(
  phase: PhaseType | undefined,
  run: number,
  stats: RunStats,
): void {
  // Stryker disable EqualityOperator: Equivalent mutant - `>` to `>=` is identical (max = run when run == max doesn't change value)
  if (phase === "update" && run > stats.maxUpdateRun) {
    stats.maxUpdateRun = run;
  } else if (phase === "nested-update" && run > stats.maxNestedRun) {
    stats.maxNestedRun = run;
  }
  // Stryker restore EqualityOperator
}

/**
 * Compute max consecutive runs for each phase type.
 * Only called when no loop is detected (for success message).
 */
function computeRunStats(history: readonly PhaseType[]): RunStats {
  const stats: RunStats = { maxUpdateRun: 0, maxNestedRun: 0 };
  let currentPhase: PhaseType | undefined = undefined;
  let currentRun = 0;

  for (const phase of history) {
    if (phase === "mount") {
      currentPhase = phase;
      currentRun = 1;

      continue;
    }

    if (phase === currentPhase) {
      currentRun++;
    } else {
      recordMaxRun(currentPhase, currentRun, stats);
      currentPhase = phase;
      currentRun = 1;
    }
  }

  recordMaxRun(currentPhase, currentRun, stats);

  return stats;
}

/**
 * Format loop sequence with indices for error message
 */
function formatLoopSequence(
  history: readonly PhaseType[],
  startIndex: number,
  endIndex: number,
  maxItems = 10,
): string {
  const loopSlice = history.slice(startIndex, endIndex + 1);
  const totalItems = loopSlice.length;
  const itemsToShow = loopSlice.slice(0, maxItems);

  const lines = itemsToShow.map((phase, idx) => {
    const globalIndex = startIndex + idx + 1;

    return `  #${globalIndex}  [${phase.padEnd(12)} phase]`;
  });

  if (totalItems > maxItems) {
    lines.push(`  ... and ${totalItems - maxItems} more`);
  }

  return lines.join("\n");
}

/**
 * Format failure message with diagnostics
 */
function formatFailureMessage(
  componentName: string,
  result: LoopResult,
  history: readonly PhaseType[],
  options: NormalizedOptions,
): string {
  const { loopPhase, consecutiveCount, startIndex = 0, endIndex = 0 } = result;
  const { maxConsecutiveUpdates, maxConsecutiveNested, showFullHistory } =
    options;

  const threshold =
    loopPhase === "update" ? maxConsecutiveUpdates : maxConsecutiveNested;

  let message = `Expected ${componentName} not to have render loops, but found:\n`;

  message += `  Suspicious pattern: ${consecutiveCount} consecutive '${loopPhase}' phases (threshold: ${threshold})\n\n`;

  const loopSequence = formatLoopSequence(history, startIndex, endIndex);

  message += `Loop sequence (renders #${startIndex + 1}-#${endIndex + 1}):\n${loopSequence}\n\n`;
  message += `Potential causes:\n`;
  message += `  - useEffect with missing/incorrect dependencies\n`;
  message += `  - setState called during render\n`;
  message += `  - Circular state updates between components\n\n`;

  if (showFullHistory) {
    message += `Full render history:\n${formatRenderHistory(history, history.length)}\n\n`;
  }

  message += `💡 Tip: Use ${componentName}.getRenderHistory() to inspect full history`;

  return message;
}

/**
 * Format success message (for .not modifier)
 */
function formatSuccessMessage(
  componentName: string,
  stats: RunStats,
  options: NormalizedOptions,
): string {
  const { maxConsecutiveUpdates, maxConsecutiveNested } = options;
  const { maxUpdateRun, maxNestedRun } = stats;

  return (
    `Expected ${componentName} to have render loops, but none were detected:\n` +
    `  All consecutive 'update' runs: <= ${maxUpdateRun} (threshold: ${maxConsecutiveUpdates})\n` +
    `  All consecutive 'nested-update' runs: <= ${maxNestedRun} (threshold: ${maxConsecutiveNested})`
  );
}

/**
 * Assert that component does not have suspicious render loop patterns
 *
 * Detects consecutive same-phase renders that may indicate infinite loops.
 * Catches render loops BEFORE hitting MAX_SAFE_RENDERS (10,000).
 *
 * @param received - The component to check (must be created with withProfiler)
 * @param options - Loop detection options
 * @returns Matcher result
 * @example
 * // Default threshold (10 consecutive updates)
 * expect(ProfiledComponent).notToHaveRenderLoops()
 *
 * @example
 * // Custom threshold
 * expect(ProfiledComponent).notToHaveRenderLoops({ maxConsecutiveUpdates: 5 })
 *
 * @example
 * // Ignore initialization updates
 * expect(ProfiledComponent).notToHaveRenderLoops({
 *   ignoreInitialUpdates: 2,
 *   componentName: 'Header'
 * })
 * @since v1.8.0
 */
export function notToHaveRenderLoops(
  received: unknown,
  options: RenderLoopOptions = {},
): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const normalized = normalizeOptions(options);

  if ("pass" in normalized) {
    return normalized;
  }

  const history = received.getRenderHistory();
  const loopResult = detectLoop(history, normalized);
  const pass = !loopResult.hasLoop;

  return {
    pass,
    message: () => {
      if (pass) {
        const stats = computeRunStats(history);

        return formatSuccessMessage(
          normalized.componentName,
          stats,
          normalized,
        );
      }

      return formatFailureMessage(
        normalized.componentName,
        loopResult,
        history,
        normalized,
      );
    },
  };
}
