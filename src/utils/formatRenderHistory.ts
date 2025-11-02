import type { RenderInfo } from "../types";

/**
 * Formats render history into a human-readable string for error messages
 *
 * @param history - Array of render information
 * @param maxItems - Maximum number of items to display (default: 10)
 * @returns Formatted string with render details
 *
 * @example
 * ```typescript
 * const history = component.getRenderHistory();
 * const formatted = formatRenderHistory(history);
 * // Output:
 * //   #1 [mount       ] at 2025-01-15T10:30:45.123Z
 * //   #2 [update      ] at 2025-01-15T10:30:45.456Z
 * //   💡 Tip: Use Component.getRenderHistory() to inspect all render details
 * ```
 */
export function formatRenderHistory(
  history: readonly RenderInfo[],
  maxItems = 10,
): string {
  if (history.length === 0) {
    return "No renders";
  }

  const items = history.slice(0, maxItems).map((render, index) => {
    // Format phase with padding for alignment
    const phase = render.phase.padEnd(12);

    // Format timestamp as ISO string
    const timestamp = new Date(render.timestamp).toISOString();

    return `  #${index + 1} [${phase}] at ${timestamp}`;
  });

  const result = items.join("\n");

  // Add "and X more" indicator if there are more items
  const hasMore = history.length > maxItems;
  const moreText = hasMore
    ? `\n  ... and ${history.length - maxItems} more`
    : "";

  // Add helpful tip at the end
  const tip =
    "\n\n  💡 Tip: Use Component.getRenderHistory() to inspect all render details";

  return result + moreText + tip;
}

/**
 * Formats a short summary of render statistics
 *
 * @param history - Array of render information
 * @returns Brief statistics summary
 *
 * @example
 * ```typescript
 * const summary = formatRenderSummary(history);
 * // "3 renders (1 mount, 2 updates)"
 * ```
 */
export function formatRenderSummary(history: readonly RenderInfo[]): string {
  if (history.length === 0) {
    return "0 renders";
  }

  const mounts = history.filter((r) => r.phase === "mount").length;
  const updates = history.filter((r) => r.phase === "update").length;
  const nested = history.filter((r) => r.phase === "nested-update").length;

  const parts: string[] = [];

  if (mounts > 0) {
    parts.push(`${mounts} mount${mounts === 1 ? "" : "s"}`);
  }
  if (updates > 0) {
    parts.push(`${updates} update${updates === 1 ? "" : "s"}`);
  }
  if (nested > 0) {
    parts.push(`${nested} nested update${nested === 1 ? "" : "s"}`);
  }

  return `${history.length} render${history.length === 1 ? "" : "s"} (${parts.join(", ")})`;
}
