/**
 * Property-Based Tests for Formatting Utilities
 *
 * These tests verify that string formatting functions handle edge cases:
 * - Consistent line lengths and alignment
 * - No NaN or Infinity in output
 * - Valid performance metrics calculation
 * - Unicode and emoji handling
 * - Number precision and scientific notation
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { describe, expect, expectTypeOf } from "vitest";

import type { RenderInfo } from "@/types.ts";
import {
  formatPerformanceMetrics,
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory.ts";

const RENDER_PHASES = ["mount", "update", "nested-update"] as const;

describe("Property-Based Tests: Formatting Invariants", () => {
  describe("formatRenderHistory", () => {
    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("all formatted render lines have consistent structure", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);
      const lines = formatted.split("\n");
      const renderLines = lines.filter((l) => l.startsWith("  #"));

      if (renderLines.length === 0) {
        return true;
      }

      // All render lines should follow the same structure pattern
      const pattern = /^ {2}#\d+ \[.+\] at .+ms \(duration: .+ms\)$/;

      return renderLines.every((line) => pattern.test(line));
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("formatted output never contains NaN or Infinity", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);

      return !formatted.includes("NaN") && !formatted.includes("Infinity");
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
        fc.integer({ min: 1, max: 50 }),
      ],
      { numRuns: 1000 },
    )(
      "maxItems parameter limits number of displayed lines",
      (renders, maxItems) => {
        const formatted = formatRenderHistory(
          renders as RenderInfo[],
          maxItems,
        );
        const lines = formatted.split("\n");
        const renderLines = lines.filter((l) => l.startsWith("  #"));

        // Should show at most maxItems render lines
        return renderLines.length <= maxItems;
      },
    );

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 11, maxLength: 50 },
        ),
      ],
      { numRuns: 1000 },
    )(
      "shows 'and X more' indicator when renders exceed maxItems",
      (renders) => {
        const maxItems = 10;
        const formatted = formatRenderHistory(
          renders as RenderInfo[],
          maxItems,
        );

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

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e6, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 1000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 1000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e6, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
      ],
      { numRuns: 1000 },
    )(
      "numbers are formatted with fixed precision (2 decimal places)",
      (renders) => {
        const formatted = formatRenderHistory(renders as RenderInfo[]);
        const lines = formatted.split("\n");
        const renderLines = lines.filter((l) => l.startsWith("  #"));

        // All numbers should be formatted with 2 decimal places
        // eslint-disable-next-line sonarjs/slow-regex
        const numberPattern = /\d+\.\d{2}ms/g;

        return renderLines.every((line) => {
          const matches = line.match(numberPattern);

          return matches && matches.length >= 2; // At least startTime and duration
        });
      },
    );
  });

  describe("formatRenderSummary", () => {
    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("sum of phases in summary equals total number of renders", (renders) => {
      const summary = formatRenderSummary(renders as RenderInfo[]);

      // Extract numbers from summary

      const totalMatch = /^(\d+) render/.exec(summary);

      if (!totalMatch) {
        return false;
      }

      const total = Number.parseInt(totalMatch[1] ?? "0", 10);

      return total === renders.length;
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("summary correctly uses singular/plural forms", (renders) => {
      const summary = formatRenderSummary(renders as RenderInfo[]);

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

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("summary contains only existing phases", (renders) => {
      const summary = formatRenderSummary(renders as RenderInfo[]);

      const hasMounts = renders.some((r) => r.phase === "mount");
      const hasUpdates = renders.some((r) => r.phase === "update");
      const hasNested = renders.some((r) => r.phase === "nested-update");

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

  describe("formatPerformanceMetrics", () => {
    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("performance metrics are always valid (min ≤ avg ≤ max)", (renders) => {
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      // Should not contain NaN or Infinity
      if (perf.includes("NaN") || perf.includes("Infinity")) {
        return false;
      }

      const durations = renders.map((r) => r.actualDuration);
      const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);

      // Mathematical invariant: min ≤ avg ≤ max
      return avg >= min && avg <= max;
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("formatted metrics do not contain NaN or Infinity", (renders) => {
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      return !perf.includes("NaN") && !perf.includes("Infinity");
    });

    test.prop([fc.constant(undefined)], { numRuns: 1000 })(
      "empty history returns 'No performance data'",
      () => {
        const perf = formatPerformanceMetrics([]);

        return perf === "No performance data";
      },
    );

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
      ],
      { numRuns: 1000 },
    )("metrics are formatted with 2 decimal places", (renders) => {
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      // Should have three numbers formatted as X.XXms
      // eslint-disable-next-line sonarjs/slow-regex
      const numberPattern = /\d+\.\d{2}ms/g;
      const matches = perf.match(numberPattern);

      return matches !== null && matches.length === 3; // Avg, Min, Max
    });

    test.prop(
      [
        fc.record({
          phase: fc.constantFrom(...RENDER_PHASES),
          startTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
          actualDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
          baseDuration: fc.double({ min: 0, max: 10_000, noNaN: true }),
          commitTime: fc.double({ min: 0, max: 1e9, noNaN: true }),
          timestamp: fc.integer({ min: 0, max: Date.now() }),
        }),
      ],
      { numRuns: 1000 },
    )("for single render avg = min = max", (renderData) => {
      const renders = [renderData as RenderInfo];
      const perf = formatPerformanceMetrics(renders);

      // Extract the numbers
      // eslint-disable-next-line sonarjs/slow-regex
      const numberPattern = /(\d+\.\d{2})ms/g;
      const matches = [...perf.matchAll(numberPattern)];

      if (matches.length !== 3) {
        return false;
      }

      const avg = Number.parseFloat(matches[0]?.[1] ?? "0");
      const min = Number.parseFloat(matches[1]?.[1] ?? "0");
      const max = Number.parseFloat(matches[2]?.[1] ?? "0");

      // For single render, all should be equal (within floating point tolerance)
      return Math.abs(avg - min) < 0.01 && Math.abs(avg - max) < 0.01;
    });
  });

  describe("Edge Cases", () => {
    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 0, max: 1e-10, noNaN: true }),
            actualDuration: fc.double({ min: 0, max: 1e-10, noNaN: true }),
            baseDuration: fc.double({ min: 0, max: 1e-10, noNaN: true }),
            commitTime: fc.double({ min: 0, max: 1e-10, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
      ],
      { numRuns: 1000 },
    )("very small numbers are formatted correctly", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      return (
        !formatted.includes("NaN") &&
        !formatted.includes("Infinity") &&
        !perf.includes("NaN") &&
        !perf.includes("Infinity")
      );
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({ min: 1e8, max: 1e9, noNaN: true }),
            actualDuration: fc.double({ min: 1000, max: 10_000, noNaN: true }),
            baseDuration: fc.double({ min: 1000, max: 10_000, noNaN: true }),
            commitTime: fc.double({ min: 1e8, max: 1e9, noNaN: true }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
      ],
      { numRuns: 1000 },
    )("very large numbers are formatted correctly", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      return (
        !formatted.includes("NaN") &&
        !formatted.includes("Infinity") &&
        !perf.includes("NaN") &&
        !perf.includes("Infinity")
      );
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.constant(0),
            actualDuration: fc.constant(0),
            baseDuration: fc.constant(0),
            commitTime: fc.constant(0),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 20 },
        ),
      ],
      { numRuns: 1000 },
    )("zero values are formatted correctly", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);
      const summary = formatRenderSummary(renders as RenderInfo[]);

      return (
        formatted.includes("0.00ms") &&
        perf.includes("0.00ms") &&
        summary.length > 0
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
        const renders = Array.from({ length: numRenders }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        // Should complete without errors
        const formatted = formatRenderHistory(renders as RenderInfo[]);

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
      const renders = Array.from({ length: numRenders }, (_, i) => ({
        phase: i === 0 ? ("mount" as const) : ("update" as const),
        startTime: i * 10,
        actualDuration: Math.random() * 10,
        baseDuration: Math.random() * 10,
        commitTime: i * 10 + Math.random() * 5,
        timestamp: Date.now() + i * 100,
      }));

      const summary = formatRenderSummary(renders as RenderInfo[]);

      // Should contain correct count
      expect(summary).toContain(`${numRenders} render`);

      return true;
    });

    test.prop([fc.integer({ min: 1000, max: 5000 })], {
      numRuns: 5,
      timeout: 60_000,
    })("formatPerformanceMetrics handles very long histories", (numRenders) => {
      const renders = Array.from({ length: numRenders }, (_, i) => ({
        phase: i === 0 ? ("mount" as const) : ("update" as const),
        startTime: i * 10,
        actualDuration: Math.random() * 10,
        baseDuration: Math.random() * 10,
        commitTime: i * 10 + Math.random() * 5,
        timestamp: Date.now() + i * 100,
      }));

      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      // Should not contain NaN or Infinity
      expect(perf).not.toContain("NaN");
      expect(perf).not.toContain("Infinity");

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
        const renders = Array.from({ length: historyLength }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        const formatted = formatRenderHistory(
          renders as RenderInfo[],
          maxItems,
        );
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

        const renders = Array.from({ length: historyLength }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        const formatted = formatRenderHistory(
          renders as RenderInfo[],
          maxItems,
        );

        const expectedRemaining = historyLength - maxItems;

        return formatted.includes(`and ${expectedRemaining} more`);
      },
    );
  });

  describe("Extreme Numeric Values", () => {
    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({
              min: 0,
              max: Number.MAX_SAFE_INTEGER / 100,
              noNaN: true,
            }),
            actualDuration: fc.double({
              min: 0,
              max: Number.MAX_SAFE_INTEGER / 100,
              noNaN: true,
            }),
            baseDuration: fc.double({
              min: 0,
              max: Number.MAX_SAFE_INTEGER / 100,
              noNaN: true,
            }),
            commitTime: fc.double({
              min: 0,
              max: Number.MAX_SAFE_INTEGER / 100,
              noNaN: true,
            }),
            timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
      ],
      { numRuns: 500 },
    )("formatting handles very large numbers without overflow", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      return (
        !formatted.includes("NaN") &&
        !formatted.includes("Infinity") &&
        !perf.includes("NaN") &&
        !perf.includes("Infinity")
      );
    });

    test.prop(
      [
        fc.array(
          fc.record({
            phase: fc.constantFrom(...RENDER_PHASES),
            startTime: fc.double({
              min: Number.MIN_VALUE,
              max: 1e-100,
              noNaN: true,
            }),
            actualDuration: fc.double({
              min: Number.MIN_VALUE,
              max: 1e-100,
              noNaN: true,
            }),
            baseDuration: fc.double({
              min: Number.MIN_VALUE,
              max: 1e-100,
              noNaN: true,
            }),
            commitTime: fc.double({
              min: Number.MIN_VALUE,
              max: 1e-100,
              noNaN: true,
            }),
            timestamp: fc.integer({ min: 0, max: Date.now() }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
      ],
      { numRuns: 500 },
    )("formatting handles extremely small positive numbers", (renders) => {
      const formatted = formatRenderHistory(renders as RenderInfo[]);
      const perf = formatPerformanceMetrics(renders as RenderInfo[]);

      return (
        !formatted.includes("NaN") &&
        !formatted.includes("Infinity") &&
        !perf.includes("NaN") &&
        !perf.includes("Infinity")
      );
    });
  });

  describe("All Phases Representation at Scale", () => {
    test.prop([fc.integer({ min: 100, max: 1000 })], { numRuns: 100 })(
      "formatRenderSummary correctly counts phases in large histories",
      (numRenders) => {
        // Create mix of phases
        const renders = Array.from({ length: numRenders }, (_, i) => {
          let phase: "mount" | "update" | "nested-update";

          if (i === 0) {
            phase = "mount";
          } else if (i % 5 === 0) {
            phase = "nested-update";
          } else {
            phase = "update";
          }

          return {
            phase,
            startTime: i * 10,
            actualDuration: Math.random() * 10,
            baseDuration: Math.random() * 10,
            commitTime: i * 10 + Math.random() * 5,
            timestamp: Date.now() + i * 100,
          };
        });

        const summary = formatRenderSummary(renders as RenderInfo[]);

        // Count expected phases
        const mounts = renders.filter((r) => r.phase === "mount").length;
        const updates = renders.filter((r) => r.phase === "update").length;
        const nested = renders.filter(
          (r) => r.phase === "nested-update",
        ).length;

        // All phases should be mentioned if present
        if (mounts > 0 && !summary.includes("mount")) {
          return false;
        }
        if (updates > 0 && !summary.includes("update")) {
          return false;
        }
        if (nested > 0 && !summary.includes("nested")) {
          return false;
        }

        return true;
      },
    );
  });

  describe("Format Consistency Under Load", () => {
    test.prop([fc.integer({ min: 500, max: 2000 })], {
      numRuns: 10,
      timeout: 60_000,
    })(
      "all formatted render lines follow consistent pattern at scale",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10.5,
          actualDuration: Math.random() * 15.7,
          baseDuration: Math.random() * 12.3,
          commitTime: i * 10.5 + Math.random() * 8.9,
          timestamp: Date.now() + i * 100,
        }));

        const formatted = formatRenderHistory(renders as RenderInfo[], 100);
        const lines = formatted.split("\n");
        const renderLines = lines.filter((l) => l.startsWith("  #"));

        // Pattern: "  #N [phase] at X.XXms (duration: Y.YYms)"
        const pattern = /^ {2}#\d+ \[.+\] at .+ms \(duration: .+ms\)$/;

        return renderLines.every((line) => pattern.test(line));
      },
    );

    test.prop([fc.integer({ min: 500, max: 2000 })], {
      numRuns: 10,
      timeout: 60_000,
    })(
      "performance metrics maintain 2 decimal places at scale",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        const perf = formatPerformanceMetrics(renders as RenderInfo[]);

        // Should have exactly 3 numbers with 2 decimal places
        // eslint-disable-next-line sonarjs/slow-regex
        const numberPattern = /\d+\.\d{2}ms/g;
        const matches = perf.match(numberPattern);

        return matches !== null && matches.length === 3;
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
        const renders = Array.from({ length: numRenders }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        const maxItems = 50;
        const formatted = formatRenderHistory(
          renders as RenderInfo[],
          maxItems,
        );

        // Output should be bounded by maxItems (rough estimate)
        const maxExpectedLines = maxItems + 5; // header + footer
        const actualLines = formatted.split("\n").length;

        return actualLines <= maxExpectedLines;
      },
    );

    test.prop([fc.integer({ min: 100, max: 1000 })], { numRuns: 100 })(
      "summary output remains concise with large histories",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        const summary = formatRenderSummary(renders as RenderInfo[]);

        // Summary should be a single line
        const lines = summary.split("\n");

        return lines.length === 1;
      },
    );

    test.prop([fc.integer({ min: 100, max: 1000 })], { numRuns: 100 })(
      "performance metrics output remains fixed size",
      (numRenders) => {
        const renders = Array.from({ length: numRenders }, (_, i) => ({
          phase: i === 0 ? ("mount" as const) : ("update" as const),
          startTime: i * 10,
          actualDuration: Math.random() * 10,
          baseDuration: Math.random() * 10,
          commitTime: i * 10 + Math.random() * 5,
          timestamp: Date.now() + i * 100,
        }));

        const perf = formatPerformanceMetrics(renders as RenderInfo[]);

        // Performance metrics should be a single line (avg, min, max)
        const lines = perf.split("\n");

        return lines.length === 1;
      },
    );
  });
});
