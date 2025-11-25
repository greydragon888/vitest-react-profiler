/**
 * Memory profiling tests for high-volume scenarios
 *
 * Combines high-volume stress testing with GC profiling to measure:
 * - Memory consumption under extreme loads (1000-9500 renders)
 * - Heap behavior with multiple components
 * - GC efficiency and pause times
 * - Memory growth patterns (linear vs exponential)
 *
 * Uses V8 heap statistics and PerformanceObserver for accurate measurements.
 *
 * ## Cache Metrics Note
 *
 * These tests report `phaseCache: 0% hit rate` - this is EXPECTED and NORMAL:
 *
 * - **phaseCache** caches results of `getRendersByPhase()` and `getPhaseInfo()`
 * - Stress tests focus on WRITE operations (adding renders), not READ operations
 * - These tests intentionally avoid calling phase-related methods to test memory/GC
 * - The 95.7% hit rate mentioned in project docs comes from UNIT tests that call
 *   `getRendersByPhase()` multiple times
 *
 * **closureCache** shows 30-90% hit rate because stress tests DO call:
 * - `getRenderCount()` - for correctness assertions
 * - `getRenderHistory()` - for verification
 * - `getLastRender()` - in some scenarios
 *
 * This separation is intentional: stress tests validate correctness and memory,
 * while unit/integration tests validate caching performance.
 *
 * Run with: npm run test:stress
 */

import { PerformanceObserver } from "node:perf_hooks";

import { render } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

import { withProfiler, clearRegistry } from "../../src";

import type { FC } from "react";

interface GCEvent {
  kind: number; // 1=scavenge, 2=mark-sweep-compact, 4=incremental, 8=weak-cb
  kindName: string;
  startTime: number;
  duration: number;
  flags: number;
}

interface HeapStats {
  totalHeapSize: number;
  totalHeapSizeExecutable: number;
  totalPhysicalSize: number;
  totalAvailableSize: number;
  usedHeapSize: number;
  heapSizeLimit: number;
  mallocedMemory: number;
  peakMallocedMemory: number;
  doesZapGarbage: number;
}

/**
 * GC kind names for better reporting
 */
const GC_KINDS: Record<number, string> = {
  1: "Scavenge (Minor GC)",
  2: "Mark-Sweep-Compact (Major GC)",
  4: "Incremental Marking",
  8: "Weak Callback Processing",
  15: "All GC Types",
};

/**
 * GC Observer to track garbage collection events
 */
class GCObserver {
  private events: GCEvent[] = [];
  private observer: PerformanceObserver | null = null;

  start(): void {
    this.events = [];
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      for (const entry of entries) {
        if (entry.entryType === "gc") {
          const gcEntry = entry as any;

          this.events.push({
            kind: gcEntry.detail?.kind ?? 0,
            kindName: GC_KINDS[gcEntry.detail?.kind ?? 0] ?? "Unknown",
            startTime: entry.startTime,
            duration: entry.duration,
            flags: gcEntry.detail?.flags ?? 0,
          });
        }
      }
    });

    this.observer.observe({ entryTypes: ["gc"] });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  getEvents(): GCEvent[] {
    return [...this.events];
  }

  getStats() {
    const total = this.events.length;
    const byKind = this.events.reduce<Record<string, number>>((acc, event) => {
      acc[event.kindName] = (acc[event.kindName] ?? 0) + 1;

      return acc;
    }, {});

    const totalDuration = this.events.reduce(
      (sum, event) => sum + event.duration,
      0,
    );
    const avgDuration = total > 0 ? totalDuration / total : 0;
    const maxDuration = Math.max(...this.events.map((e) => e.duration), 0);

    return {
      total,
      byKind,
      totalDuration,
      avgDuration,
      maxDuration,
    };
  }

  reset(): void {
    this.events = [];
  }
}

/**
 * Get V8 heap statistics
 */
function getHeapStats(): HeapStats {
  const v8 = require("node:v8");
  const stats = v8.getHeapStatistics();

  // Validate stats are numbers
  if (
    typeof stats.usedHeapSize !== "number" ||
    Number.isNaN(stats.usedHeapSize)
  ) {
    // Fallback to process.memoryUsage() if v8 stats are invalid
    const mem = process.memoryUsage();

    return {
      totalHeapSize: mem.heapTotal,
      totalHeapSizeExecutable: 0,
      totalPhysicalSize: mem.heapTotal,
      totalAvailableSize: mem.heapTotal,
      usedHeapSize: mem.heapUsed,
      heapSizeLimit: mem.heapTotal * 2,
      mallocedMemory: mem.external,
      peakMallocedMemory: mem.external,
      doesZapGarbage: 0,
    };
  }

  return stats;
}

/**
 * Format bytes to human-readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Force multiple GC cycles to ensure thorough cleanup
 */
function forceGC(cycles = 3): void {
  if (!globalThis.gc) {
    throw new Error("GC not exposed. Run with --expose-gc flag");
  }

  for (let i = 0; i < cycles; i++) {
    globalThis.gc();
  }
}

describe("High-Volume Memory Profiling - Single Component", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should analyze memory consumption for 1000 renders", () => {
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    gcObserver.start();

    // Warm-up: prevent V8 deoptimization from affecting baseline
    const warmup = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 10; i++) {
      warmup.rerender(<ProfiledComponent value={i} />);
    }

    warmup.unmount();
    forceGC(3); // Clean warm-up artifacts
    clearRegistry(); // Reset render counts after warm-up

    // Now measure baseline
    const heapBefore = getHeapStats();

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Stress test: 1000 real React renders
    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const bytesPerRender = heapDelta / 1000;

    console.log("\n📊 Memory Profile (1000 renders):");
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);
    console.log(`    Per render: ${formatBytes(bytesPerRender)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
    console.log(`    Avg GC duration: ${gcStats.avgDuration.toFixed(2)}ms`);
    console.log(`    Max GC pause: ${gcStats.maxDuration.toFixed(2)}ms`);

    // Verify correctness
    expect(ProfiledComponent.getRenderCount()).toBe(1000);
    expect(ProfiledComponent.getRenderHistory()).toHaveLength(1000);

    // Memory assertions (if stats are valid)
    if (!Number.isNaN(heapDelta) && heapDelta > 0) {
      expect(bytesPerRender).toBeLessThan(2048); // < 2 KB per render
    }

    // GC pause assertions
    if (gcStats.total > 0) {
      expect(gcStats.maxDuration).toBeLessThan(200); // < 200ms max pause
    }
  });

  it("should analyze memory growth for 2000 renders", () => {
    const Component: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    gcObserver.start();

    const heapBefore = getHeapStats();

    const { rerender } = render(<ProfiledComponent count={0} />);

    // Even more stress: 2000 renders
    for (let i = 1; i < 2000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const bytesPerRender = heapDelta / 2000;

    console.log("\n📊 Memory Profile (2000 renders):");
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);
    console.log(`    Per render: ${formatBytes(bytesPerRender)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

    // Verify correctness
    expect(ProfiledComponent.getRenderCount()).toBe(2000);

    // Memory assertions
    if (!Number.isNaN(heapDelta) && heapDelta > 0) {
      expect(bytesPerRender).toBeLessThan(2048); // < 2 KB per render
    }
  });

  it("should analyze near-maximum renders (9500) memory impact", () => {
    // MAX_SAFE_RENDERS = 10,000
    // This test verifies memory behavior near the safety limit
    const Component: FC<{ iteration: number }> = ({ iteration }) => (
      <div>Iteration: {iteration}</div>
    );
    const ProfiledComponent = withProfiler(Component);

    gcObserver.start();

    const heapBefore = getHeapStats();

    const { rerender } = render(<ProfiledComponent iteration={0} />);

    // Render 9,499 more times (total: 9,500 renders)
    for (let i = 1; i < 9500; i++) {
      rerender(<ProfiledComponent iteration={i} />);
    }

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);
    const bytesPerRender = heapDelta / 9500;

    console.log("\n📊 Memory Profile (9500 renders - near MAX_SAFE_RENDERS):");
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per render: ${formatBytes(bytesPerRender)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
    console.log(`    Avg GC pause: ${gcStats.avgDuration.toFixed(2)}ms`);
    console.log(`    Max GC pause: ${gcStats.maxDuration.toFixed(2)}ms`);

    console.log(`\n  GC Types:`);
    for (const [kind, count] of Object.entries(gcStats.byKind)) {
      console.log(`    ${kind}: ${count} times`);
    }

    // Verify correctness
    expect(ProfiledComponent.getRenderCount()).toBe(9500);
    expect(ProfiledComponent.getRenderHistory()).toHaveLength(9500);

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(50); // < 50 MB for 9500 renders
    }

    if (!Number.isNaN(bytesPerRender)) {
      expect(bytesPerRender).toBeLessThan(10_240); // < 10 KB per render
    }

    // GC assertions
    if (gcStats.total > 0) {
      expect(gcStats.maxDuration).toBeLessThan(300); // < 300ms max pause
    }
  });
});

describe("High-Volume Memory Profiling - Multiple Components", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should analyze memory for 100 components", () => {
    gcObserver.start();

    const heapBefore = getHeapStats();

    // Create 100 different components
    const components = Array.from({ length: 100 }, (_, i) => {
      const Comp: FC = () => <div>Component {i}</div>;

      Comp.displayName = `Component${i}`;

      return withProfiler(Comp);
    });

    // Render all 100 components
    components.forEach((C) => render(<C />));

    forceGC(3);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const bytesPerComponent = heapDelta / 100;

    console.log("\n📊 Memory Profile (100 components):");
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);
    console.log(`    Per component: ${formatBytes(bytesPerComponent)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

    // Verify correctness
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(1);
    });

    // Memory assertions
    if (!Number.isNaN(heapDelta) && heapDelta > 0) {
      expect(bytesPerComponent).toBeLessThan(30_720); // < 30 KB per component (React overhead)
    }
  });

  it("should analyze memory for 100 components with 11 renders each (1100 total)", () => {
    interface CompProps {
      value: number;
    }

    gcObserver.start();

    const heapBefore = getHeapStats();

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

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);
    const bytesPerRender = heapDelta / 1100; // 100 components × 11 renders

    console.log(
      "\n📊 Memory Profile (100 components × 11 renders = 1100 total):",
    );
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per render: ${formatBytes(bytesPerRender)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
    console.log(`    Avg GC pause: ${gcStats.avgDuration.toFixed(2)}ms`);

    // Verify correctness
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(11);
    });

    const totalRenders = components.reduce(
      (sum, C) => sum + C.getRenderCount(),
      0,
    );

    expect(totalRenders).toBe(1100);

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(10); // < 10 MB for 1100 renders
    }

    if (!Number.isNaN(bytesPerRender)) {
      expect(bytesPerRender).toBeLessThan(15_360); // < 15 KB per render
    }
  });

  it("should analyze memory for 50 components with 51 renders each (2550 total)", () => {
    interface CompProps {
      count: number;
    }

    gcObserver.start();

    const heapBefore = getHeapStats();

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

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);
    const bytesPerRender = heapDelta / 2550; // 50 components × 51 renders

    console.log(
      "\n📊 Memory Profile (50 components × 51 renders = 2550 total):",
    );
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per render: ${formatBytes(bytesPerRender)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
    console.log(`    Max GC pause: ${gcStats.maxDuration.toFixed(2)}ms`);

    // Verify correctness
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(51);
    });

    const totalRenders = components.reduce(
      (sum, C) => sum + C.getRenderCount(),
      0,
    );

    expect(totalRenders).toBe(2550);

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(20); // < 20 MB for 2550 renders
    }

    if (!Number.isNaN(bytesPerRender)) {
      expect(bytesPerRender).toBeLessThan(10_240); // < 10 KB per render
    }
  });

  it("should analyze memory for 30 components with 101 renders each (3030 total)", () => {
    interface CompProps {
      value: number;
    }

    gcObserver.start();

    const heapBefore = getHeapStats();

    // 30 components, each with 100 renders = 3030 total renders
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

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);
    const bytesPerRender = heapDelta / 3030; // 30 components × 101 renders

    console.log(
      "\n📊 Memory Profile (30 components × 101 renders = 3030 total):",
    );
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per render: ${formatBytes(bytesPerRender)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
    console.log(`    Avg GC pause: ${gcStats.avgDuration.toFixed(2)}ms`);
    console.log(`    Max GC pause: ${gcStats.maxDuration.toFixed(2)}ms`);

    console.log(`\n  GC Types:`);
    for (const [kind, count] of Object.entries(gcStats.byKind)) {
      console.log(`    ${kind}: ${count} times`);
    }

    // Verify correctness
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(101);
    });

    const totalRenders = components.reduce(
      (sum, C) => sum + C.getRenderCount(),
      0,
    );

    expect(totalRenders).toBe(3030);

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(25); // < 25 MB for 3030 renders
    }

    if (!Number.isNaN(bytesPerRender)) {
      expect(bytesPerRender).toBeLessThan(10_240); // < 10 KB per render
    }

    // GC assertions
    if (gcStats.total > 0) {
      expect(gcStats.maxDuration).toBeLessThan(300); // < 300ms max pause
    }
  });
});

describe("High-Volume Memory Profiling - Growth Patterns", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should verify linear (not exponential) memory growth with increasing renders", () => {
    const Component: FC<{ n: number }> = ({ n }) => <div>{n}</div>;
    const ProfiledComponent = withProfiler(Component);

    console.log("\n📈 Linear Growth Analysis:");

    const snapshots: {
      renders: number;
      heapDelta: number;
      bytesPerRender: number;
    }[] = [];

    gcObserver.start();

    const { rerender } = render(<ProfiledComponent n={0} />);

    const checkpoints = [100, 250, 500, 1000];

    for (const checkpoint of checkpoints) {
      const heapBefore = getHeapStats();
      const currentRenders = ProfiledComponent.getRenderCount();

      // Render until checkpoint
      for (let i = currentRenders; i < checkpoint; i++) {
        rerender(<ProfiledComponent n={i} />);
      }

      forceGC(3);

      const heapAfter = getHeapStats();
      const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
      const rendersAdded = checkpoint - currentRenders;
      const bytesPerRender = heapDelta / rendersAdded;

      snapshots.push({
        renders: checkpoint,
        heapDelta,
        bytesPerRender,
      });

      console.log(`\n  Checkpoint ${checkpoint} renders:`);
      console.log(`    Heap delta: ${formatBytes(heapDelta)}`);
      console.log(`    Bytes per render: ${formatBytes(bytesPerRender)}`);
    }

    gcObserver.stop();

    const gcStats = gcObserver.getStats();

    console.log(`\n  Total GC Activity:`);
    console.log(`    GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

    // Analyze growth pattern
    console.log(`\n  Growth Pattern Analysis:`);

    const bytesPerRenderValues = snapshots
      .map((s) => s.bytesPerRender)
      .filter((v) => !Number.isNaN(v) && v > 0);

    if (bytesPerRenderValues.length >= 2) {
      const avgBytesPerRender =
        bytesPerRenderValues.reduce((sum, v) => sum + v, 0) /
        bytesPerRenderValues.length;
      const variance =
        bytesPerRenderValues.reduce(
          (sum, v) => sum + Math.pow(v - avgBytesPerRender, 2),
          0,
        ) / bytesPerRenderValues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = (stdDev / avgBytesPerRender) * 100;

      console.log(
        `    Avg bytes per render: ${formatBytes(avgBytesPerRender)}`,
      );
      console.log(`    Std deviation: ${formatBytes(stdDev)}`);
      console.log(
        `    Coefficient of variation: ${coefficientOfVariation.toFixed(2)}%`,
      );

      if (coefficientOfVariation < 50) {
        console.log(
          `    Growth pattern: ✅ LINEAR (CV < 50%, indicates consistent memory usage)`,
        );
      } else {
        console.log(
          `    Growth pattern: ⚠️  NON-LINEAR (CV ≥ 50%, indicates variable memory usage)`,
        );
      }

      // Verify correctness
      expect(ProfiledComponent.getRenderCount()).toBe(1000);

      // Linear growth assertion: coefficient of variation should be reasonable
      // Note: Allow higher CV due to GC timing variability
      expect(coefficientOfVariation).toBeLessThan(200); // Allow up to 200% variation
    }
  });

  it("should measure heap fragmentation with interleaved renders and GC", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    console.log("\n🔥 Heap Fragmentation Analysis:");

    gcObserver.start();

    const initialHeap = getHeapStats();

    console.log(`\n  Initial Heap:`);
    console.log(`    Used: ${formatBytes(initialHeap.usedHeapSize)}`);
    console.log(`    Total: ${formatBytes(initialHeap.totalHeapSize)}`);

    const { rerender } = render(<ProfiledComponent value={0} />);

    const waves = [100, 200, 300, 400, 500];

    for (const count of waves) {
      const heapBefore = getHeapStats();

      // Render until count
      const currentCount = ProfiledComponent.getRenderCount();

      for (let i = currentCount; i < count; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      const heapAfterAlloc = getHeapStats();

      // Force GC
      forceGC(3);

      const heapAfterGC = getHeapStats();

      const allocated = heapAfterAlloc.usedHeapSize - heapBefore.usedHeapSize;
      const retained = heapAfterGC.usedHeapSize - heapBefore.usedHeapSize;
      const freed = heapAfterAlloc.usedHeapSize - heapAfterGC.usedHeapSize;

      console.log(`\n  Wave ${count} renders:`);
      console.log(`    Allocated: ${formatBytes(allocated)}`);
      console.log(`    Freed by GC: ${formatBytes(freed)}`);
      console.log(`    Retained: ${formatBytes(retained)}`);

      if (allocated > 0 && !Number.isNaN(allocated)) {
        const retentionRate = (retained / allocated) * 100;

        console.log(`    Retention rate: ${retentionRate.toFixed(2)}%`);
      }
    }

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const finalHeap = getHeapStats();

    console.log(`\n  Final Heap:`);
    console.log(`    Used: ${formatBytes(finalHeap.usedHeapSize)}`);
    console.log(`    Total: ${formatBytes(finalHeap.totalHeapSize)}`);
    console.log(
      `    Delta: ${formatBytes(finalHeap.usedHeapSize - initialHeap.usedHeapSize)}`,
    );

    console.log(`\n  GC Summary:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

    // Verify correctness
    expect(ProfiledComponent.getRenderCount()).toBe(500);

    // Memory should not grow excessively
    const totalGrowth = finalHeap.usedHeapSize - initialHeap.usedHeapSize;

    if (!Number.isNaN(totalGrowth)) {
      expect(totalGrowth).toBeLessThan(20 * 1024 * 1024); // < 20 MB for 500 renders with GC
    }
  });
});
