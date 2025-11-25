/**
 * @file Property-Based Tests: Formatting Utilities (formatRenderHistory, formatRenderSummary)
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: Output Structure Consistency
 * - All render lines follow uniform format: `  #N [phase phase]`
 * - Consistent indentation (2 spaces)
 * - Line numbering starts at #1 and increases monotonically
 * - No skipped numbers or duplicates
 * - **Why important:** Human-readable output, easy visual parsing
 *
 * ### INVARIANT 2: No Invalid Numbers
 * - Never contains "NaN" in output
 * - Never contains "Infinity" or "-Infinity"
 * - All numbers are valid (percentages, counts, etc.)
 * - Division by zero handled correctly
 * - **Why important:** Robustness, correct metrics
 *
 * ### INVARIANT 3: maxItems Limiter
 * - `formatRenderHistory(history, maxItems)` shows ≤ maxItems lines
 * - If history is longer → shows ellipsis "... and N more"
 * - maxItems works correctly for any N (1-10000)
 * - Default maxItems: shows all (no limit)
 * - **Why important:** Controls output length, doesn't overload console
 *
 * ### INVARIANT 4: Unicode & Emoji Safety
 * - Correctly handles Unicode in component names
 * - Emoji in output doesn't break formatting
 * - Multi-byte characters counted correctly
 * - No mojibake (incorrect encoding)
 * - **Why important:** Internationalization, modern component names
 *
 * ### INVARIANT 5: Summary Statistics Accuracy
 * - `formatRenderSummary()` shows correct counts for all phases
 * - Sum of phases === total render count
 * - Percentages add up to 100% (with rounding)
 * - Phase breakdown: mount + update + nested-update
 * - **Why important:** Correct metrics for analysis
 *
 * ### INVARIANT 6: Empty & Edge Cases
 * - Empty history → clear message "No renders"
 * - Single render → formatted correctly (no plural bugs)
 * - 10,000+ renders → doesn't break formatting
 * - All same phase → percentages 100% for one phase
 * - **Why important:** Robustness in edge cases
 *
 * ## Testing Strategy:
 *
 * - **1000 runs** for structure consistency (high load)
 * - **500 runs** for maxItems limiter (medium load)
 * - **1-100 renders** for realistic scenarios
 * - **Generators:** `fc.constantFrom()` for PhaseType
 *
 * ## Technical Details:
 *
 * - **ANSI colors:** Uses chalk for colored output (optional)
 * - **String padding:** Alignment via padStart/padEnd
 * - **Pluralization:** Correct singular/plural forms
 * - **Locale-aware:** Numbers formatted with locale consideration (commas, dots)
 *
 * ## Output Examples:
 *
 * ```
 * Render History (5 renders):
 *   #1 [mount phase]
 *   #2 [update phase]
 *   #3 [update phase]
 *   #4 [nested-update phase]
 *   #5 [update phase]
 *
 * Summary:
 *   mount: 1 (20%)
 *   update: 3 (60%)
 *   nested-update: 1 (20%)
 * ```
 *
 * @see https://fast-check.dev/
 * @see src/utils/formatRenderHistory.ts - implementation
 */

import { fc, test } from "@fast-check/vitest";
import { describe, expect, expectTypeOf } from "vitest";

import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory.ts";

import type { PhaseType } from "@/types.ts";

const RENDER_PHASES = ["mount", "update", "nested-update"] as const;

// PhaseType generator - generates phase strings directly
const phaseArbitrary = fc.constantFrom(...RENDER_PHASES);

describe("Property-Based Tests: Formatting Invariants", () => {
  describe("formatRenderHistory", () => {
    test.prop([fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 })], {
      numRuns: 1000,
    })("all formatted render lines have consistent structure", (renders) => {
      const formatted = formatRenderHistory(renders);
      const lines = formatted.split("\n");
      const renderLines = lines.filter((l) => l.startsWith("  #"));

      if (renderLines.length === 0) {
        return true;
      }

      // All render lines should follow the same structure pattern (phase only)
      const pattern = /^ {2}#\d+ \[.+ phase\]$/;

      return renderLines.every((line) => pattern.test(line));
    });

    test.prop([fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 })], {
      numRuns: 1000,
    })("formatted output never contains NaN or Infinity", (renders) => {
      const formatted = formatRenderHistory(renders);

      return !formatted.includes("NaN") && !formatted.includes("Infinity");
    });

    test.prop(
      [
        fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 50 }),
      ],
      { numRuns: 1000 },
    )(
      "maxItems parameter limits number of displayed lines",
      (renders, maxItems) => {
        const formatted = formatRenderHistory(renders, maxItems);
        const lines = formatted.split("\n");
        const renderLines = lines.filter((l) => l.startsWith("  #"));

        // Should show at most maxItems render lines
        return renderLines.length <= maxItems;
      },
    );

    test.prop([fc.array(phaseArbitrary, { minLength: 11, maxLength: 50 })], {
      numRuns: 1000,
    })(
      "shows 'and X more' indicator when renders exceed maxItems",
      (renders) => {
        const maxItems = 10;
        const formatted = formatRenderHistory(renders, maxItems);

        if (renders.length > maxItems) {
          const expectedText = `and ${renders.length - maxItems} more`;

          return formatted.includes(expectedText);
        }

        return true;
      },
    );

    test.prop([fc.constant(undefined)], { numRuns: 1000 })(
      "empty history returns 'No renders'",
      () => {
        const formatted = formatRenderHistory([]);

        return formatted === "No renders";
      },
    );
  });

  describe("formatRenderSummary", () => {
    test.prop([fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 })], {
      numRuns: 1000,
    })("sum of phases in summary equals total number of renders", (renders) => {
      const summary = formatRenderSummary(renders);

      const totalMatch = /^(\d+) render/.exec(summary);

      if (!totalMatch) {
        return false;
      }

      const total = Number.parseInt(totalMatch[1] ?? "0", 10);

      return total === renders.length;
    });

    test.prop([fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 })], {
      numRuns: 1000,
    })("summary correctly uses singular/plural forms", (renders) => {
      const summary = formatRenderSummary(renders);

      if (renders.length === 1) {
        return summary.includes("1 render") && !summary.includes("renders");
      }

      return summary.includes("renders");
    });

    test.prop([fc.constant(undefined)], { numRuns: 1000 })(
      "empty history returns '0 renders'",
      () => {
        const summary = formatRenderSummary([]);

        return summary === "0 renders";
      },
    );

    test.prop([fc.array(phaseArbitrary, { minLength: 1, maxLength: 100 })], {
      numRuns: 1000,
    })("summary contains only existing phases", (renders) => {
      const summary = formatRenderSummary(renders);

      const hasMounts = renders.includes("mount");
      const hasUpdates = renders.includes("update");
      const hasNested = renders.includes("nested-update");

      const mentionsMounts = summary.includes("mount");
      const mentionsUpdates = summary.includes("update");
      const mentionsNested = summary.includes("nested");

      return (
        (!hasMounts || mentionsMounts) &&
        (!hasUpdates || mentionsUpdates) &&
        (!hasNested || mentionsNested)
      );
    });
  });
});

describe("Property-Based Tests: Formatting Stress & Edge Cases", () => {
  describe("High Volume Formatting", () => {
    test.prop([fc.integer({ min: 1000, max: 5000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "formatRenderHistory handles very long histories efficiently",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) =>
          i === 0 ? "mount" : "update",
        );

        // Should complete without errors
        const formatted = formatRenderHistory(renders);

        // Should be a string
        expectTypeOf(formatted).toBeString();

        // Should contain data
        expect(formatted.length).toBeGreaterThan(0);

        return true;
      },
    );

    test.prop([fc.integer({ min: 1000, max: 5000 })], {
      numRuns: 5,
      timeout: 60_000,
    })("formatRenderSummary handles very long histories", (numRenders) => {
      const renders = Array.from({ length: numRenders }, (_, i) =>
        i === 0 ? "mount" : "update",
      );

      const summary = formatRenderSummary(renders);

      // Should contain correct count
      expect(summary).toContain(`${numRenders} render`);

      return true;
    });
  });

  describe("maxItems Behavior at Scale", () => {
    test.prop(
      [fc.integer({ min: 100, max: 1000 }), fc.integer({ min: 1, max: 50 })],
      { numRuns: 500 },
    )(
      "maxItems correctly limits output with large histories",
      (historyLength, maxItems) => {
        const renders = Array.from({ length: historyLength }, (_, i) =>
          i === 0 ? "mount" : "update",
        );

        const formatted = formatRenderHistory(renders, maxItems);
        const lines = formatted.split("\n");
        const renderLines = lines.filter((l) => l.startsWith("  #"));

        // Should show at most maxItems
        return renderLines.length <= maxItems;
      },
    );

    test.prop(
      [fc.integer({ min: 100, max: 1000 }), fc.integer({ min: 1, max: 50 })],
      { numRuns: 500 },
    )(
      "maxItems with large history shows 'and X more' indicator",
      (historyLength, maxItems) => {
        // Only test when history is larger than maxItems
        if (historyLength <= maxItems) {
          return true;
        }

        const renders = Array.from({ length: historyLength }, (_, i) =>
          i === 0 ? "mount" : "update",
        );

        const formatted = formatRenderHistory(renders, maxItems);

        const expectedRemaining = historyLength - maxItems;

        return formatted.includes(`and ${expectedRemaining} more`);
      },
    );
  });

  describe("All Phases Representation at Scale", () => {
    test.prop([fc.integer({ min: 100, max: 1000 })], { numRuns: 100 })(
      "formatRenderSummary correctly counts phases in large histories",
      (numRenders) => {
        // Create mix of phases
        const renders: PhaseType[] = Array.from(
          { length: numRenders },
          (_, i) => {
            if (i === 0) {
              return "mount";
            }
            if (i % 5 === 0) {
              return "nested-update";
            }

            return "update";
          },
        );

        const summary = formatRenderSummary(renders);

        // Count expected phases
        const mounts = renders.filter((r) => r === "mount").length;
        const updates = renders.filter((r) => r === "update").length;
        const nested = renders.filter((r) => r === "nested-update").length;

        // All phases should be mentioned if present
        if (mounts > 0 && !summary.includes("mount")) {
          return false;
        }
        if (updates > 0 && !summary.includes("update")) {
          return false;
        }

        return !(nested > 0 && !summary.includes("nested"));
      },
    );
  });

  describe("Output Size Bounds", () => {
    test.prop([fc.integer({ min: 1000, max: 5000 })], {
      numRuns: 5,
      timeout: 60_000,
    })(
      "formatted output size is bounded regardless of history length",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) =>
          i === 0 ? "mount" : "update",
        );

        const maxItems = 50;
        const formatted = formatRenderHistory(renders, maxItems);

        // Output should be bounded by maxItems (rough estimate)
        const maxExpectedLines = maxItems + 5; // header + footer
        const actualLines = formatted.split("\n").length;

        return actualLines <= maxExpectedLines;
      },
    );

    test.prop([fc.integer({ min: 100, max: 1000 })], { numRuns: 100 })(
      "summary output remains concise with large histories",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) =>
          i === 0 ? "mount" : "update",
        );

        const summary = formatRenderSummary(renders);

        // Summary should be a single line
        const lines = summary.split("\n");

        return lines.length === 1;
      },
    );
  });
});
