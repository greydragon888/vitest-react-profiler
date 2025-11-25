import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Stress tests for high-volume scenarios
 *
 * These tests verify that the library works correctly under extreme conditions:
 * - Large number of renders (1000+)
 * - Large number of components (100+)
 * - Memory management and cache integrity
 *
 * These are NOT benchmarks - we're testing correctness, not performance.
 */

describe("Stress Tests - High Volume Renders", () => {
  it("should handle 1000+ renders without memory issues", () => {
    // Skip if GC not available
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    // Baseline memory
    gc();
    const memBefore = process.memoryUsage().heapUsed;

    const { rerender, unmount } = render(<ProfiledComponent value={0} />);

    // Stress test: 1000 real React renders
    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Assert correctness: all renders tracked
    expect(ProfiledComponent.getRenderCount()).toBe(1000);
    expect(ProfiledComponent.getRenderHistory()).toHaveLength(1000);

    // Assert data integrity: first and last renders
    const firstRender = ProfiledComponent.getRenderAt(0);
    const lastRender = ProfiledComponent.getRenderAt(999);

    expect(firstRender).toBeDefined();
    expect(firstRender).toBe("mount");

    expect(lastRender).toBeDefined();
    expect(lastRender).toBe("update");

    // Assert phase counts
    expect(ProfiledComponent.getRendersByPhase("mount")).toHaveLength(1);
    expect(ProfiledComponent.getRendersByPhase("update")).toHaveLength(999);

    // Memory assertions
    unmount();
    gc();
    const memAfter = process.memoryUsage().heapUsed;
    const memGrowthMB = (memAfter - memBefore) / 1024 / 1024;

    // < 10 MB for 1000 renders is reasonable
    expect(memGrowthMB).toBeLessThan(10);
  });

  it("should maintain frozen arrays with 1000+ renders", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    const history = ProfiledComponent.getRenderHistory();

    // Should be frozen
    expect(Object.isFrozen(history)).toBe(true);

    // Should not be modifiable
    expect(() => {
      // @ts-expect-error - testing immutability
      history.push({
        phase: "update",
        actualDuration: 1,
        baseDuration: 1,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      });
    }).toThrow();

    // Verify length is correct
    expect(history).toHaveLength(1000);
  });

  it("should handle 2000+ renders and still work correctly", () => {
    // Skip if GC not available
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    const Component: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    // Baseline memory
    gc();
    const memBefore = process.memoryUsage().heapUsed;

    const { rerender, unmount } = render(<ProfiledComponent count={0} />);

    // Even more stress: 2000 renders
    for (let i = 1; i < 2000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(2000);

    const lastRender = ProfiledComponent.getLastRender();

    expect(lastRender).toBeDefined();
    expect(lastRender).toBe("update");

    // Cache invalidation should still work
    rerender(<ProfiledComponent count={2000} />);

    const newHistory = ProfiledComponent.getRenderHistory();

    expect(newHistory).toHaveLength(2001);

    // Memory assertions
    unmount();
    gc();
    const memAfter = process.memoryUsage().heapUsed;
    const memGrowthMB = (memAfter - memBefore) / 1024 / 1024;

    // < 15 MB for 2000 renders is reasonable
    expect(memGrowthMB).toBeLessThan(15);
  });

  it("should handle rapid consecutive renders efficiently", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Simulate rapid updates (like fast typing or animation)
    for (let i = 1; i < 500; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Check multiple times (simulating multiple assertions in test)
    for (let i = 0; i < 100; i++) {
      const history = ProfiledComponent.getRenderHistory();

      expect(history).toHaveLength(500);
    }

    // Verify history is frozen
    const history = ProfiledComponent.getRenderHistory();

    expect(Object.isFrozen(history)).toBe(true);
  });
});

describe("Stress Tests - Multiple Components", () => {
  it("should maintain isolation with 100 components", () => {
    // Create 100 different components
    const components = Array.from({ length: 100 }, (_, i) => {
      const Comp: FC = () => <div>Component {i}</div>;

      Comp.displayName = `Component${i}`;

      return withProfiler(Comp);
    });

    // Render all 100 components
    components.forEach((C) => render(<C />));

    // Assert isolation: each component has exactly 1 render
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(1);
      expect(C.getRenderHistory()[0]).toBeDefined();
      expect(C.hasMounted()).toBe(true);
    });

    // Assert cache isolation: each component maintains its own cache
    const firstComponent = components[0];
    const lastComponent = components[99];

    const history1 = firstComponent?.getRenderHistory();
    const history2 = lastComponent?.getRenderHistory();

    // Verify histories are correct
    expect(history1).toHaveLength(1);
    expect(history2).toHaveLength(1);
  });

  it("should handle 100 components with multiple renders each", () => {
    interface CompProps {
      value: number;
    }

    // Create 100 components
    const components = Array.from({ length: 100 }, (_, i) => {
      const Comp: FC<CompProps> = ({ value }) => (
        <div>
          Component {i}: {value}
        </div>
      );

      Comp.displayName = `Component${i}`;

      return withProfiler(Comp);
    });

    // Render all components and rerender each 10 times
    const rerenders = components.map((C) => {
      const result = render(<C value={0} />);

      return result.rerender;
    });

    // Each component gets 10 updates
    for (let i = 1; i <= 10; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Assert: each component has 11 renders (1 mount + 10 updates)
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(11);
      expect(C.getRendersByPhase("mount")).toHaveLength(1);
      expect(C.getRendersByPhase("update")).toHaveLength(10);
    });

    // Total renders across all components: 100 * 11 = 1100
    const totalRenders = components.reduce(
      (sum, C) => sum + C.getRenderCount(),
      0,
    );

    expect(totalRenders).toBe(1100);
  });

  it("should handle 50 components with 50 renders each (2500 total)", () => {
    interface CompProps {
      count: number;
    }

    const components = Array.from({ length: 50 }, (_, i) => {
      const Comp: FC<CompProps> = ({ count }) => (
        <div>
          Comp {i}: {count}
        </div>
      );

      Comp.displayName = `StressComp${i}`;

      return withProfiler(Comp);
    });

    const rerenders = components.map((C) => {
      return render(<C count={0} />).rerender;
    });

    // Each component gets 50 updates
    for (let i = 1; i <= 50; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C count={i} />);
        }
      });
    }

    // Assert: 51 renders each (1 mount + 50 updates)
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(51);
    });

    // Total: 50 components * 51 renders = 2550 renders
    const totalRenders = components.reduce(
      (sum, C) => sum + C.getRenderCount(),
      0,
    );

    expect(totalRenders).toBe(2550);

    // Verify methods still work on all components
    components.forEach((C) => {
      const lastRender = C.getLastRender();

      expect(lastRender).toBe("update");
    });
  });

  it("should maintain performance with 100+ components under memory pressure", () => {
    interface CompProps {
      id: number;
      data: string;
    }

    // Create components with varying amounts of data
    const components = Array.from({ length: 100 }, (_, i) => {
      const Comp: FC<CompProps> = ({ id, data }) => (
        <div>
          ID: {id}, Data: {data}
        </div>
      );

      Comp.displayName = `MemoryTestComp${i}`;

      return withProfiler(Comp);
    });

    // Render with varying data sizes
    const results = components.map((C, i) => {
      const data = "x".repeat(i * 10); // Varying data size

      return render(<C id={i} data={data} />);
    });

    // Multiple rerenders with new data
    for (let round = 0; round < 20; round++) {
      results.forEach(({ rerender }, index) => {
        const C = components[index];
        const data = "y".repeat(index * 10 + round);

        if (C) {
          rerender(<C id={index} data={data} />);
        }
      });
    }

    // Assert: all components tracked correctly
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(21); // 1 mount + 20 updates
      expect(C.getRenderHistory()).toHaveLength(21);
    });
  });
});

describe("Stress Tests - Mixed Scenarios", () => {
  it("should handle combination of many components and many renders", () => {
    interface CompProps {
      value: number;
    }

    // 30 components, each with 100 renders = 3000 total renders
    const components = Array.from({ length: 30 }, (_, i) => {
      const Comp: FC<CompProps> = ({ value }) => (
        <div>
          C{i}: {value}
        </div>
      );

      Comp.displayName = `MixedComp${i}`;

      return withProfiler(Comp);
    });

    const rerenders = components.map((C) => {
      return render(<C value={0} />).rerender;
    });

    // 100 updates for each component
    for (let i = 1; i <= 100; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Verify correctness
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(101);
      expect(C.getLastRender()).toBe("update");
      expect(C.hasMounted()).toBe(true);
    });

    // Total renders: 30 * 101 = 3030
    const totalRenders = components.reduce(
      (sum, C) => sum + C.getRenderCount(),
      0,
    );

    expect(totalRenders).toBe(3030);
  });

  it("should handle stress test with method calls interleaved", () => {
    const Component: FC<{ n: number }> = ({ n }) => <div>{n}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent n={0} />);

    // Interleave renders with method calls
    // Stress test with periodic checks - expects inside conditionals are intentional
    for (let i = 1; i <= 500; i++) {
      rerender(<ProfiledComponent n={i} />);

      // Call methods periodically
      if (i % 50 === 0) {
        const count = ProfiledComponent.getRenderCount();

        expect(count).toBe(i + 1);

        const history = ProfiledComponent.getRenderHistory();

        expect(history).toHaveLength(i + 1);
      }
    }

    // Final verification
    expect(ProfiledComponent.getRenderCount()).toBe(501);
  });

  it("should handle near-maximum renders (9500) approaching MAX_SAFE_RENDERS limit", () => {
    // Skip if GC not available
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    // MAX_SAFE_RENDERS = 10,000
    // This test verifies behavior near the safety limit
    const Component: FC<{ iteration: number }> = ({ iteration }) => (
      <div>Iteration: {iteration}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    // Baseline memory
    gc();
    const memBefore = process.memoryUsage().heapUsed;

    const { rerender, unmount } = render(<ProfiledComponent iteration={0} />);

    // Render 9,499 more times (total: 9,500 renders)
    // This is 95% of the MAX_SAFE_RENDERS limit
    for (let i = 1; i < 9500; i++) {
      rerender(<ProfiledComponent iteration={i} />);
    }

    // Assert: all 9,500 renders tracked
    expect(ProfiledComponent.getRenderCount()).toBe(9500);
    expect(ProfiledComponent.getRenderHistory()).toHaveLength(9500);

    // Assert: first and last renders are correct
    expect(ProfiledComponent.getRenderAt(0)).toBe("mount");
    expect(ProfiledComponent.getRenderAt(9499)).toBe("update");

    // Assert: frozen arrays still work
    const history = ProfiledComponent.getRenderHistory();

    expect(Object.isFrozen(history)).toBe(true);

    // Assert: phase counts are correct
    expect(ProfiledComponent.getRendersByPhase("mount")).toHaveLength(1);
    expect(ProfiledComponent.getRendersByPhase("update")).toHaveLength(9499);

    // Assert: getLastRender() works
    expect(ProfiledComponent.getLastRender()).toBe("update");

    // Assert: hasMounted() works
    expect(ProfiledComponent.hasMounted()).toBe(true);

    // Additional render should still work (total: 9,501)
    rerender(<ProfiledComponent iteration={9500} />);

    expect(ProfiledComponent.getRenderCount()).toBe(9501);

    // We're still under MAX_SAFE_RENDERS (10,000), so no error expected

    // Memory assertions
    unmount();
    gc();
    const memAfter = process.memoryUsage().heapUsed;
    const memGrowthMB = (memAfter - memBefore) / 1024 / 1024;

    // < 50 MB for 9500 renders is reasonable (10KB per render average)
    expect(memGrowthMB).toBeLessThan(50);
  });
});
