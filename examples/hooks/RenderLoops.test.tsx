import { describe, it, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { useState, useEffect } from "react";
import { withProfiler } from "@/index";

/**
 * Examples demonstrating notToHaveRenderLoops() matcher
 *
 * This matcher detects suspicious render patterns (infinite loops, cascade updates)
 * BEFORE hitting React's MAX_SAFE_RENDERS limit (10,000 renders).
 *
 * Use cases:
 * - Test hangs → add notToHaveRenderLoops → see the problem
 * - CI timeout → get informative error instead of timeout
 * - Debug performance → check render patterns in complex components
 *
 * @see https://github.com/greydragon888/vitest-react-profiler/blob/master/docs/reports/render-count-features-analysis.md#62-обнаружение-паттернов-рендеров
 */
describe("Render Loop Detection Examples", () => {
  describe("Anti-Pattern: useEffect Infinite Loop", () => {
    it("should detect useEffect without dependencies", async () => {
      // ❌ BAD: useEffect runs after EVERY render, causing infinite loop
      function BrokenCounter() {
        const [count, setCount] = useState(0);

        useEffect(() => {
          // This runs after every render and triggers another render
          if (count < 100) {
            setCount((c) => c + 1);
          }
        }); // ⚠️ Missing dependency array!

        return <div>Count: {count}</div>;
      }

      const Profiled = withProfiler(BrokenCounter, "BrokenCounter");
      render(<Profiled />);

      // Wait for some renders to happen
      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(5));

      // This will FAIL with diagnostic message showing the loop
      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 3, // Default is 10
          componentName: "BrokenCounter",
        });
      }).toThrow(/Suspicious pattern:.*consecutive 'update' phases/);
    });

    it("should pass when useEffect has correct dependencies", () => {
      // ✅ GOOD: useEffect only runs when count changes intentionally
      function FixedCounter({ initialCount }: { initialCount: number }) {
        const [count] = useState(initialCount);
        const [processed, setProcessed] = useState(-1); // Different from count * 2

        useEffect(() => {
          setProcessed(count * 2);
        }, [count]); // ✅ Correct dependency

        return (
          <div>
            Count: {count}, Processed: {processed}
          </div>
        );
      }

      const Profiled = withProfiler(FixedCounter, "FixedCounter");
      render(<Profiled initialCount={5} />);

      // 1 mount, 1 update (from useEffect: setProcessed(10))
      expect(Profiled).notToHaveRenderLoops({
        maxConsecutiveUpdates: 3,
        componentName: "FixedCounter",
      });
    });
  });

  describe("Anti-Pattern: Cascade Updates", () => {
    it("should detect multiple consecutive updates", async () => {
      // ❌ BAD: Multiple useEffect chains creating consecutive updates
      function CascadeComponent() {
        const [step1, setStep1] = useState(0);
        const [step2, setStep2] = useState(0);
        const [step3, setStep3] = useState(0);

        useEffect(() => {
          if (step1 === 0) setStep1(1);
        }, [step1]);

        useEffect(() => {
          if (step1 === 1 && step2 === 0) setStep2(1);
        }, [step1, step2]);

        useEffect(() => {
          if (step2 === 1 && step3 === 0) setStep3(1);
        }, [step2, step3]);

        return <div>{step1 + step2 + step3}</div>;
      }

      const Profiled = withProfiler(CascadeComponent, "Cascade");
      render(<Profiled />);

      // Wait for cascade to happen
      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(2));

      // Detect the suspicious pattern (4+ consecutive updates)
      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 2,
        });
      }).toThrow(/consecutive.*update/);
    });

    it("should pass when updates are properly gated", () => {
      // ✅ GOOD: Use useEffect for side effects
      function GoodComponent() {
        const [count, setCount] = useState(0);
        const [initialized, setInitialized] = useState(false);

        useEffect(() => {
          if (!initialized) {
            setCount(1);
            setInitialized(true);
          }
        }, [initialized]);

        return <div>{count}</div>;
      }

      const Profiled = withProfiler(GoodComponent);
      render(<Profiled />);

      expect(Profiled).notToHaveRenderLoops();
    });
  });

  describe("Configurable Thresholds", () => {
    it("should use default threshold (10 consecutive updates)", () => {
      const Profiled = withProfiler(() => <div>Test</div>);
      render(<Profiled />);

      // Default maxConsecutiveUpdates = 10
      expect(Profiled).notToHaveRenderLoops();
    });

    it("should allow custom threshold", async () => {
      function Component() {
        const [count, setCount] = useState(0);

        useEffect(() => {
          if (count < 5) {
            setCount((c) => c + 1);
          }
        });

        return <div>{count}</div>;
      }

      const Profiled = withProfiler(Component);
      render(<Profiled />);

      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(3));

      // This FAILS with threshold 2
      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 2, // Stricter threshold
        });
      }).toThrow();
    });

    it("should detect consecutive nested-updates", async () => {
      // Note: This test demonstrates the API, but creating actual
      // nested-update loops in React 18+ is difficult without using
      // legacy APIs or specific edge cases
      function ComponentWithUpdates() {
        const [count, setCount] = useState(0);

        useEffect(() => {
          if (count < 5) {
            setCount((c) => c + 1);
          }
        });

        return <div>{count}</div>;
      }

      const Profiled = withProfiler(ComponentWithUpdates);
      render(<Profiled />);

      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(3));

      // This demonstrates checking for both update types
      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 2,
          maxConsecutiveNested: 2,
        });
      }).toThrow(/consecutive/);
    });
  });

  describe("Ignore Initial Updates", () => {
    it("should ignore initialization updates", () => {
      function InitializingComponent() {
        const [step, setStep] = useState(0);

        useEffect(() => {
          // Initialization sequence
          if (step === 0) setStep(1);
          if (step === 1) setStep(2);
          if (step === 2) setStep(3);
        }, [step]);

        return <div>Step: {step}</div>;
      }

      const Profiled = withProfiler(InitializingComponent);
      render(<Profiled />);

      // This would normally fail, but we ignore first 3 updates
      expect(Profiled).notToHaveRenderLoops({
        ignoreInitialUpdates: 3, // Skip initialization sequence
        maxConsecutiveUpdates: 2,
      });
    });
  });

  describe("Diagnostic Messages", () => {
    it("should show detailed loop information", async () => {
      function LoopComponent() {
        const [count, setCount] = useState(0);

        useEffect(() => {
          if (count < 10) {
            setCount((c) => c + 1);
          }
        });

        return <div>{count}</div>;
      }

      const Profiled = withProfiler(LoopComponent, "LoopComponent");
      render(<Profiled />);

      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(5));

      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 3,
          componentName: "LoopComponent",
          showFullHistory: false, // Don't show full history in error
        });
      }).toThrow(/Loop sequence.*renders #/);
    });

    it("should provide potential causes in error message", async () => {
      function ProblemComponent() {
        const [count, setCount] = useState(0);

        useEffect(() => {
          if (count < 5) setCount((c) => c + 1);
        });

        return <div>{count}</div>;
      }

      const Profiled = withProfiler(ProblemComponent);
      render(<Profiled />);

      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(3));

      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 2,
        });
      }).toThrow(/Potential causes/);
    });
  });

  describe("Success Message (with .not)", () => {
    it("should explain why loop was expected but not found", () => {
      const Profiled = withProfiler(() => <div>Clean</div>);
      render(<Profiled />);

      // Using .not - expects loop but finds none
      expect(() => {
        expect(Profiled).not.notToHaveRenderLoops({
          maxConsecutiveUpdates: 5,
        });
      }).toThrow(/Expected.*to have render loops, but none were detected/);
    });
  });

  describe("Real-World Use Cases", () => {
    it("CI Timeout Debugging: Get informative error instead of timeout", async () => {
      // Imagine this test was timing out in CI
      function MysteryComponent() {
        const [data, setData] = useState<number[]>([]);

        useEffect(() => {
          // Bug: Missing dependency causes infinite refetch
          if (data.length < 100) {
            setData([...data, data.length]);
          }
        }); // ⚠️ Missing [data] dependency

        return <div>Items: {data.length}</div>;
      }

      const Profiled = withProfiler(MysteryComponent, "Mystery");
      render(<Profiled />);

      await waitFor(() => expect(Profiled.getRenderCount()).toBeGreaterThan(5));

      // Instead of CI timeout, you get clear diagnostic
      expect(() => {
        expect(Profiled).notToHaveRenderLoops({
          maxConsecutiveUpdates: 3,
          componentName: "Mystery",
        });
      }).toThrow(/consecutive.*update.*phases/);
    });

    it("Performance Debugging: Verify clean component has no loops", () => {
      // Simple component without any state updates or loops
      function Dashboard({ filter, sort, page }: { filter: string; sort: string; page: number }) {
        return (
          <div>
            Filter: {filter}, Sort: {sort}, Page: {page}
          </div>
        );
      }

      const Profiled = withProfiler(Dashboard, "Dashboard");
      render(<Profiled filter="" sort="asc" page={0} />);

      // Verify no suspicious patterns (only 1 mount, no updates)
      expect(Profiled).notToHaveRenderLoops({
        maxConsecutiveUpdates: 10,
        componentName: "Dashboard",
      });
    });
  });
});
