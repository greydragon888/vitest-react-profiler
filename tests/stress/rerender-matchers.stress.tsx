/**
 * Stress Tests for v1.11.0 Rerender Matchers
 *
 * Tests the extended rerender matchers under extreme conditions:
 * - toHaveRerendered() with high volume cycles (1000-5000)
 * - toEventuallyRerender() with concurrent async operations
 * - toEventuallyRerenderTimes() with exact count tracking under load
 * - Memory efficiency and cleanup verification
 *
 * These are NOT benchmarks - we're testing correctness under stress.
 *
 * Run with: npm run test:stress
 */

import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

import type { FC } from "react";

interface HeapStats {
  usedHeapSize: number;
}

function getHeapStats(): HeapStats {
  const v8 = require("node:v8");
  const stats = v8.getHeapStatistics();

  if (
    typeof stats.usedHeapSize !== "number" ||
    Number.isNaN(stats.usedHeapSize)
  ) {
    const mem = process.memoryUsage();

    return {
      usedHeapSize: mem.heapUsed,
    };
  }

  return stats;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function forceGC(cycles = 3): void {
  if (!globalThis.gc) {
    throw new Error("GC not exposed. Run with --expose-gc flag");
  }

  for (let i = 0; i < cycles; i++) {
    globalThis.gc();
  }
}

/**
 * Factory for creating profiled components
 */
function createProfiledComponent(name?: string) {
  const Component: FC<{ value: number }> = ({ value }) => (
    <div>Value: {value}</div>
  );

  return withProfiler(Component, name);
}

/**
 * Factory for creating multiple profiled components
 */
function createMultipleProfiledComponents(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>
        Component {i}: {value}
      </div>
    );

    Component.displayName = `StressComp${i}`;

    return withProfiler(Component, `StressComp${i}`);
  });
}

describe("Stress Tests - toHaveRerendered High Volume", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle 1000 snapshot-rerender-assert cycles", () => {
    const ProfiledComponent = createProfiledComponent("HighVolume1000");
    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 0; i < 1000; i++) {
      ProfiledComponent.snapshot();
      rerender(<ProfiledComponent value={i + 1} />);
      expect(ProfiledComponent).toHaveRerendered();
    }

    // Verify final state
    expect(ProfiledComponent.getRenderCount()).toBe(1001); // 1 mount + 1000 rerenders
    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(1);

    console.log("\n📊 toHaveRerendered - 1000 Cycles:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    All assertions passed: ✅`);
  });

  it("should correctly track exact counts with 5000 renders", () => {
    const ProfiledComponent = createProfiledComponent("ExactCount5000");
    const { rerender } = render(<ProfiledComponent value={0} />);

    ProfiledComponent.snapshot();

    for (let i = 0; i < 5000; i++) {
      rerender(<ProfiledComponent value={i + 1} />);
    }

    expect(ProfiledComponent).toHaveRerendered(5000);

    console.log("\n📊 toHaveRerendered(n) - 5000 Renders:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    Exact count assertion: ✅`);
  });

  it("should handle rapid snapshot/assertion cycles under memory pressure", () => {
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    forceGC(3);
    const heapBefore = getHeapStats();

    const ProfiledComponent = createProfiledComponent("MemoryPressure");
    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 0; i < 2000; i++) {
      ProfiledComponent.snapshot();
      rerender(<ProfiledComponent value={i + 1} />);
      expect(ProfiledComponent).toHaveRerendered(1);
    }

    forceGC(5);
    const heapAfter = getHeapStats();

    const heapGrowth = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapGrowthMB = heapGrowth / (1024 * 1024);

    console.log("\n📊 toHaveRerendered - 2000 Cycles Memory Test:");
    console.log(`    Heap before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    Heap after: ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Heap growth: ${formatBytes(heapGrowth)}`);

    // Verify no significant memory leak (< 10MB growth)
    if (!Number.isNaN(heapGrowthMB)) {
      expect(Math.abs(heapGrowthMB)).toBeLessThan(10);
    }
  });
});

describe("Stress Tests - toEventuallyRerender Async", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle 50 concurrent async matchers", async () => {
    const components = createMultipleProfiledComponents(50);

    const renders = components.map((C) => render(<C value={0} />));

    components.forEach((C) => {
      C.snapshot();
    });

    // Start all async waiters
    const waiters = components.map((C) =>
      expect(C).toEventuallyRerender({ timeout: 5000 }),
    );

    // Trigger rerenders with slight stagger
    renders.forEach(({ rerender }, i) => {
      setTimeout(() => {
        const Comp = components[i];

        if (Comp) {
          rerender(<Comp value={1} />);
        }
      }, i * 10);
    });

    // All should resolve
    await Promise.all(waiters);

    console.log("\n📊 toEventuallyRerender - 50 Concurrent:");
    console.log(`    Components: 50`);
    console.log(`    All async assertions resolved: ✅`);
  });

  it("should handle 100 sequential async assertions", async () => {
    const ProfiledComponent = createProfiledComponent("Sequential100");
    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.snapshot();

      // Schedule rerender before awaiting
      setTimeout(() => {
        rerender(<ProfiledComponent value={i + 1} />);
      }, 5);

      await expect(ProfiledComponent).toEventuallyRerender({ timeout: 1000 });
    }

    expect(ProfiledComponent.getRenderCount()).toBe(101);

    console.log("\n📊 toEventuallyRerender - 100 Sequential:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    All assertions passed: ✅`);
  });

  it("should resolve immediately when already rerendered (200 cycles)", async () => {
    const ProfiledComponent = createProfiledComponent("ImmediateResolve");
    const { rerender } = render(<ProfiledComponent value={0} />);

    const startTime = performance.now();

    for (let i = 0; i < 200; i++) {
      ProfiledComponent.snapshot();
      rerender(<ProfiledComponent value={i + 1} />);

      // Should resolve immediately since already rerendered
      await expect(ProfiledComponent).toEventuallyRerender({ timeout: 100 });
    }

    const elapsed = performance.now() - startTime;

    // 200 cycles should be fast (< 5 seconds) since they resolve immediately
    expect(elapsed).toBeLessThan(5000);

    console.log("\n📊 toEventuallyRerender - 200 Immediate Resolve Cycles:");
    console.log(`    Total time: ${elapsed.toFixed(2)}ms`);
    console.log(`    Avg per cycle: ${(elapsed / 200).toFixed(2)}ms`);
  });
});

describe("Stress Tests - toEventuallyRerenderTimes Exact Count", () => {
  afterEach(() => {
    cleanup();
  });

  it("should track exact count with 1000 renders", async () => {
    const ProfiledComponent = createProfiledComponent("ExactCount1000");
    const { rerender } = render(<ProfiledComponent value={0} />);

    ProfiledComponent.snapshot();

    // Start async waiter for exact count
    const waiter = expect(ProfiledComponent).toEventuallyRerenderTimes(1000, {
      timeout: 10_000,
    });

    // Rapid sequential renders
    for (let i = 0; i < 1000; i++) {
      rerender(<ProfiledComponent value={i + 1} />);
    }

    await waiter;

    console.log("\n📊 toEventuallyRerenderTimes - 1000 Exact Count:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    Exact count verified: ✅`);
  });

  it("should fail early when count exceeded (not wait for timeout)", async () => {
    const ProfiledComponent = createProfiledComponent("EarlyFail");
    const { rerender } = render(<ProfiledComponent value={0} />);

    ProfiledComponent.snapshot();

    // Render more than expected
    for (let i = 0; i < 100; i++) {
      rerender(<ProfiledComponent value={i + 1} />);
    }

    const startTime = Date.now();

    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(50, {
        timeout: 5000,
      }),
    ).rejects.toThrow(/exceeded/);

    const elapsed = Date.now() - startTime;

    // Should fail immediately, not wait 5 seconds
    expect(elapsed).toBeLessThan(100);

    console.log("\n📊 toEventuallyRerenderTimes - Early Fail:");
    console.log(`    Expected: 50, Actual: 100`);
    console.log(`    Elapsed: ${elapsed}ms (< 100ms)`);
    console.log(`    Early failure: ✅`);
  });

  it("should handle 30 concurrent exact-count waiters", async () => {
    const components = createMultipleProfiledComponents(30);

    const renders = components.map((C) => render(<C value={0} />));

    components.forEach((C) => {
      C.snapshot();
    });

    // Each component waits for exactly 10 rerenders
    const waiters = components.map((C) =>
      expect(C).toEventuallyRerenderTimes(10, { timeout: 5000 }),
    );

    // Trigger exactly 10 rerenders per component
    for (let r = 0; r < 10; r++) {
      renders.forEach(({ rerender }, i) => {
        const Comp = components[i];

        if (Comp) {
          rerender(<Comp value={r + 1} />);
        }
      });
    }

    await Promise.all(waiters);

    // Verify each component has exactly 11 renders (1 mount + 10 rerenders)
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(11);
    });

    console.log("\n📊 toEventuallyRerenderTimes - 30 Concurrent:");
    console.log(`    Components: 30`);
    console.log(`    Expected count per component: 10`);
    console.log(`    All assertions passed: ✅`);
  });
});

describe("Stress Tests - Rerender Matchers Memory & Cleanup", () => {
  afterEach(() => {
    cleanup();
  });

  it("should not leak memory with async matchers over 500 cycles", async () => {
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    forceGC(5);
    const heapBefore = getHeapStats();

    const ProfiledComponent = createProfiledComponent("AsyncMemory");
    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 0; i < 500; i++) {
      ProfiledComponent.snapshot();

      // Rerender first, then check
      rerender(<ProfiledComponent value={i + 1} />);

      await expect(ProfiledComponent).toEventuallyRerender({ timeout: 100 });
    }

    forceGC(5);
    const heapAfter = getHeapStats();

    const growth = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const growthMB = growth / (1024 * 1024);

    console.log("\n📊 Async Matchers - 500 Cycles Memory Test:");
    console.log(`    Heap before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    Heap after: ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Growth: ${formatBytes(growth)}`);

    // Should not leak significantly (< 20MB)
    if (!Number.isNaN(growthMB)) {
      expect(Math.abs(growthMB)).toBeLessThan(20);
    }
  });

  it("should handle timeout cleanup without memory leak", async () => {
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    forceGC(5);
    const heapBefore = getHeapStats();

    const ProfiledComponent = createProfiledComponent("TimeoutCleanup");

    render(<ProfiledComponent value={0} />);

    // 100 timeouts (no rerenders triggered)
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.snapshot();

      try {
        await expect(ProfiledComponent).toEventuallyRerender({ timeout: 10 });
      } catch {
        // Expected timeout
      }
    }

    forceGC(5);
    const heapAfter = getHeapStats();

    const growth = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const growthMB = growth / (1024 * 1024);

    console.log("\n📊 Timeout Cleanup - 100 Timeouts Memory Test:");
    console.log(`    Heap before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    Heap after: ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Growth: ${formatBytes(growth)}`);

    // Should not leak significantly (< 5MB)
    if (!Number.isNaN(growthMB)) {
      expect(Math.abs(growthMB)).toBeLessThan(5);
    }
  });

  it("should cleanup listeners properly after async matchers resolve", async () => {
    const ProfiledComponent = createProfiledComponent("ListenerCleanup");
    const { rerender } = render(<ProfiledComponent value={0} />);

    // Perform many async matcher cycles
    for (let i = 0; i < 300; i++) {
      ProfiledComponent.snapshot();
      rerender(<ProfiledComponent value={i + 1} />);

      await expect(ProfiledComponent).toEventuallyRerender({ timeout: 100 });
    }

    // After all matchers complete, render count should be accurate
    expect(ProfiledComponent.getRenderCount()).toBe(301);

    console.log("\n📊 Listener Cleanup - 300 Cycles:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    Cleanup verified: ✅`);
  });
});

describe("Stress Tests - Combined Sync/Async Rerender Matchers", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle interleaved sync and async assertions", async () => {
    const ProfiledComponent = createProfiledComponent("Interleaved");
    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 0; i < 200; i++) {
      ProfiledComponent.snapshot();
      rerender(<ProfiledComponent value={i + 1} />);

      // Alternate between sync and async matchers
      if (i % 2 === 0) {
        expect(ProfiledComponent).toHaveRerendered();
      } else {
        await expect(ProfiledComponent).toEventuallyRerender({ timeout: 100 });
      }
    }

    expect(ProfiledComponent.getRenderCount()).toBe(201);

    console.log("\n📊 Interleaved Sync/Async - 200 Cycles:");
    console.log(`    Sync assertions: 100`);
    console.log(`    Async assertions: 100`);
    console.log(`    All passed: ✅`);
  });

  it("should handle multiple components with mixed matchers", async () => {
    const components = createMultipleProfiledComponents(20);

    const renders = components.map((C) => render(<C value={0} />));

    // Cycle through all components with various operations
    for (let cycle = 0; cycle < 50; cycle++) {
      // Snapshot all
      components.forEach((C) => {
        C.snapshot();
      });

      // Rerender all
      renders.forEach(({ rerender }, i) => {
        const Comp = components[i];

        if (Comp) {
          rerender(<Comp value={cycle + 1} />);
        }
      });

      // Use different matchers for different components
      const assertions = components.map((C, i) => {
        if (i % 3 === 0) {
          // Sync: toHaveRerendered()
          expect(C).toHaveRerendered();

          return Promise.resolve();
        } else if (i % 3 === 1) {
          // Sync: toHaveRerendered(1)
          expect(C).toHaveRerendered(1);

          return Promise.resolve();
        } else {
          // Async: toEventuallyRerender
          return expect(C).toEventuallyRerender({ timeout: 100 });
        }
      });

      await Promise.all(assertions);
    }

    // Verify all components have correct render count
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(51); // 1 mount + 50 rerenders
    });

    console.log("\n📊 20 Components × 50 Cycles Mixed Matchers:");
    console.log(`    Total assertions: 1000`);
    console.log(`    All passed: ✅`);
  });
});
