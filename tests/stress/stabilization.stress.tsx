/**
 * Stabilization API Stress Tests
 *
 * Tests stabilization feature under extreme conditions:
 * - 1000+ rapid renders before stabilization
 * - 50+ components with concurrent stabilization
 * - Memory leak detection through multiple cycles
 * - Rapid subscribe/unsubscribe during stabilization
 *
 * Run with: npm run test:stress
 *
 * @since v1.12.0
 */

import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

import type { FC } from "react";

// Helper to get V8 heap stats if available
const getHeapStats = () => {
  if (typeof (globalThis as unknown as { gc?: () => void }).gc === "function") {
    (globalThis as unknown as { gc: () => void }).gc();
  }

  return process.memoryUsage();
};

describe("Stabilization API Stress Tests", () => {
  describe("High-volume renders → stabilization", () => {
    it("should handle 1000 rapid renders before stabilization", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const startMemory = getHeapStats();
      const startTime = Date.now();

      // Start waiting for stabilization with longer timeout
      const stabilizationPromise = ProfiledComponent.waitForStabilization({
        debounceMs: 30,
        timeout: 5000,
      });

      // Trigger 1000 rapid renders
      for (let i = 1; i <= 1000; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      const result = await stabilizationPromise;
      const endTime = Date.now();
      const endMemory = getHeapStats();

      // Verify results
      expect(result.renderCount).toBe(1000);
      expect(result.lastPhase).toBe("update");

      // Memory should not grow excessively (< 50MB)
      const memoryGrowth = endMemory.heapUsed - startMemory.heapUsed;

      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

      // Total time should be reasonable (< 10 seconds)
      expect(endTime - startTime).toBeLessThan(10_000);

      console.log(`1000 renders:
        - Time: ${endTime - startTime}ms
        - Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB
        - renderCount: ${result.renderCount}`);
    });

    it("should handle 500 renders with very short debounce", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const startTime = Date.now();

      // Short debounce: 10ms
      const stabilizationPromise = ProfiledComponent.waitForStabilization({
        debounceMs: 10,
        timeout: 3000,
      });

      // 500 rapid renders
      for (let i = 1; i <= 500; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      const result = await stabilizationPromise;
      const elapsed = Date.now() - startTime;

      expect(result.renderCount).toBe(500);
      expect(elapsed).toBeLessThan(3000);

      console.log(`500 renders with 10ms debounce: ${elapsed}ms`);
    });
  });

  describe("Concurrent components stabilization", () => {
    it("should handle 50 components with concurrent stabilization", async () => {
      const NUM_COMPONENTS = 50;

      // Create 50 UNIQUE base components (important: globalStorage uses Component reference as key)
      // Each needs its own component definition to get separate ProfilerData
      const components = Array.from({ length: NUM_COMPONENTS }, (_, i) => {
        // Create a unique component for each index
        const UniqueComponent: FC<{ value: number }> = ({ value }) => (
          <div>
            Component {i}: {value}
          </div>
        );

        UniqueComponent.displayName = `Component${i}`;

        return {
          Profiled: withProfiler(UniqueComponent),
          id: i,
        };
      });

      // Render all components
      const rendered = components.map(({ Profiled }) =>
        render(<Profiled value={0} />),
      );

      // Start stabilization for all components AFTER initial mount
      const promises = components.map(({ Profiled }) =>
        Profiled.waitForStabilization({
          debounceMs: 20,
          timeout: 2000,
        }),
      );

      // Trigger updates on all components
      components.forEach(({ Profiled }, index) => {
        rendered[index]?.rerender(<Profiled value={1} />);
        rendered[index]?.rerender(<Profiled value={2} />);
      });

      // Wait for all to stabilize
      const results = await Promise.all(promises);

      // All should have captured the 2 update renders
      results.forEach((result) => {
        expect(result.renderCount).toBe(2);
        expect(result.lastPhase).toBe("update");
      });

      // Cleanup
      rendered.forEach((r) => {
        r.unmount();
      });

      console.log(
        `50 components stabilized: all with ${results[0]?.renderCount} renders`,
      );
    });
  });

  describe("Memory leak detection", () => {
    it("should not leak memory through repeated stabilization cycles", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const CYCLES = 100;
      const memorySnapshots: number[] = [];

      for (let cycle = 0; cycle < CYCLES; cycle++) {
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        // Start stabilization
        const promise = ProfiledComponent.waitForStabilization({
          debounceMs: 5,
          timeout: 100,
        });

        // Trigger some renders
        rerender(<ProfiledComponent value={1} />);
        rerender(<ProfiledComponent value={2} />);

        await promise;

        unmount();

        // Take memory snapshot every 20 cycles
        if (cycle % 20 === 0) {
          const memory = getHeapStats();

          memorySnapshots.push(memory.heapUsed);
        }
      }

      // Check for memory growth trend
      const firstSnapshot = memorySnapshots[0] ?? 0;
      const lastSnapshot = memorySnapshots.at(-1) ?? 0;
      const growth = lastSnapshot - firstSnapshot;

      // Growth should be minimal (< 10MB for 100 cycles)
      expect(growth).toBeLessThan(10 * 1024 * 1024);

      console.log(
        `Memory growth over ${CYCLES} cycles: ${(growth / 1024 / 1024).toFixed(2)}MB`,
      );
    });
  });

  describe("Rapid subscribe/unsubscribe during stabilization", () => {
    it("should handle rapid subscribe/unsubscribe while waiting", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      // Start stabilization
      const stabilizationPromise = ProfiledComponent.waitForStabilization({
        debounceMs: 50,
        timeout: 500,
      });

      // Rapidly subscribe/unsubscribe during stabilization (stay under MAX_LISTENERS limit)
      const SUBSCRIBE_CYCLES = 100;

      // Do subscribe/unsubscribe in batches to avoid hitting MAX_LISTENERS
      for (let batch = 0; batch < 10; batch++) {
        const listeners: (() => void)[] = [];

        // Subscribe 10 at a time (under 100 limit)
        for (let i = 0; i < 10; i++) {
          const unsubscribe = ProfiledComponent.onRender(() => {
            // Intentionally empty
          });

          listeners.push(unsubscribe);
        }

        // Unsubscribe all immediately
        listeners.forEach((unsub) => {
          unsub();
        });
      }

      // Trigger some renders
      rerender(<ProfiledComponent value={1} />);

      // Stabilization should still work correctly
      const result = await stabilizationPromise;

      expect(result.renderCount).toBe(1);

      console.log(`${SUBSCRIBE_CYCLES} subscribe/unsubscribe cycles completed`);
    });

    it("should handle interleaved subscribes and renders", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const promise = ProfiledComponent.waitForStabilization({
        debounceMs: 30,
        timeout: 1000,
      });

      // Interleaved operations
      for (let i = 0; i < 50; i++) {
        // Subscribe
        const unsub = ProfiledComponent.onRender(() => {});

        // Render
        rerender(<ProfiledComponent value={i + 1} />);

        // Unsubscribe
        unsub();
      }

      const result = await promise;

      expect(result.renderCount).toBe(50);

      console.log(`Interleaved: ${result.renderCount} renders tracked`);
    });
  });

  describe("Timeout under heavy load", () => {
    it("should timeout correctly when renders never stop", async () => {
      vi.useFakeTimers();

      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const stabilizationPromise = ProfiledComponent.waitForStabilization({
        debounceMs: 20,
        timeout: 100,
      });

      // Continuously render to prevent stabilization
      let renderValue = 1;
      const intervalId = setInterval(() => {
        rerender(<ProfiledComponent value={renderValue++} />);
      }, 5);

      // Set up the rejection expectation BEFORE advancing time
      // This prevents the unhandled rejection warning
      const rejectionExpectation = expect(stabilizationPromise).rejects.toThrow(
        /StabilizationTimeoutError/,
      );

      // Advance time to trigger the timeout
      await vi.advanceTimersByTimeAsync(150);

      clearInterval(intervalId);

      // Now await the expectation
      await rejectionExpectation;

      vi.useRealTimers();
    });
  });
});
