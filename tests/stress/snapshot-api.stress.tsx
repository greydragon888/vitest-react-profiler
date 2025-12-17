/**
 * Stress Tests for Snapshot API
 *
 * Tests correctness and memory efficiency under extreme conditions:
 * - Many snapshot/render cycles (1000+)
 * - Large delta calculations with thousands of renders
 * - Memory efficiency with repeated snapshot/clear cycles
 * - Matcher performance under stress
 * - Multiple components using snapshot API concurrently
 *
 * These are NOT benchmarks - we're testing correctness, not performance.
 *
 * Run with: npm run test:stress
 */

import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";
import { ProfilerData } from "@/profiler/core/ProfilerData";

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

describe("Stress Tests - Snapshot API High Volume", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle 1000 snapshot/render cycles correctly", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // 1000 cycles: snapshot -> render -> verify delta
    for (let cycle = 0; cycle < 1000; cycle++) {
      ProfiledComponent.snapshot();

      // Delta should be 0 immediately after snapshot
      expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(0);

      // Rerender
      rerender(<ProfiledComponent value={cycle + 1} />);

      // Delta should be 1 after one render
      expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(1);
    }

    // Final verification
    const totalRenders = ProfiledComponent.getRenderCount();

    expect(totalRenders).toBe(1001); // 1 initial + 1000 rerenders
    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(1);

    console.log("\n📊 Snapshot API - 1000 Cycles:");
    console.log(`    Total renders: ${totalRenders}`);
    console.log(`    Snapshot cycles: 1000`);
    console.log(
      `    Final delta: ${ProfiledComponent.getRendersSinceSnapshot()}`,
    );
  });

  it("should maintain accurate delta with 5000 renders after snapshot", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Take snapshot after initial render
    ProfiledComponent.snapshot();

    // 5000 rerenders
    for (let i = 1; i <= 5000; i++) {
      rerender(<ProfiledComponent value={i} />);

      // Verify delta is accurate at each step
      if (i % 1000 === 0) {
        expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(i);
      }
    }

    // Final verification
    expect(ProfiledComponent.getRenderCount()).toBe(5001);
    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(5000);

    console.log("\n📊 Snapshot API - Large Delta (5000 renders):");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    Delta: ${ProfiledComponent.getRendersSinceSnapshot()}`);
  });

  it("should handle multiple snapshots with varying intervals", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    let renderValue = 0;
    const snapshotIntervals = [10, 50, 100, 200, 500];

    for (const interval of snapshotIntervals) {
      ProfiledComponent.snapshot();

      for (let i = 0; i < interval; i++) {
        renderValue++;
        rerender(<ProfiledComponent value={renderValue} />);
      }

      // Delta should match interval
      expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(interval);
    }

    const totalExpectedRenders =
      1 + snapshotIntervals.reduce((a, b) => a + b, 0);

    expect(ProfiledComponent.getRenderCount()).toBe(totalExpectedRenders);

    console.log("\n📊 Snapshot API - Varying Intervals:");
    console.log(`    Intervals: ${snapshotIntervals.join(", ")}`);
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
  });

  it("should handle rapid snapshot calls without renders", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // 1000 rapid snapshot calls without renders
    for (let i = 0; i < 1000; i++) {
      ProfiledComponent.snapshot();

      expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(0);
    }

    // Total renders should still be 1
    expect(ProfiledComponent.getRenderCount()).toBe(1);

    console.log("\n📊 Snapshot API - Rapid Snapshots (1000 calls):");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    Delta: ${ProfiledComponent.getRendersSinceSnapshot()}`);
  });
});

describe("Stress Tests - Snapshot API Memory Efficiency", () => {
  afterEach(() => {
    cleanup();
  });

  it("should not leak memory with repeated snapshot/clear cycles on ProfilerData", () => {
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    forceGC(3);
    const heapBefore = getHeapStats();

    // 100 cycles of: add 100 renders -> snapshot -> clear
    for (let cycle = 0; cycle < 100; cycle++) {
      const data = new ProfilerData();

      data.addRender("mount");

      for (let i = 1; i < 100; i++) {
        data.addRender("update");
      }

      data.snapshot();

      expect(data.getRendersSinceSnapshot()).toBe(0);

      // Clear resets everything including snapshot
      data.clear();

      expect(data.getRenderCount()).toBe(0);
      expect(data.getRendersSinceSnapshot()).toBe(0);
    }

    forceGC(5);
    const heapAfter = getHeapStats();

    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log(
      "\n📊 ProfilerData Snapshot - Memory Efficiency (100 cycles × 100 renders):",
    );
    console.log(`    Heap before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    Heap after: ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(
      `    Heap delta: ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    // Should not leak significantly (< 5 MB for 10,000 total renders with clear)
    if (!Number.isNaN(heapDeltaMB)) {
      expect(Math.abs(heapDeltaMB)).toBeLessThan(5);
    }
  });

  it("should handle ProfilerData snapshot with 9000 renders efficiently", () => {
    if (typeof gc !== "function") {
      console.warn(
        "⚠️ Skipping memory test: run with NODE_OPTIONS='--expose-gc'",
      );

      return;
    }

    const data = new ProfilerData();

    forceGC(3);
    const heapBefore = getHeapStats();

    // Add 9000 renders
    data.addRender("mount");

    for (let i = 1; i < 9000; i++) {
      data.addRender("update");
    }

    // Multiple snapshot/delta check cycles
    for (let i = 0; i < 100; i++) {
      data.snapshot();

      expect(data.getRendersSinceSnapshot()).toBe(0);

      // Add a few more renders
      data.addRender("update");
      data.addRender("update");

      expect(data.getRendersSinceSnapshot()).toBe(2);
    }

    forceGC(5);
    const heapAfter = getHeapStats();

    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log("\n📊 ProfilerData Snapshot - 9000+ renders:");
    console.log(`    Total renders: ${data.getRenderCount()}`);
    console.log(`    Snapshot cycles: 100`);
    console.log(
      `    Heap delta: ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    // Memory should be reasonable for 9000+ renders
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(50);
    }
  });
});

describe("Stress Tests - Snapshot API Matchers", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle toHaveRerenderedOnce with 500 cycles", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let cycle = 0; cycle < 500; cycle++) {
      ProfiledComponent.snapshot();

      rerender(<ProfiledComponent value={cycle + 1} />);

      expect(ProfiledComponent).toHaveRerenderedOnce();
    }

    console.log("\n📊 toHaveRerenderedOnce - 500 cycles:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    All assertions passed: ✅`);
  });

  it("should handle toNotHaveRerendered with 500 cycles", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent value={0} />);

    for (let cycle = 0; cycle < 500; cycle++) {
      ProfiledComponent.snapshot();

      expect(ProfiledComponent).toNotHaveRerendered();
    }

    // Total renders should still be 1 (no rerenders)
    expect(ProfiledComponent.getRenderCount()).toBe(1);

    console.log("\n📊 toNotHaveRerendered - 500 cycles:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    All assertions passed: ✅`);
  });

  it("should handle toHaveLastRenderedWithPhase with 1000 renders", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // First render is mount
    expect(ProfiledComponent).toHaveLastRenderedWithPhase("mount");

    // 1000 rerenders, each should be update
    for (let i = 1; i <= 1000; i++) {
      rerender(<ProfiledComponent value={i} />);

      if (i % 100 === 0) {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("update");
      }
    }

    console.log("\n📊 toHaveLastRenderedWithPhase - 1000 renders:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    All assertions passed: ✅`);
  });
});

/**
 * Factory for creating profiled components with unique display names
 */
function createProfiledComponents(count: number, prefix: string) {
  interface CompProps {
    value: number;
  }

  return Array.from({ length: count }, (_, i) => {
    const Comp: FC<CompProps> = ({ value }) => (
      <div>
        {prefix} {i}: {value}
      </div>
    );

    Comp.displayName = `${prefix}${i}`;

    return withProfiler(Comp);
  });
}

describe("Stress Tests - Multiple Components with Snapshot API", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle 50 components with snapshot API isolation", () => {
    const components = createProfiledComponents(50, "SnapshotComp");

    // Render all components
    const rerenders = components.map((C) => {
      return render(<C value={0} />).rerender;
    });

    // Snapshot all components
    components.forEach((C) => {
      C.snapshot();
    });

    // Verify all have delta 0
    components.forEach((C) => {
      expect(C.getRendersSinceSnapshot()).toBe(0);
    });

    // Rerender all components 20 times
    for (let i = 1; i <= 20; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Each component should have delta 20
    components.forEach((C) => {
      expect(C.getRendersSinceSnapshot()).toBe(20);
      expect(C.getRenderCount()).toBe(21); // 1 initial + 20 rerenders
    });

    console.log("\n📊 50 Components with Snapshot API:");
    console.log(`    Components: 50`);
    console.log(`    Renders per component: 21`);
    console.log(`    Delta per component: 20`);
    console.log(`    Total renders: ${50 * 21}`);
  });

  it("should handle independent snapshot baselines across 100 components", () => {
    const components = createProfiledComponents(100, "IndependentComp");

    // Render all components
    const rerenders = components.map((C) => {
      return render(<C value={0} />).rerender;
    });

    // Snapshot at different points for different components
    // Group 1 (0-24): Snapshot after 5 renders
    // Group 2 (25-49): Snapshot after 10 renders
    // Group 3 (50-74): Snapshot after 15 renders
    // Group 4 (75-99): Snapshot after 20 renders

    // Add 5 renders
    for (let i = 1; i <= 5; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Snapshot group 1
    for (let i = 0; i < 25; i++) {
      components[i]?.snapshot();
    }

    // Add 5 more renders (total 10)
    for (let i = 6; i <= 10; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Snapshot group 2
    for (let i = 25; i < 50; i++) {
      components[i]?.snapshot();
    }

    // Add 5 more renders (total 15)
    for (let i = 11; i <= 15; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Snapshot group 3
    for (let i = 50; i < 75; i++) {
      components[i]?.snapshot();
    }

    // Add 5 more renders (total 20)
    for (let i = 16; i <= 20; i++) {
      rerenders.forEach((rerender, index) => {
        const C = components[index];

        if (C) {
          rerender(<C value={i} />);
        }
      });
    }

    // Snapshot group 4
    for (let i = 75; i < 100; i++) {
      components[i]?.snapshot();
    }

    // Verify deltas
    // Group 1: snapshot at 6 renders, now 21 renders, delta = 15
    for (let i = 0; i < 25; i++) {
      expect(components[i]?.getRendersSinceSnapshot()).toBe(15);
    }

    // Group 2: snapshot at 11 renders, now 21 renders, delta = 10
    for (let i = 25; i < 50; i++) {
      expect(components[i]?.getRendersSinceSnapshot()).toBe(10);
    }

    // Group 3: snapshot at 16 renders, now 21 renders, delta = 5
    for (let i = 50; i < 75; i++) {
      expect(components[i]?.getRendersSinceSnapshot()).toBe(5);
    }

    // Group 4: snapshot at 21 renders, now 21 renders, delta = 0
    for (let i = 75; i < 100; i++) {
      expect(components[i]?.getRendersSinceSnapshot()).toBe(0);
    }

    console.log("\n📊 100 Components with Independent Snapshots:");
    console.log(`    Group 1 (0-24): delta = 15 ✅`);
    console.log(`    Group 2 (25-49): delta = 10 ✅`);
    console.log(`    Group 3 (50-74): delta = 5 ✅`);
    console.log(`    Group 4 (75-99): delta = 0 ✅`);
  });
});

describe("Stress Tests - Snapshot API Edge Cases", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle interleaved snapshot and API calls under stress", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    let lastSnapshotAt = 0; // Track when last snapshot was taken

    // Interleave renders, snapshots, and API calls
    for (let i = 1; i <= 500; i++) {
      rerender(<ProfiledComponent value={i} />);

      // Every 50 renders, take a snapshot (before the check)
      if (i % 50 === 0) {
        ProfiledComponent.snapshot();
        lastSnapshotAt = i + 1; // Snapshot at render count i+1

        expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(0);
      }

      // Every 10 renders, check various API methods
      if (i % 10 === 0 && i % 50 !== 0) {
        // Skip check right after snapshot
        const count = ProfiledComponent.getRenderCount();
        const history = ProfiledComponent.getRenderHistory();
        const lastRender = ProfiledComponent.getLastRender();
        const delta = ProfiledComponent.getRendersSinceSnapshot();

        expect(count).toBe(i + 1);
        expect(history).toHaveLength(i + 1);
        expect(lastRender).toBe("update");

        // Delta should be count since last snapshot
        const expectedDelta = i + 1 - lastSnapshotAt;

        expect(delta).toBe(expectedDelta);
      }
    }

    console.log("\n📊 Interleaved API Calls - 500 renders:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    API calls: ~200`);
    console.log(`    Snapshots taken: 10`);
  });

  it("should maintain snapshot integrity after phase filtering", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Add many renders
    for (let i = 1; i <= 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    ProfiledComponent.snapshot();

    // Call phase filtering (stresses cache)
    for (let i = 0; i < 100; i++) {
      const mounts = ProfiledComponent.getRendersByPhase("mount");
      const updates = ProfiledComponent.getRendersByPhase("update");

      expect(mounts).toHaveLength(1);
      expect(updates).toHaveLength(1000);
    }

    // Snapshot delta should still be accurate
    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(0);

    // Add more renders
    for (let i = 0; i < 50; i++) {
      rerender(<ProfiledComponent value={1001 + i} />);
    }

    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(50);

    console.log("\n📊 Snapshot with Phase Filtering - 1000+ renders:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(`    Phase filter calls: 200`);
    console.log(`    Delta after 50 more renders: 50 ✅`);
  });
});
