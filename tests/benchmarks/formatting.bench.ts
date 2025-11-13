import { bench, describe } from "vitest";

import {
  formatRenderHistory,
  formatRenderSummary,
} from "@/utils/formatRenderHistory";

import type { PhaseType } from "@/types";

/**
 * Benchmark suite for formatting utilities
 *
 * PURPOSE: Verify A1 optimization (formatRenderSummary refactor)
 *
 * CONTEXT: In v1.6.0, formatRenderSummary used 3 separate filter() passes (O(3n)).
 * In v1.6.1, it was optimized to a single loop with counters (O(n)).
 *
 * EXPECTED RESULTS:
 * - ~3x speedup for large histories (1000+ renders)
 * - Linear time complexity O(n)
 * - Negligible memory overhead (3 counters vs 3 arrays)
 *
 * APPROACH:
 * - Test realistic render counts (100, 1000, 5000, 10000)
 * - Test different phase distributions (single phase, mixed, realistic)
 * - Compare formatRenderSummary (O(n)) vs formatRenderHistory (O(n) but more expensive)
 *
 * CRITICAL: formatRenderSummary() is called on EVERY matcher failure.
 * Any performance regression here impacts developer experience.
 *
 * @see docs/refactor/refactor-results.md - A1 Optimization Details
 */

describe("formatRenderSummary Performance (A1 Optimization)", () => {
  describe("Small histories (100 renders)", () => {
    bench("Single phase (all 'update')", () => {
      const history = Array.from({ length: 100 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("Mixed phases (realistic: 1 mount, 10 nested, 89 updates)", () => {
      const history: PhaseType[] = Array.from({ length: 100 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 10 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderSummary(history);
    });

    bench(
      "Worst case (all different phases, max branching) - 50 iterations",
      () => {
        // 50 iterations to stabilize measurements for fast operations
        for (let rep = 0; rep < 50; rep++) {
          const history: PhaseType[] = Array.from({ length: 100 }, (_, i) => {
            if (i % 3 === 0) {
              return "mount";
            }
            if (i % 3 === 1) {
              return "update";
            }

            return "nested-update";
          });

          formatRenderSummary(history);
        }
      },
      {
        time: 1000,
        warmupTime: 200,
      },
    );
  });

  describe("Medium histories (1000 renders) - A1 optimization target", () => {
    bench("Single phase (all 'update')", () => {
      const history = Array.from({ length: 1000 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("Realistic pattern (1 mount, 100 nested, 899 updates)", () => {
      const history: PhaseType[] = Array.from({ length: 1000 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 10 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderSummary(history);
    });

    bench("Heavy nesting (1 mount, 500 nested, 499 updates)", () => {
      const history: PhaseType[] = Array.from({ length: 1000 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 2 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderSummary(history);
    });

    bench("Worst case (max branching)", () => {
      const history: PhaseType[] = Array.from({ length: 1000 }, (_, i) => {
        if (i % 3 === 0) {
          return "mount";
        }
        if (i % 3 === 1) {
          return "update";
        }

        return "nested-update";
      });

      formatRenderSummary(history);
    });
  });

  describe("Large histories (5000 renders) - stress test", () => {
    bench("Single phase (all 'update')", () => {
      const history = Array.from({ length: 5000 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("Realistic pattern (1 mount, 500 nested, 4499 updates)", () => {
      const history: PhaseType[] = Array.from({ length: 5000 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 10 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderSummary(history);
    });
  });

  describe("Very large histories (10000 renders) - circuit breaker limit", () => {
    bench(
      "Single phase at circuit breaker threshold",
      () => {
        const history = Array.from(
          { length: 10_000 },
          (): PhaseType => "update",
        );

        formatRenderSummary(history);
      },
      {
        warmupTime: 300,
        time: 1000,
      },
    );

    bench(
      "Realistic pattern at circuit breaker threshold",
      () => {
        const history: PhaseType[] = Array.from({ length: 10_000 }, (_, i) => {
          if (i === 0) {
            return "mount";
          }
          if (i % 10 === 0) {
            return "nested-update";
          }

          return "update";
        });

        formatRenderSummary(history);
      },
      {
        warmupTime: 300,
        time: 1000,
      },
    );
  });

  describe("Edge cases", () => {
    bench("Empty history - 1000 iterations", () => {
      // Very fast operation, amortize with many iterations
      for (let i = 0; i < 1000; i++) {
        formatRenderSummary([]);
      }
    });

    bench("Single render - 1000 iterations", () => {
      for (let i = 0; i < 1000; i++) {
        formatRenderSummary(["mount"]);
      }
    });

    bench("Two renders - 1000 iterations", () => {
      for (let i = 0; i < 1000; i++) {
        formatRenderSummary(["mount", "update"]);
      }
    });
  });
});

describe("formatRenderHistory Performance (baseline comparison)", () => {
  describe("Medium histories (1000 renders) with maxItems", () => {
    bench("maxItems=10 (minimal formatting)", () => {
      const history: PhaseType[] = Array.from({ length: 1000 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 10 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderHistory(history, 10);
    });

    bench("maxItems=50 (moderate formatting)", () => {
      const history: PhaseType[] = Array.from({ length: 1000 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 10 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderHistory(history, 50);
    });

    bench("maxItems=100 (full formatting)", () => {
      const history: PhaseType[] = Array.from({ length: 1000 }, (_, i) => {
        if (i === 0) {
          return "mount";
        }
        if (i % 10 === 0) {
          return "nested-update";
        }

        return "update";
      });

      formatRenderHistory(history, 100);
    });
  });

  describe("Large histories (5000 renders) with maxItems", () => {
    bench(
      "maxItems=50 with 5000 renders",
      () => {
        const history: PhaseType[] = Array.from({ length: 5000 }, (_, i) => {
          if (i === 0) {
            return "mount";
          }
          if (i % 10 === 0) {
            return "nested-update";
          }

          return "update";
        });

        formatRenderHistory(history, 50);
      },
      {
        warmupTime: 300,
        time: 1000,
      },
    );
  });
});

describe("Scalability Analysis - O(n) verification", () => {
  describe("formatRenderSummary should scale linearly", () => {
    // These benchmarks verify O(n) time complexity
    // If times scale linearly (2x input → ~2x time), optimization is correct

    bench("100 renders", () => {
      const history = Array.from({ length: 100 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("500 renders (5x larger)", () => {
      const history = Array.from({ length: 500 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("1000 renders (10x larger)", () => {
      const history = Array.from({ length: 1000 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("2500 renders (25x larger)", () => {
      const history = Array.from({ length: 2500 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench("5000 renders (50x larger)", () => {
      const history = Array.from({ length: 5000 }, (): PhaseType => "update");

      formatRenderSummary(history);
    });

    bench(
      "10000 renders (100x larger) - circuit breaker threshold",
      () => {
        const history = Array.from(
          { length: 10_000 },
          (): PhaseType => "update",
        );

        formatRenderSummary(history);
      },
      {
        warmupTime: 300,
        time: 1000,
      },
    );
  });
});
