import type { PhaseType } from "../types";

const getPluralEnding = (number: number): string => {
  return number === 1 ? "" : "s";
};

/**
 * Formats render history into a human-readable string for error messages
 *
 * @param history - Array of render phases
 * @param maxItems - Maximum number of items to display (default: 10)
 * @returns Formatted string with render details
 *
 * @example
 * ```typescript
 * const history = component.getRenderHistory();
 * const formatted = formatRenderHistory(history);
 * // Output:
 * //   #1 [mount        phase]
 * //   #2 [update       phase]
 * //   💡 Tip: Use Component.getRenderHistory() to inspect all render details
 * ```
 */
export function formatRenderHistory(
  history: readonly PhaseType[],
  maxItems = 10,
): string {
  if (history.length === 0) {
    return "No renders";
  }

  const items = history.slice(0, maxItems).map((phase, index) => {
    // Format phase with padding for alignment
    const paddedPhase = phase.padEnd(12);

    return `  #${index + 1} [${paddedPhase} phase]`;
  });

  const result = items.join("\n");

  // Add helpful tip at the end
  const tip =
    "\n\n  💡 Tip: Use Component.getRenderHistory() to inspect all render details";

  // Add "and X more" indicator if there are more items
  const hasMore = history.length > maxItems;

  return hasMore
    ? `${result}\n  ... and ${history.length - maxItems} more${tip}`
    : result + tip;
}

/**
 * Formats a short summary of render statistics
 *
 * @param history - Array of render phases
 * @returns Brief statistics summary
 *
 * @example
 * ```typescript
 * const summary = formatRenderSummary(history);
 * // "3 renders (1 mount, 2 updates)"
 * ```
 */
export function formatRenderSummary(history: readonly PhaseType[]): string {
  if (history.length === 0) {
    return "0 renders";
  }

  let mounts = 0;
  let updates = 0;
  let nested = 0;

  for (const phase of history) {
    switch (phase) {
      case "mount": {
        mounts++;

        break;
      }
      case "update": {
        updates++;

        break;
      }
      case "nested-update": {
        nested++;

        break;
      }
      // No default - all possible PhaseType values are handled
    }
  }

  const parts: string[] = [];

  if (mounts > 0) {
    parts.push(`${mounts} mount${getPluralEnding(mounts)}`);
  }
  if (updates > 0) {
    parts.push(`${updates} update${getPluralEnding(updates)}`);
  }
  if (nested > 0) {
    parts.push(`${nested} nested update${getPluralEnding(nested)}`);
  }

  return `${history.length} render${getPluralEnding(history.length)} (${parts.join(", ")})`;
}
