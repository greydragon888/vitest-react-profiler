/**
 * Stabilization API Examples for Performance Testing (v1.12.0)
 *
 * This file demonstrates how to use waitForStabilization() for
 * performance testing scenarios like animations, virtualization,
 * and complex data loading.
 *
 * @see https://github.com/greydragon888/vitest-react-profiler
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useState, useEffect } from "react";
import { withProfiler } from "@/index";

// ═══════════════════════════════════════════════════════════════════
// Test Components
// ═══════════════════════════════════════════════════════════════════

/**
 * Simulated virtualized list component
 */
function VirtualList({ scrollTop }: { scrollTop: number }) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    // Calculate visible items based on scroll position
    const startIndex = Math.floor(scrollTop / 50);
    const visible = Array.from({ length: 10 }, (_, i) => startIndex + i);

    setVisibleItems(visible);
  }, [scrollTop]);

  return (
    <div data-testid="virtual-list">
      {visibleItems.map((item) => (
        <div key={item}>Item {item}</div>
      ))}
    </div>
  );
}

/**
 * Simulated animated counter component
 */
function AnimatedCounter({ targetValue }: { targetValue: number }) {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (currentValue < targetValue) {
      const timer = setTimeout(() => {
        setCurrentValue((c) => Math.min(c + 10, targetValue));
      }, 16); // ~60fps

      return () => {
        clearTimeout(timer);
      };
    }
  }, [currentValue, targetValue]);

  return <div data-testid="counter">{currentValue}</div>;
}

/**
 * Component with cascading updates
 */
function CascadingUpdates({ initialValue }: { initialValue: number }) {
  const [value1] = useState(initialValue);
  const [value2, setValue2] = useState(0);
  const [value3, setValue3] = useState(0);

  useEffect(() => {
    setValue2(value1 * 2);
  }, [value1]);

  useEffect(() => {
    setValue3(value2 * 2);
  }, [value2]);

  return (
    <div>
      <span data-testid="v1">{value1}</span>
      <span data-testid="v2">{value2}</span>
      <span data-testid="v3">{value3}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Performance Tests with Stabilization
// ═══════════════════════════════════════════════════════════════════

describe("Performance Testing with Stabilization API", () => {
  describe("Animation Performance", () => {
    /**
     * Test that animation completes within performance budget
     */
    it("should complete counter animation within time budget", async () => {
      const ProfiledCounter = withProfiler(AnimatedCounter, "AnimatedCounter");
      const startTime = performance.now();

      render(<ProfiledCounter targetValue={100} />);

      // Wait for animation to stabilize
      const result = await ProfiledCounter.waitForStabilization({
        debounceMs: 50, // Animation frame + buffer
        timeout: 2000, // Max animation time
      });

      const elapsed = performance.now() - startTime;

      // Performance assertions
      expect(elapsed).toBeLessThan(500); // Animation should complete quickly
      expect(result.renderCount).toBeGreaterThan(0);
      expect(result.lastPhase).toBe("update");

      console.log(
        `Animation completed in ${elapsed.toFixed(0)}ms with ${result.renderCount} frames`,
      );
    });

    /**
     * Test animation frame count is within budget
     */
    it("should animate with reasonable frame count", async () => {
      const ProfiledCounter = withProfiler(AnimatedCounter, "AnimatedCounter");

      render(<ProfiledCounter targetValue={50} />);

      const result = await ProfiledCounter.waitForStabilization({
        debounceMs: 50,
        timeout: 1000,
      });

      // 50 / 10 = 5 frames minimum for counting up by 10
      expect(result.renderCount).toBeGreaterThanOrEqual(5);
      expect(result.renderCount).toBeLessThanOrEqual(10); // Reasonable upper bound
    });
  });

  describe("Virtualization Performance", () => {
    /**
     * Test virtual list stabilizes after scroll burst
     */
    it("should stabilize after rapid scroll updates", async () => {
      const ProfiledList = withProfiler(VirtualList, "VirtualList");
      const { rerender } = render(<ProfiledList scrollTop={0} />);

      // Start stabilization tracking
      const stabilizationPromise = ProfiledList.waitForStabilization({
        debounceMs: 30, // Quick stabilization for virtualization
        timeout: 1000,
      });

      // Simulate rapid scrolling
      const scrollPositions = [100, 200, 300, 400, 500];

      for (const scrollTop of scrollPositions) {
        rerender(<ProfiledList scrollTop={scrollTop} />);
        // Small delay to simulate scroll events
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const result = await stabilizationPromise;

      // Each scroll position triggers at least one render
      expect(result.renderCount).toBeGreaterThanOrEqual(scrollPositions.length);
      expect(result.lastPhase).toBe("update");

      console.log(
        `Virtual list stabilized after ${result.renderCount} scroll updates`,
      );
    });

    /**
     * Test virtual list doesn't over-render during scroll
     */
    it("should not exceed render budget during scroll", async () => {
      const ProfiledList = withProfiler(VirtualList, "VirtualList");
      const { rerender } = render(<ProfiledList scrollTop={0} />);

      // Budget: 11 scroll positions × 2 renders (rerender + useEffect update) = 22
      const RENDER_BUDGET = 25; // Max renders during scroll with buffer

      const stabilizationPromise = ProfiledList.waitForStabilization({
        debounceMs: 50,
        timeout: 1000,
      });

      // Scroll through many positions (11 total: 0, 100, 200...1000)
      for (let scrollTop = 0; scrollTop <= 1000; scrollTop += 100) {
        rerender(<ProfiledList scrollTop={scrollTop} />);
      }

      const result = await stabilizationPromise;

      // Should stay within render budget
      expect(result.renderCount).toBeLessThanOrEqual(RENDER_BUDGET);
    });
  });

  describe("Cascading Updates Performance", () => {
    /**
     * Test cascading effects stabilize quickly
     */
    it("should stabilize cascading updates within reasonable time", async () => {
      const ProfiledCascade = withProfiler(
        CascadingUpdates,
        "CascadingUpdates",
      );
      const { rerender } = render(<ProfiledCascade initialValue={1} />);

      const startTime = performance.now();

      const stabilizationPromise = ProfiledCascade.waitForStabilization({
        debounceMs: 20,
        timeout: 500,
      });

      // Trigger cascade
      rerender(<ProfiledCascade initialValue={10} />);

      const result = await stabilizationPromise;
      const elapsed = performance.now() - startTime;

      // Cascading effects should complete quickly
      expect(elapsed).toBeLessThan(100);
      // 3 values update in cascade: value1 -> value2 -> value3
      expect(result.renderCount).toBeGreaterThanOrEqual(1);

      console.log(`Cascade stabilized in ${elapsed.toFixed(0)}ms`);
    });
  });

  describe("Comparison: Old vs New API", () => {
    /**
     * OLD WAY: Manual waiting with arbitrary delays
     */
    it("OLD WAY: Using arbitrary timeouts (unreliable)", async () => {
      const ProfiledList = withProfiler(VirtualList, "VirtualList");
      const { rerender } = render(<ProfiledList scrollTop={0} />);

      rerender(<ProfiledList scrollTop={100} />);
      rerender(<ProfiledList scrollTop={200} />);

      // ❌ UNRELIABLE: Arbitrary wait, might be too short or too long
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Can't know if component is truly stable
      expect(ProfiledList.getRenderCount()).toBeGreaterThanOrEqual(3);
    });

    /**
     * NEW WAY: Using waitForStabilization
     */
    it("NEW WAY: Using waitForStabilization (reliable)", async () => {
      const ProfiledList = withProfiler(VirtualList, "VirtualList");
      const { rerender } = render(<ProfiledList scrollTop={0} />);

      const stabilizationPromise = ProfiledList.waitForStabilization({
        debounceMs: 30,
        timeout: 500,
      });

      rerender(<ProfiledList scrollTop={100} />);
      rerender(<ProfiledList scrollTop={200} />);

      // ✅ RELIABLE: Waits for actual stabilization
      const result = await stabilizationPromise;

      // Know that renders occurred and component is stable
      // Note: VirtualList has useEffect that may cause additional renders
      expect(result.renderCount).toBeGreaterThanOrEqual(2);
      expect(result.lastPhase).toBe("update");
    });
  });

  describe("Using toEventuallyStabilize Matcher", () => {
    /**
     * Declarative stabilization assertion
     */
    it("should verify component eventually stabilizes", async () => {
      const ProfiledCounter = withProfiler(AnimatedCounter, "AnimatedCounter");

      render(<ProfiledCounter targetValue={30} />);

      // Clean, declarative assertion
      await expect(ProfiledCounter).toEventuallyStabilize({
        debounceMs: 50,
        timeout: 1000,
      });
    });

    /**
     * Negative test: component should NOT stabilize during continuous updates
     */
    it("should detect when component fails to stabilize", async () => {
      // Component that continuously updates
      function InfiniteUpdater() {
        const [count, setCount] = useState(0);

        useEffect(() => {
          const timer = setInterval(() => {
            setCount((c) => c + 1);
          }, 10);

          return () => {
            clearInterval(timer);
          };
        }, []);

        return <div>{count}</div>;
      }

      const ProfiledUpdater = withProfiler(InfiniteUpdater, "InfiniteUpdater");

      render(<ProfiledUpdater />);

      // Should timeout because component never stabilizes
      await expect(
        ProfiledUpdater.waitForStabilization({
          debounceMs: 50,
          timeout: 100,
        }),
      ).rejects.toThrow(/StabilizationTimeoutError/);
    });
  });
});
