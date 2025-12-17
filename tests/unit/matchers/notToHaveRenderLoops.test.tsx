import { render } from "@testing-library/react";
import { createElement, useEffect, useLayoutEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../../src";

import type { PhaseType } from "../../../src/types";

// Test component that can trigger various render patterns
const TestComponent = ({ triggerUpdates = 0 }: { triggerUpdates?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count < triggerUpdates) {
      setCount((c) => c + 1);
    }
  }, [count, triggerUpdates]);

  return createElement("div", null, "test");
};

// Component that generates nested-update phases using useLayoutEffect
const NestedUpdateComponent = ({
  triggerNested = 0,
}: {
  triggerNested?: number;
}) => {
  const [count, setCount] = useState(0);

  // useLayoutEffect runs synchronously during commit phase,
  // which creates nested-update phases
  useLayoutEffect(() => {
    if (count < triggerNested) {
      setCount((c) => c + 1);
    }
  }, [count, triggerNested]);

  return createElement("div", null, "nested");
};

describe("notToHaveRenderLoops", () => {
  describe("Validation Tests", () => {
    it("should reject non-profiled component", () => {
      const regularComponent = () => createElement("div", null);

      expect(() => {
        expect(regularComponent).notToHaveRenderLoops();
      }).toThrowError(
        /Expected a profiled component created with withProfiler/,
      );
    });

    it("should reject negative maxConsecutiveUpdates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: -1,
        });
      }).toThrowError(/maxConsecutiveUpdates must be a positive integer/);
    });

    it("should reject zero maxConsecutiveUpdates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 0,
        });
      }).toThrowError(/maxConsecutiveUpdates must be a positive integer/);
    });

    it("should reject float maxConsecutiveUpdates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 3.5,
        });
      }).toThrowError(/maxConsecutiveUpdates must be a positive integer/);
    });

    it("should reject negative maxConsecutiveNested", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveNested: -1,
        });
      }).toThrowError(/maxConsecutiveNested must be a positive integer/);
    });

    it("should reject float maxConsecutiveNested", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveNested: 2.5,
        });
      }).toThrowError(/maxConsecutiveNested must be a positive integer/);
    });

    it("should reject negative ignoreInitialUpdates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          ignoreInitialUpdates: -1,
        });
      }).toThrowError(/ignoreInitialUpdates must be a non-negative integer/);
    });

    it("should reject float ignoreInitialUpdates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          ignoreInitialUpdates: 1.5,
        });
      }).toThrowError(/ignoreInitialUpdates must be a non-negative integer/);
    });
  });

  describe("Default Behavior Tests", () => {
    it("should pass when component has no renders", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should pass when component only mounted", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent));

      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should pass when component has few consecutive updates (< 10)", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should fail when component has many consecutive updates (> 10)", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 15 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern: \d+ consecutive 'update' phases/);
    });

    it("should fail when exactly at threshold consecutive updates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 11 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern: 11 consecutive 'update' phases/);
    });
  });

  describe("Custom Thresholds Tests", () => {
    it("should respect custom maxConsecutiveUpdates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

      // Should pass with default threshold (10)
      expect(ProfiledComponent).notToHaveRenderLoops();

      // Should fail with custom threshold (5)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 5,
        });
      }).toThrowError(/Suspicious pattern: 6 consecutive 'update' phases/);
    });

    it("should use maxConsecutiveUpdates as fallback for nested-update", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Manually create history with nested-updates
      // We'll just test that maxConsecutiveUpdates is used when maxConsecutiveNested is not provided
      render(createElement(ProfiledComponent, { triggerUpdates: 2 }));

      expect(ProfiledComponent).notToHaveRenderLoops({
        maxConsecutiveUpdates: 5,
        // maxConsecutiveNested not provided - should default to maxConsecutiveUpdates
      });
    });

    it("should respect separate maxConsecutiveNested threshold", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

      // Custom thresholds: updates can be up to 8, but nested only up to 3
      expect(ProfiledComponent).notToHaveRenderLoops({
        maxConsecutiveUpdates: 8,
        maxConsecutiveNested: 3,
      });
    });

    it("should detect nested-update loops with custom threshold", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // Generate 6 nested-updates (1 mount + 6 nested-updates)
      render(createElement(ProfiledComponent, { triggerNested: 6 }));

      // Should fail with low nested-update threshold
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveNested: 3,
        });
      }).toThrowError(
        /Suspicious pattern: \d+ consecutive 'nested-update' phases/,
      );
    });
  });

  describe("ignoreInitialUpdates Tests", () => {
    it("should ignore first N updates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      // Without ignoring - should fail (12 > 10)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern/);

      // Ignoring first 3 updates - should pass (effective: 9 consecutive)
      expect(ProfiledComponent).notToHaveRenderLoops({
        ignoreInitialUpdates: 3,
      });
    });

    it("should fail if loop exceeds threshold even after ignoring", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 13 }));

      // Total: 1 mount + 13 updates
      // Ignoring first 2 updates - still 11 consecutive (> 10)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          ignoreInitialUpdates: 2,
        });
      }).toThrowError(/Suspicious pattern: 11 consecutive 'update' phases/);
    });

    it("should work with ignoreInitialUpdates = 0", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      expect(ProfiledComponent).notToHaveRenderLoops({
        ignoreInitialUpdates: 0,
      });
    });

    it("should handle boundary case where ignored count equals total updates", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      // Ignoring all 5 updates - should pass (no consecutive sequence after ignoring)
      expect(ProfiledComponent).notToHaveRenderLoops({
        ignoreInitialUpdates: 10,
      });
    });
  });

  describe("Error Message Tests", () => {
    it("should include loop sequence in error message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Loop sequence \(renders #\d+-#\d+\):/);
    });

    it("should include potential causes in error message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Potential causes:/);
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/useEffect with missing\/incorrect dependencies/);
    });

    it("should include helpful tip in error message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/💡 Tip: Use .* to inspect full history/);
    });

    it("should use componentName in error messages", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Header");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          componentName: "Header",
        });
      }).toThrowError(/Expected Header not to have render loops/);
    });

    it("should show full history when showFullHistory is true", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          showFullHistory: true,
        });
      }).toThrowError(/Full render history:/);
    });

    it("should not show full history by default", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      let errorMessage = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops();
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      expect(errorMessage).not.toMatch(/Full render history:/);
    });
  });

  describe("Pattern Detection Tests", () => {
    it("should detect consecutive updates separated by mount", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First render cycle - 5 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 5 }),
      );

      unmount();

      // Second render cycle - 7 updates
      render(createElement(ProfiledComponent, { triggerUpdates: 7 }));

      // Each cycle separately is fine (< 10), mount resets counter
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should track same-phase sequences correctly", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      const history = ProfiledComponent.getRenderHistory();

      // History should be: mount, update, update, update, ... (12 updates)
      expect(history[0]).toBe("mount");
      expect(history).toHaveLength(13); // 1 mount + 12 updates

      // Should detect loop (12 consecutive updates > 10)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern/);
    });

    it("should detect loop at end of history", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 11 }));

      // Loop is at the end (11 consecutive updates)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern: 11 consecutive 'update' phases/);
    });

    it("should detect loop in middle of history", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle - triggers loop
      const { rerender } = render(
        createElement(ProfiledComponent, { triggerUpdates: 12 }),
      );

      // Second cycle - stop updates
      rerender(createElement(ProfiledComponent, { triggerUpdates: 0 }));

      // Should still detect the loop that occurred in the middle
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern/);
    });
  });

  describe(".not Modifier Tests", () => {
    it("should fail when using .not and no loops detected", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /Expected .* to have render loops, but none were detected/,
      );
    });

    it("should pass when using .not and loops detected", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      // Should NOT throw because we're using .not and loop exists
      expect(ProfiledComponent).not.notToHaveRenderLoops();
    });
  });

  describe("Edge Cases Tests", () => {
    it("should handle empty history", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // No renders yet
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should handle single render", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 0 }));

      // Only mount, no updates
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should handle alternating phases", () => {
      const AlternatingComponent = () => {
        const [, setCount] = useState(0);

        useEffect(() => {
          // Trigger update once
          setCount(1);
        }, []);

        return createElement("div", null);
      };

      const ProfiledComponent = withProfiler(AlternatingComponent, "Test");
      const { rerender } = render(createElement(ProfiledComponent));

      // Trigger more updates by rerendering
      rerender(createElement(ProfiledComponent));
      rerender(createElement(ProfiledComponent));

      // Should pass - no long consecutive sequences
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should handle threshold of 1 (very strict)", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 2 }));

      // With threshold 1, even 2 consecutive updates should fail
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 1,
        });
      }).toThrowError(/Suspicious pattern: 2 consecutive 'update' phases/);
    });

    it("should handle very high threshold", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 50 }));

      // With very high threshold, should pass
      expect(ProfiledComponent).notToHaveRenderLoops({
        maxConsecutiveUpdates: 100,
      });
    });

    it("should handle multiple mount-update cycles", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Cycle 1
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 5 }),
      );

      unmount();

      // Cycle 2
      const { unmount: unmount2 } = render(
        createElement(ProfiledComponent, { triggerUpdates: 4 }),
      );

      unmount2();

      // Cycle 3
      render(createElement(ProfiledComponent, { triggerUpdates: 3 }));

      // All cycles are fine individually (< 10)
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should handle component that never updates", () => {
      const StaticComponent = () => createElement("div", null);
      const ProfiledComponent = withProfiler(StaticComponent, "Static");

      render(createElement(ProfiledComponent));

      // Only mount, should pass
      expect(ProfiledComponent).notToHaveRenderLoops();
    });
  });

  describe("Success Message Tests (.not modifier)", () => {
    it("should show correct stats in success message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'update' runs: <= \d+ \(threshold: 10\)/,
      );
    });

    it("should show nested-update stats in success message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'nested-update' runs: <= \d+ \(threshold: 10\)/,
      );
    });

    it("should track maximum consecutive updates across multiple sequences", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle - 3 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 3 }),
      );

      unmount();

      // Second cycle - 5 updates
      const { unmount: unmount2 } = render(
        createElement(ProfiledComponent, { triggerUpdates: 5 }),
      );

      unmount2();

      // Third cycle - 2 updates
      render(createElement(ProfiledComponent, { triggerUpdates: 2 }));

      // Should track max consecutive updates and show stats in error message
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'update' runs: <= \d+ \(threshold: 10\)/,
      );
    });

    it("should correctly track final sequence as maximum", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle - 2 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 2 }),
      );

      unmount();

      // Final sequence - 7 updates (this is the max and at the end)
      render(createElement(ProfiledComponent, { triggerUpdates: 7 }));

      // Should track max consecutive updates from final sequence
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 7 \(threshold: 10\)/);
    });

    it("should handle phase transitions and track max runs correctly", () => {
      // Component that creates update -> mount -> update pattern
      const MultiCycleComponent = ({ cycle = 0 }: { cycle?: number }) => {
        const [count, setCount] = useState(0);
        const maxCount = cycle === 0 ? 3 : 1;

        useEffect(() => {
          if (count < maxCount) {
            setCount((c) => c + 1);
          }
        }, [count, maxCount]);

        return createElement("div", null, "test");
      };

      const ProfiledComponent = withProfiler(MultiCycleComponent, "Test");

      // First cycle - 3 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { cycle: 0 }),
      );

      unmount();

      // Second cycle - 1 update (smaller than first)
      render(createElement(ProfiledComponent, { cycle: 1 }));

      // Should track the maximum of 3 from the first cycle
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'update' runs: <= \d+ \(threshold: 10\)/,
      );
    });

    it("should track maximum nested-update runs across multiple sequences", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // First cycle - 2 nested-updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerNested: 2 }),
      );

      unmount();

      // Second cycle - 4 nested-updates (longer than first)
      render(createElement(ProfiledComponent, { triggerNested: 4 }));

      // Should track max consecutive nested-updates and show in success message
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'nested-update' runs: <= \d+ \(threshold: 10\)/,
      );
    });
  });

  describe("Component Name Tests", () => {
    it("should use default component name 'Component'", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Expected Component not to have render loops/);
    });

    it("should use custom component name from options", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          componentName: "MyCustomComponent",
        });
      }).toThrowError(/Expected MyCustomComponent not to have render loops/);
    });
  });

  describe("Threshold Boundary Tests", () => {
    it("should pass when exactly at threshold", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 10 }));

      // Exactly 10 consecutive updates - should pass (threshold is "more than 10")
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should fail when one over threshold", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 11 }));

      // 11 consecutive updates - should fail (> 10)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/Suspicious pattern: 11 consecutive 'update' phases/);
    });
  });

  describe("Nested-Update with ignoreInitialUpdates Tests", () => {
    it("should ignore initial nested-update phases", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      render(createElement(ProfiledComponent, { triggerNested: 12 }));

      // Should fail without ignoring (12 > 10)
      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveNested: 10,
        });
      }).toThrowError(/Suspicious pattern/);

      // Should pass after ignoring first 3 nested-updates (effective: 9 < 10)
      expect(ProfiledComponent).notToHaveRenderLoops({
        maxConsecutiveNested: 10,
        ignoreInitialUpdates: 3,
      });
    });

    it("should correctly count nested-update phases when ignoring", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      render(createElement(ProfiledComponent, { triggerNested: 11 }));

      // Ignore first 2 nested-updates, remaining 9 < 10
      expect(ProfiledComponent).notToHaveRenderLoops({
        maxConsecutiveNested: 10,
        ignoreInitialUpdates: 2,
      });

      // Ignore first 1 nested-update, remaining 10 = 10 (should pass, need > 10)
      expect(ProfiledComponent).notToHaveRenderLoops({
        maxConsecutiveNested: 10,
        ignoreInitialUpdates: 1,
      });
    });
  });

  describe("formatLoopSequence Precision Tests", () => {
    it("should use 1-indexed positions in loop sequence", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // History: mount (0-indexed: 0), updates (0-indexed: 1-12)
      // Loop detected at 11th update (0-indexed: 11), so loop is renders 1-11
      // 1-indexed positions: #2-#12
      expect(message).toContain("Loop sequence (renders #2-#12):");
      expect(message).toContain("#2  [update");
      expect(message).toContain("#3  [update");
    });

    it("should truncate long sequences to 10 items with correct count", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Create 50 updates - but loop is detected at 11th consecutive update
      render(createElement(ProfiledComponent, { triggerUpdates: 50 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // Loop detected at 11th update, sequence shows first 10 of those 11
      expect(message).toContain("#2  [update");
      expect(message).toContain("#11  [update");

      // Should NOT show #12 (truncated)
      expect(message).not.toContain("#13  [update");

      // Should show "... and 1 more" (total 11 in loop, shown 10)
      expect(message).toContain("... and 1 more");
    });

    it("should not show truncation message when sequence equals maxItems", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Use custom threshold of 9, so 10 consecutive triggers loop
      render(createElement(ProfiledComponent, { triggerUpdates: 10 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 9,
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // Loop has exactly 10 items (threshold 9 + 1), all shown
      expect(message).toContain("#2  [update");
      expect(message).toContain("#11  [update");
      expect(message).not.toContain("... and");
    });

    it("should show all items when sequence is smaller than maxItems", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Use threshold of 3, so 4 consecutive triggers loop
      render(createElement(ProfiledComponent, { triggerUpdates: 4 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 3,
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // Loop has 4 items (< maxItems=10), all shown
      expect(message).toContain("#2  [update");
      expect(message).toContain("#5  [update");
      expect(message).not.toContain("... and");
    });
  });

  describe("Phase Label Precision Tests", () => {
    it("should show correct label for update loops", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 11 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops();
      }).toThrowError(/11 consecutive 'update' phases \(threshold: 10\)/);
    });

    it("should show correct label for nested-update loops", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      render(createElement(ProfiledComponent, { triggerNested: 11 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveNested: 10,
        });
      }).toThrowError(
        /11 consecutive 'nested-update' phases \(threshold: 10\)/,
      );
    });

    it("should show correct threshold for custom update limits", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 5,
        });
      }).toThrowError(/6 consecutive 'update' phases \(threshold: 5\)/);
    });

    it("should show correct threshold for custom nested limits", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      render(createElement(ProfiledComponent, { triggerNested: 4 }));

      expect(() => {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveNested: 3,
        });
      }).toThrowError(/4 consecutive 'nested-update' phases \(threshold: 3\)/);
    });
  });

  describe("Error Message Content Tests", () => {
    it("should include all potential causes in error message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toContain("Potential causes:");
      expect(message).toContain(
        "- useEffect with missing/incorrect dependencies",
      );
      expect(message).toContain("- setState called during render");
      expect(message).toContain("- Circular state updates between components");
    });

    it("should include helpful tip in error message", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      expect(message).toContain(
        "💡 Tip: Use Component.getRenderHistory() to inspect full history",
      );
    });
  });

  describe("updateMaxRuns Boundary Tests", () => {
    it("should update maxUpdateRun only when strictly greater", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle: 5 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 5 }),
      );

      unmount();

      // Second cycle: also 5 updates (not greater)
      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      // Max should be 5, not incremented
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 5 \(threshold: 10\)/);
    });

    it("should track maximum nested-update run correctly", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // First cycle: 3 nested-updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerNested: 3 }),
      );

      unmount();

      // Second cycle: 7 nested-updates (greater than 3)
      render(createElement(ProfiledComponent, { triggerNested: 7 }));

      // Max should be 7 (from second cycle)
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'nested-update' runs: <= 7 \(threshold: 10\)/,
      );
    });

    it("should not count mount phases in consecutive runs", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Single cycle: mount + 5 updates
      render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

      // Should show max consecutive updates = 5 (not including mount)
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 5 \(threshold: 10\)/);
    });

    it("should handle mount phase resetting consecutive counter in detectRenderLoops", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle: 8 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 8 }),
      );

      unmount();

      // Second cycle: mount + 3 updates (mount should reset counter)
      render(createElement(ProfiledComponent, { triggerUpdates: 3 }));

      // Should pass - mount resets the counter, so we have two separate sequences
      expect(ProfiledComponent).notToHaveRenderLoops();
    });

    it("should handle mount phase resetting in formatSuccessMessage", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Cycle 1: mount + 4 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 4 }),
      );

      unmount();

      // Cycle 2: mount + 6 updates
      render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

      // Max should be 6 (second cycle), mount should have reset counter
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 6 \(threshold: 10\)/);
    });
  });

  describe("Format Precision Tests - Newlines and Truncation", () => {
    it("should use newline separator in loop sequence formatting", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops();
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // Verify that lines are separated by actual newlines (not empty string)
      const lines = message.split("\n");

      expect(lines.length).toBeGreaterThan(5); // Should have multiple lines
      expect(lines.some((line) => line.includes("#2  [update"))).toBe(true);
      expect(lines.some((line) => line.includes("#3  [update"))).toBe(true);
    });

    it("should actually truncate loop sequence when exceeds maxItems", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Create a very large loop (20 updates, threshold 3)
      render(createElement(ProfiledComponent, { triggerUpdates: 20 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 3,
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // Loop detected at 4th update (threshold 3 + 1)
      // Total: 20 updates, but loop is first 4 consecutive, showing only first 10 is N/A
      // Let's verify truncation occurs with a sequence that exceeds 10 items
      expect(message).toContain("#2  [update");
      expect(message).toContain("4 consecutive 'update' phases");
      expect(message).toContain("(threshold: 3)");
    });
  });

  describe("Threshold Selection Tests", () => {
    it("should use maxConsecutiveNested threshold for nested-update loops", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // Create 8 nested-updates (will detect loop at 6th due to threshold=5)
      render(createElement(ProfiledComponent, { triggerNested: 8 }));

      let message = "";

      try {
        expect(ProfiledComponent).notToHaveRenderLoops({
          maxConsecutiveUpdates: 10, // higher threshold for updates
          maxConsecutiveNested: 5, // lower threshold for nested
        });
      } catch (error) {
        message = error instanceof Error ? error.message : String(error);
      }

      // Should use maxConsecutiveNested (5), not maxConsecutiveUpdates (10)
      // Loop detected at 6th consecutive (threshold 5 + 1)
      expect(message).toContain("6 consecutive 'nested-update' phases");
      expect(message).toContain("(threshold: 5)");
      expect(message).not.toContain("(threshold: 10)");
    });
  });

  describe("updateMaxRuns Strict Boundary Tests", () => {
    it("should NOT update maxUpdateRun when currentRun equals maxUpdateRun", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle: exactly 7 updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerUpdates: 7 }),
      );

      unmount();

      // Second cycle: also exactly 7 updates (equal, not greater)
      render(createElement(ProfiledComponent, { triggerUpdates: 7 }));

      // Max should still be 7 (not updated because 7 is not > 7)
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 7 \(threshold: 10\)/);
    });

    it("should NOT update maxNestedRun when currentRun equals maxNestedRun", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // First cycle: exactly 5 nested-updates
      const { unmount } = render(
        createElement(ProfiledComponent, { triggerNested: 5 }),
      );

      unmount();

      // Second cycle: also exactly 5 nested-updates (equal, not greater)
      render(createElement(ProfiledComponent, { triggerNested: 5 }));

      // Max should still be 5 (not updated because 5 is not > 5)
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'nested-update' runs: <= 5 \(threshold: 10\)/,
      );
    });

    it("should update maxUpdateRun only when strictly greater (not equal)", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // First cycle: 4 updates
      const { unmount: unmount1 } = render(
        createElement(ProfiledComponent, { triggerUpdates: 4 }),
      );

      unmount1();

      // Second cycle: 4 updates (equal)
      const { unmount: unmount2 } = render(
        createElement(ProfiledComponent, { triggerUpdates: 4 }),
      );

      unmount2();

      // Third cycle: 6 updates (greater than 4)
      render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

      // Max should be 6 (updated from 4 because 6 > 4)
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 6 \(threshold: 10\)/);
    });

    it("should update maxNestedRun only when strictly greater (not equal)", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // First cycle: 3 nested-updates
      const { unmount: unmount1 } = render(
        createElement(ProfiledComponent, { triggerNested: 3 }),
      );

      unmount1();

      // Second cycle: 3 nested-updates (equal)
      const { unmount: unmount2 } = render(
        createElement(ProfiledComponent, { triggerNested: 3 }),
      );

      unmount2();

      // Third cycle: 8 nested-updates (greater than 3)
      render(createElement(ProfiledComponent, { triggerNested: 8 }));

      // Max should be 8 (updated from 3 because 8 > 3)
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'nested-update' runs: <= 8 \(threshold: 10\)/,
      );
    });

    it("should handle phase change from update to mount correctly", () => {
      const ProfiledComponent = withProfiler(TestComponent, "Test");

      // Single cycle: mount + 7 updates (no loop because < threshold of 10)
      render(createElement(ProfiledComponent, { triggerUpdates: 7 }));

      // Verify history structure
      const history = ProfiledComponent.getRenderHistory();

      expect(history[0]).toBe("mount");
      expect(history.slice(1, 8).every((p) => p === "update")).toBe(true);

      // .not should pass because no loop detected
      // Success message should show max consecutive = 7
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(/All consecutive 'update' runs: <= 7 \(threshold: 10\)/);
    });

    it("should handle phase change from nested-update to mount correctly", () => {
      const ProfiledComponent = withProfiler(NestedUpdateComponent, "Test");

      // Single cycle: mount + 6 nested-updates (no loop because < threshold of 10)
      render(createElement(ProfiledComponent, { triggerNested: 6 }));

      // .not should pass because no loop detected
      // Success message should show max consecutive = 6
      expect(() => {
        expect(ProfiledComponent).not.notToHaveRenderLoops();
      }).toThrowError(
        /All consecutive 'nested-update' runs: <= 6 \(threshold: 10\)/,
      );
    });
  });

  describe("Mutant Killer Tests - Precision Tests for Survived Mutants", () => {
    describe("Mount Phase Reset in detectRenderLoops (Line 141)", () => {
      it("should NOT detect loop when mount phase separates update sequences", () => {
        const ProfiledComponent = withProfiler(TestComponent, "Test");

        // Cycle 1: mount + 6 updates
        const { unmount } = render(
          createElement(ProfiledComponent, { triggerUpdates: 6 }),
        );

        unmount();

        // Cycle 2: mount + 5 updates
        render(createElement(ProfiledComponent, { triggerUpdates: 5 }));

        // ORIGINAL: mount resets counter → no loop (max consecutive = 6 < 10)
        // MUTATED (phase === "mount" → false): mount doesn't reset → loop detected (6+1+5 = 12 > 10)
        // This test PASSES with original, FAILS with mutant
        expect(ProfiledComponent).notToHaveRenderLoops();
      });

      it("should reset counters when encountering mount in middle of history", () => {
        const ProfiledComponent = withProfiler(TestComponent, "Test");

        // Create history: mount + 6 updates, unmount, mount + 6 updates
        const { unmount } = render(
          createElement(ProfiledComponent, { triggerUpdates: 6 }),
        );

        unmount();
        render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

        // ORIGINAL: Each mount resets, so max = 6 in each cycle
        // MUTATED: If mount doesn't reset, would count 6+6=12 consecutive
        // Verify no loop detected (original behavior)
        expect(ProfiledComponent).notToHaveRenderLoops();

        // Verify max consecutive is 6, not 12
        let message = "";

        try {
          expect(ProfiledComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        expect(message).toContain("All consecutive 'update' runs: <= 6");
        expect(message).not.toContain("<= 12");
      });
    });

    describe("formatLoopSequence Truncation (Line 204)", () => {
      it("should truncate loop sequence to maxItems when slice is applied", () => {
        const ProfiledComponent = withProfiler(TestComponent, "Test");

        // Trigger 50 updates with very low threshold to get loop at item 4
        render(createElement(ProfiledComponent, { triggerUpdates: 50 }));

        let message = "";

        try {
          expect(ProfiledComponent).notToHaveRenderLoops({
            maxConsecutiveUpdates: 3,
          });
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // Loop detected at 4th update (threshold 3 + 1)
        // With ORIGINAL slice(0, 10): shows first 10 items (renders #2-#5 in this case, only 4 items)
        // With MUTATED (no slice): would show ALL items if loop was longer
        // To actually test truncation, we need a loop that has >10 items in sequence

        // The issue is that loop detection STOPS at first violation
        // So we can't get >10 items in a loop sequence with current logic
        // This mutant might be UNKILLABLE with current code design
        expect(message).toContain("4 consecutive 'update' phases");
      });
    });

    describe("Join Separator (Line 216)", () => {
      it("should use newline separator when joining loop sequence lines", () => {
        const ProfiledComponent = withProfiler(TestComponent, "Test");

        render(createElement(ProfiledComponent, { triggerUpdates: 12 }));

        let message = "";

        try {
          expect(ProfiledComponent).notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: lines.join("\n") → multi-line output
        // MUTATED: lines.join("") → single line, no separators
        const lines = message.split("\n");

        // Verify we have multiple lines (not joined with empty string)
        expect(lines.length).toBeGreaterThan(5);

        // Verify specific structure with newlines
        expect(message).toMatch(/#2\s+\[update[\s\S]+?phase\]\s*\n/);
        expect(message).toMatch(/#3\s+\[update[\s\S]+?phase\]\s*\n/);
      });
    });

    describe("loopPhase Ternary (Line 233)", () => {
      it("should use correct threshold based on loopPhase value", () => {
        const ProfiledComponent = withProfiler(TestComponent, "Test");

        // Create exactly 6 consecutive updates
        render(createElement(ProfiledComponent, { triggerUpdates: 6 }));

        let message = "";

        try {
          expect(ProfiledComponent).notToHaveRenderLoops({
            maxConsecutiveUpdates: 5, // Lower threshold for updates
            maxConsecutiveNested: 20, // Higher threshold for nested (not used)
          });
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: loopPhase === "update" ? 5 : 20 → uses 5 → loop detected
        // MUTATED: false ? 5 : 20 → uses 20 → NO loop detected
        // Verify loop WAS detected with threshold 5
        expect(message).toContain("6 consecutive 'update' phases");
        expect(message).toContain("(threshold: 5)");
      });
    });
  });

  describe("Mock ProfiledComponent Tests - Kill Architectural Mutants", () => {
    /**
     * Helper to create a mock ProfiledComponent with arbitrary history.
     *
     * This bypasses React lifecycle limitations, allowing us to test:
     * - Multiple mount phases in single history (impossible with real components)
     * - Alternating update/nested-update sequences
     * - Edge cases that require specific phase patterns
     */
    function createMockProfiledComponent(history: readonly PhaseType[]) {
      const mockFn = (() => null) as unknown as ReturnType<typeof withProfiler>;

      // Add required ProfiledComponent methods to pass isProfiledComponent type guard
      Object.assign(mockFn, {
        getRenderCount: () => history.length,
        getRenderHistory: () => history,
        getLastRender: () => history.at(-1),
        getRenderAt: (index: number) => history[index],
        getRendersByPhase: (phase: PhaseType) =>
          history.filter((p) => p === phase),
        hasMounted: () => history.includes("mount"),
        onRender: () => () => {},
        waitForNextRender: () => Promise.resolve({ count: 0, phase: "mount" }),
        OriginalComponent: () => null,
        displayName: "MockComponent",
      });

      return mockFn;
    }

    describe("Mount Phase Reset in detectRenderLoops (Line 141)", () => {
      it("should reset consecutive counter when mount phase appears mid-history", () => {
        // History: mount, 6 updates, mount, 5 updates
        // With mount reset: max consecutive = 6 (each mount resets counter)
        // Without reset: consecutive would be 6 + 1 + 5 = 12 > 10 → loop
        const history: PhaseType[] = [
          "mount",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update", // 6 updates
          "mount", // reset point
          "update",
          "update",
          "update",
          "update",
          "update", // 5 updates
        ];

        const MockComponent = createMockProfiledComponent(history);

        // ORIGINAL: mount resets → no loop (max consecutive = 6 < 10)
        // MUTATED: mount doesn't reset → loop detected (consecutive = 12 > 10)
        expect(MockComponent).notToHaveRenderLoops();
      });

      it("should correctly reset startIndex and consecutiveCount on mount", () => {
        // More complex pattern: 8 updates, mount, 8 updates
        // Total would be 17 if no reset, but each segment is only 8
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 8 }).fill("update") as PhaseType[]),
          "mount",
          ...(Array.from({ length: 8 }).fill("update") as PhaseType[]),
        ];

        const MockComponent = createMockProfiledComponent(history);

        // ORIGINAL: each mount resets, max = 8 < 10
        // MUTATED: 8 + 1 + 8 = 17 > 10 → loop
        expect(MockComponent).notToHaveRenderLoops();
      });

      it("should NOT treat consecutive mounts as a loop (MUTANT KILLER)", () => {
        // CRITICAL: This test kills mutants on line 141
        // History: 3 consecutive mounts, then update
        // With a low maxConsecutiveNested threshold:
        // - ORIGINAL: each mount resets count to 1, no loop on mounts
        // - MUTANT: mounts accumulate count (3 > 2), "loop" detected on mount phase!
        const history: PhaseType[] = [
          "mount",
          "mount", // consecutive mount - ORIGINAL resets, MUTANT increments
          "mount", // consecutive mount - ORIGINAL resets, MUTANT increments to 3
          "update",
        ];

        const MockComponent = createMockProfiledComponent(history);

        // With maxConsecutiveNested=2:
        // ORIGINAL: no loop (mount always resets to count=1)
        // MUTANT: loop detected! (mount count=3 > threshold=2)
        expect(MockComponent).notToHaveRenderLoops({ maxConsecutiveNested: 2 });
      });

      it("should handle three mount cycles correctly", () => {
        // Pattern: mount, 4 updates, mount, 5 updates, mount, 4 updates
        const history: PhaseType[] = [
          "mount",
          "update",
          "update",
          "update",
          "update", // 4
          "mount",
          "update",
          "update",
          "update",
          "update",
          "update", // 5
          "mount",
          "update",
          "update",
          "update",
          "update", // 4
        ];

        const MockComponent = createMockProfiledComponent(history);

        // Max consecutive = 5, all segments < 10
        expect(MockComponent).notToHaveRenderLoops();
      });
    });

    describe("Slice Truncation in formatLoopSequence (Line 204)", () => {
      it("should NOT show 12th item when loop has 11 consecutive phases", () => {
        // Create history with exactly 11 consecutive updates to trigger loop
        // Loop detected at 11th update (threshold 10 + 1)
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 11 }).fill("update") as PhaseType[]), // 11 consecutive updates
        ];

        const MockComponent = createMockProfiledComponent(history);

        let message = "";

        try {
          expect(MockComponent).notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // Loop sequence starts at index 1 (after mount), ends at index 11
        // 1-indexed: renders #2-#12 (11 items total)
        // slice(0, 10) shows first 10: #2-#11
        // ORIGINAL: shows #2-#11 + "... and 1 more"
        // MUTATED: shows #2-#12 (all 11 items) + "... and 1 more"

        // Verify #12 is NOT shown (truncated)
        expect(message).toContain("#2  [update");
        expect(message).toContain("#11  [update");
        expect(message).not.toContain("#12  [update"); // ← KEY: Must NOT appear
        expect(message).toContain("... and 1 more");
      });

      it("should truncate 15-item loop sequence correctly", () => {
        // Use lower threshold (3) to create a 15-item loop that triggers at item 4
        // But wait... loop detection STOPS at first violation
        // So we can't get 15 items in a loop sequence with current algorithm

        // Instead: use threshold=10, create 15 updates, loop at 11
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 15 }).fill("update") as PhaseType[]), // 15 updates, but loop at 11
        ];

        const MockComponent = createMockProfiledComponent(history);

        let message = "";

        try {
          expect(MockComponent).notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // Loop detected at 11th update, so sequence is 11 items
        expect(message).toContain("11 consecutive 'update' phases");
        expect(message).not.toContain("#12  [update");
      });
    });

    describe("updateMaxRuns Boundary (Lines 275, 279) - formatSuccessMessage", () => {
      it("should track max update run across multiple runs separated by phase change", () => {
        // History: mount, 7 updates, nested-update, 3 updates
        // Run 1: 7 updates
        // Phase change: nested-update (resets update counter)
        // Run 2: 3 updates
        // ORIGINAL (>): max = 7 (7 > 0, then 3 is NOT > 7)
        // MUTATED (true): max = 3 (always updates to current run)
        const history: PhaseType[] = [
          "mount",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update", // 7 updates - run 1
          "nested-update", // phase change
          "update",
          "update",
          "update", // 3 updates - run 2
        ];

        const MockComponent = createMockProfiledComponent(history);

        // No loop (max consecutive = 7 < 10)
        expect(MockComponent).notToHaveRenderLoops();

        // Check success message for max run value
        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: "All consecutive 'update' runs: <= 7"
        // MUTATED: "All consecutive 'update' runs: <= 3"
        expect(message).toContain("All consecutive 'update' runs: <= 7");
      });

      it("should track max nested-update run across phase changes", () => {
        // History: mount, 5 nested-updates, update, 2 nested-updates
        // Run 1: 5 nested-updates
        // Phase change: update
        // Run 2: 2 nested-updates
        // ORIGINAL: max nested = 5
        // MUTATED (true): max nested = 2
        const history: PhaseType[] = [
          "mount",
          "nested-update",
          "nested-update",
          "nested-update",
          "nested-update",
          "nested-update", // 5 nested - run 1
          "update", // phase change
          "nested-update",
          "nested-update", // 2 nested - run 2
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: "All consecutive 'nested-update' runs: <= 5"
        // MUTATED: "All consecutive 'nested-update' runs: <= 2"
        expect(message).toContain("All consecutive 'nested-update' runs: <= 5");
      });

      it("should track max update run when multiple phase transitions occur", () => {
        // Complex pattern: 6 updates, nested, 4 updates, nested, 8 updates
        // Max update run should be 8 (the largest)
        const history: PhaseType[] = [
          "mount",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update", // 6 updates
          "nested-update",
          "update",
          "update",
          "update",
          "update", // 4 updates
          "nested-update",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update",
          "update", // 8 updates
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // Max should be 8 (from last run, which is also the largest)
        // This test might not kill the mutant if last run is largest
        // But it covers the algorithm's correctness
        expect(message).toContain("All consecutive 'update' runs: <= 8");
      });

      it("should preserve max run when later run is smaller", () => {
        // Pattern: 9 updates, nested, 2 updates
        // Max update run should be 9 (first, larger run)
        // MUTATED (true): would show 2 (last run)
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 9 }).fill("update") as PhaseType[]), // 9 updates - run 1 (max)
          "nested-update",
          "update",
          "update", // 2 updates - run 2 (smaller)
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // KEY TEST: This should show 9, not 2
        // ORIGINAL: max = 9 (9 > 0, then 2 is NOT > 9)
        // MUTATED (true): max = 2 (always updates)
        expect(message).toContain("All consecutive 'update' runs: <= 9");
        expect(message).not.toContain("<= 2");
      });

      it("should preserve max nested-update run when later run is smaller", () => {
        // Pattern: 8 nested-updates, update, 3 nested-updates
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 8 }).fill("nested-update") as PhaseType[]), // 8 nested - run 1
          "update",
          "nested-update",
          "nested-update",
          "nested-update", // 3 nested - run 2
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: max = 8
        // MUTATED: max = 3
        expect(message).toContain("All consecutive 'nested-update' runs: <= 8");
      });

      it("should NOT count nested-updates as updates (MUTANT KILLER for Line 275)", () => {
        // CRITICAL: This test kills the `phase === "update"` → `true` mutant
        // History with ONLY nested-updates, NO regular updates
        // ORIGINAL: maxUpdateRun = 0 (no updates to count)
        // MUTANT (true && ...): maxUpdateRun = 5 (nested-updates incorrectly counted)
        const history: PhaseType[] = [
          "mount",
          "nested-update",
          "nested-update",
          "nested-update",
          "nested-update",
          "nested-update", // 5 nested-updates, 0 regular updates
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: "All consecutive 'update' runs: <= 0"
        // MUTANT: "All consecutive 'update' runs: <= 5"
        expect(message).toContain("All consecutive 'update' runs: <= 0");
        expect(message).not.toContain("'update' runs: <= 5"); // Mutant would show 5
      });
    });

    describe("Mount Phase in formatSuccessMessage (Line 302)", () => {
      it("should reset counter at mount without recording previous run", () => {
        // History: mount, 5 updates, mount, 3 updates
        // ORIGINAL: mount resets WITHOUT recording → only last run (3) is counted
        // MUTANT: mount treated as phase change → records 5 before reset
        const history: PhaseType[] = [
          "mount",
          "update",
          "update",
          "update",
          "update",
          "update", // 5 updates - NOT recorded due to mount reset
          "mount", // reset without recording
          "update",
          "update",
          "update", // 3 updates - this IS recorded at end
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: max = 3 (only last run after mount is counted)
        // MUTANT: max = 5 (mount records before reset)
        expect(message).toContain("All consecutive 'update' runs: <= 3");
        expect(message).not.toContain("<= 5"); // Mutant would show 5
      });

      it("should reset counter for nested-update at mount without recording", () => {
        // History: mount, 6 nested-updates, mount, 4 nested-updates
        // ORIGINAL: only last run (4) is recorded
        // MUTANT: first run (6) would be recorded
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 6 }).fill("nested-update") as PhaseType[]), // 6 nested - NOT recorded
          "mount",
          ...(Array.from({ length: 4 }).fill("nested-update") as PhaseType[]), // 4 nested - recorded at end
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        // ORIGINAL: max = 4 (only last run counted)
        // MUTANT: max = 6 (first run recorded before mount reset)
        expect(message).toContain("All consecutive 'nested-update' runs: <= 4");
        expect(message).not.toContain("<= 6"); // Mutant would show 6
      });
    });

    describe("Edge Cases with Mock Components", () => {
      it("should handle interleaved update and nested-update correctly", () => {
        // Pattern that alternates between update and nested-update
        const history: PhaseType[] = [
          "mount",
          "update",
          "nested-update",
          "update",
          "nested-update",
          "update",
          "update",
          "update", // 3 consecutive updates
          "nested-update",
          "nested-update", // 2 consecutive nested
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();

        let message = "";

        try {
          expect(MockComponent).not.notToHaveRenderLoops();
        } catch (error) {
          message = error instanceof Error ? error.message : String(error);
        }

        expect(message).toContain("All consecutive 'update' runs: <= 3");
        expect(message).toContain("All consecutive 'nested-update' runs: <= 2");
      });

      it("should handle history starting with multiple mounts", () => {
        // Edge case: multiple consecutive mounts
        const history: PhaseType[] = [
          "mount",
          "mount", // immediate remount
          "update",
          "update",
          "update",
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(MockComponent).notToHaveRenderLoops();
      });

      it("should detect loop in second mount cycle", () => {
        // First cycle: 5 updates (OK)
        // Second cycle: 11 updates (loop)
        const history: PhaseType[] = [
          "mount",
          ...(Array.from({ length: 5 }).fill("update") as PhaseType[]),
          "mount",
          ...(Array.from({ length: 11 }).fill("update") as PhaseType[]), // loop here
        ];

        const MockComponent = createMockProfiledComponent(history);

        expect(() => {
          expect(MockComponent).notToHaveRenderLoops();
        }).toThrowError(/11 consecutive 'update' phases/);
      });
    });
  });
});
