/**
 * Edge Cases and Boundary Stress Tests
 *
 * Tests boundary conditions and circuit breakers:
 * - MAX_SAFE_RENDERS = 10,000 (circuit breaker for infinite loops)
 * - MAX_LISTENERS = 100 (circuit breaker for memory leaks)
 * - Recovery after hitting limits
 * - Off-by-one boundary conditions
 * - Error message quality at limits
 *
 * Uses V8 heap statistics and GC profiling for memory analysis.
 *
 * Run with: npm run test:stress
 */

import { PerformanceObserver } from "node:perf_hooks";

import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

import type { FC } from "react";

interface GCEvent {
  kind: number;
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

const GC_KINDS: Record<number, string> = {
  1: "Scavenge (Minor GC)",
  2: "Mark-Sweep-Compact (Major GC)",
  4: "Incremental Marking",
  8: "Weak Callback Processing",
  15: "All GC Types",
};

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

function getHeapStats(): HeapStats {
  const v8 = require("node:v8");
  const stats = v8.getHeapStatistics();

  if (
    typeof stats.usedHeapSize !== "number" ||
    Number.isNaN(stats.usedHeapSize)
  ) {
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

function forceGC(cycles = 3): void {
  if (!globalThis.gc) {
    throw new Error("GC not exposed. Run with --expose-gc flag");
  }

  for (let i = 0; i < cycles; i++) {
    globalThis.gc();
  }
}

describe("Edge Cases - MAX_SAFE_RENDERS Boundary", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  afterEach(() => {
    cleanup();
  });

  it("should handle 9999 renders (just below MAX_SAFE_RENDERS=10000)", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    gcObserver.start();

    const heapBefore = getHeapStats();

    const { rerender } = render(<ProfiledComponent value={0} />);

    const startTime = performance.now();

    // Create 9999 total renders (initial mount + 9998 updates)
    for (let i = 1; i < 9999; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log(
      "\n📊 MAX_SAFE_RENDERS Boundary (9999 renders, just below 10,000 limit):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per render: ${(totalTime / 9999).toFixed(3)}ms`);
    console.log(`    Renders/sec: ${((9999 / totalTime) * 1000).toFixed(0)}`);

    console.log(`\n  Render Tracking:`);
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(
      `    History length: ${ProfiledComponent.getRenderHistory().length}`,
    );

    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per render: ${formatBytes(heapDelta / 9999)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

    // Verify correctness
    expect(ProfiledComponent.getRenderCount()).toBe(9999);
    expect(ProfiledComponent.getRenderHistory().length).toBe(9999);

    // Performance assertion
    expect(totalTime).toBeLessThan(5000); // < 5 seconds for 9999 renders

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(200); // < 200 MB for 9999 renders
    }
  }, 10_000);

  it("should throw error at 10001 renders (exceeds MAX_SAFE_RENDERS=10000)", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create exactly 10000 renders (initial mount + 9999 updates)
    for (let i = 1; i < 10_000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(10_000);

    // 10001st render should throw (exceeds MAX_SAFE_RENDERS=10000)
    expect(() => {
      rerender(<ProfiledComponent value={10_000} />);
    }).toThrow(/Infinite.*loop detected/i);
  }, 15_000);

  it("should have helpful error message at MAX_SAFE_RENDERS", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create exactly 10000 renders
    for (let i = 1; i < 10_000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    try {
      // Try to add 10001st render
      rerender(<ProfiledComponent value={10_000} />);
      // Should not reach here
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toMatch(/infinite.*loop/i);
      expect(error.message).toContain("10000");
      expect(error.message).toContain("useEffect");
    }
  }, 15_000);
});

describe("Edge Cases - MAX_LISTENERS Boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should handle exactly 100 listeners (at MAX_LISTENERS limit)", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    const listeners: (() => void)[] = [];

    // Add exactly 100 listeners (at the limit)
    for (let i = 0; i < 100; i++) {
      const unsubscribe = ProfiledComponent.onRender(vi.fn());

      listeners.push(unsubscribe);
    }

    console.log("\n📊 MAX_LISTENERS Boundary (exactly 100 listeners):");
    console.log(`    Listeners added: 100`);
    console.log(`    Status: ✅ All listeners accepted (at limit)`);

    // Should work fine at limit
    expect(ProfiledComponent.getRenderCount()).toBe(1);

    // Cleanup
    listeners.forEach((unsub) => {
      unsub();
    });
  });

  it("should throw at 101 listeners (exceeds MAX_LISTENERS)", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // Add 100 listeners (at limit)
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.onRender(vi.fn());
    }

    // 101st listener should throw
    expect(() => {
      ProfiledComponent.onRender(vi.fn());
    }).toThrow(/Memory leak detected/);
  });

  it("should recover after unsubscribing from 100 listeners", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    const unsubscribes: (() => void)[] = [];

    // Add 100 listeners
    for (let i = 0; i < 100; i++) {
      const unsubscribe = ProfiledComponent.onRender(vi.fn());

      unsubscribes.push(unsubscribe);
    }

    // Cannot add more
    expect(() => ProfiledComponent.onRender(vi.fn())).toThrow();

    // Unsubscribe all
    unsubscribes.forEach((unsub) => {
      unsub();
    });

    // Now we can add listeners again
    const newListener = vi.fn();
    const unsubscribe = ProfiledComponent.onRender(newListener);

    expect(unsubscribe).toBeTypeOf("function");

    console.log("\n📊 Recovery After MAX_LISTENERS:");
    console.log(`    Initial listeners: 100 (at limit)`);
    console.log(`    After unsubscribe all: 0`);
    console.log(`    New listener added: ✅ Success`);
  });
});

describe("Edge Cases - Large History Performance", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  afterEach(() => {
    cleanup();
  });

  it("should handle 5000 renders + getRenderHistory() efficiently", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create 5000 renders
    for (let i = 1; i < 5000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Call getRenderHistory 1000 times (stresses array freezing)
    for (let i = 0; i < 1000; i++) {
      const history = ProfiledComponent.getRenderHistory();

      // Verify frozen
      expect(Object.isFrozen(history)).toBe(true);
      expect(history.length).toBe(5000);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;

    console.log(
      "\n📊 Large History Access Performance (5000 renders, 1000 accesses):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per access: ${(totalTime / 1000).toFixed(3)}ms`);
    console.log(`    History length: 5000`);

    console.log(`\n  Heap Statistics:`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Performance assertion
    expect(totalTime).toBeLessThan(100); // < 100ms for 1000 accesses
  });

  it("should handle 5000 renders + multiple API calls efficiently", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create 5000 renders
    for (let i = 1; i < 5000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Test multiple API calls with large history
    for (let i = 0; i < 100; i++) {
      const count = ProfiledComponent.getRenderCount();
      const history = ProfiledComponent.getRenderHistory();

      expect(count).toBe(5000);
      expect(history.length).toBe(5000);
      expect(Object.isFrozen(history)).toBe(true);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;

    console.log("\n📊 Large History + API Calls (5000 renders, 100 calls):");
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per call: ${(totalTime / 100).toFixed(3)}ms`);
    console.log(`    Heap delta: ${formatBytes(heapDelta)}`);
    console.log(`    GC events: ${gcStats.total}`);

    expect(totalTime).toBeLessThan(100); // < 100ms for 100 API calls
  });
});

describe("Edge Cases - Memory Efficiency", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  afterEach(() => {
    cleanup();
  });

  it("should not leak memory with rapid component mount/unmount cycles", () => {
    gcObserver.start();

    const heapBefore = getHeapStats();

    // Create and destroy 100 components
    for (let i = 0; i < 100; i++) {
      const Comp: FC = () => <div>Component {i}</div>;
      const ProfiledComponent = withProfiler(Comp);

      const { unmount } = render(<ProfiledComponent />);

      // Verify it worked
      expect(ProfiledComponent.getRenderCount()).toBe(1);

      // Immediately unmount
      unmount();
    }

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log("\n📊 Mount/Unmount Cycles (100 components):");
    console.log(`\n  Memory:`);
    console.log(
      `    Heap delta: ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Should not leak significantly
    if (!Number.isNaN(heapDeltaMB)) {
      expect(Math.abs(heapDeltaMB)).toBeLessThan(10); // < 10 MB leak
    }
  });
});
