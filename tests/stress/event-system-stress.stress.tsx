/**
 * Event System Stress Tests
 *
 * Tests event system (ProfilerEvents) under extreme conditions:
 * - Many listeners approaching MAX_LISTENERS limit (100)
 * - Event emission with large render history
 * - Multiple components with many listeners
 * - Rapid subscribe/unsubscribe cycles
 * - Concurrent waitForNextRender calls under load
 *
 * Uses V8 heap statistics and GC profiling for memory analysis.
 *
 * Run with: npm run test:stress
 */

import { PerformanceObserver } from "node:perf_hooks";

import { render } from "@testing-library/react";
import * as React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

import type { FC } from "react";

// Re-export React for async test

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
 * Force multiple GC cycles
 */
function forceGC(cycles = 3): void {
  if (!globalThis.gc) {
    throw new Error("GC not exposed. Run with --expose-gc flag");
  }

  for (let i = 0; i < cycles; i++) {
    globalThis.gc();
  }
}

describe("Event System Stress Tests - Listener Limits", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
    vi.clearAllMocks();
  });

  it("should handle 99 listeners (just below MAX_LISTENERS=100)", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    gcObserver.start();

    const heapBefore = getHeapStats();

    render(<ProfiledComponent value={0} />);

    // Add 99 listeners (MAX_LISTENERS is 100, so 99 should be safe)
    const listeners: (() => void)[] = [];

    for (let i = 0; i < 99; i++) {
      const listener = vi.fn();
      const unsubscribe = ProfiledComponent.onRender(listener);

      listeners.push(unsubscribe);
    }

    forceGC(3);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const bytesPerListener = heapDelta / 99;

    console.log("\n📊 Listener Memory Profile (99 listeners):");
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);
    console.log(`    Per listener: ${formatBytes(bytesPerListener)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify all listeners work
    expect(ProfiledComponent.getRenderCount()).toBe(1);

    // Memory assertions
    if (!Number.isNaN(heapDelta) && heapDelta > 0) {
      expect(bytesPerListener).toBeLessThan(5120); // < 5 KB per listener
    }
  });

  it("should throw error at 101 listeners (exceeds MAX_LISTENERS=100)", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // Add 100 listeners first (should succeed - at limit)
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.onRender(vi.fn());
    }

    // 101st listener should throw
    expect(() => {
      ProfiledComponent.onRender(vi.fn());
    }).toThrow(/Memory leak detected/);
  });

  it("should detect memory leak with helpful error message", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // Add 101 listeners to trigger error
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.onRender(vi.fn());
    }

    try {
      ProfiledComponent.onRender(vi.fn());
      // Should not reach here
      expect.fail("Should have thrown error");
    } catch (error: any) {
      expect(error.message).toContain("Memory leak detected");
      expect(error.message).toContain("101 event listeners");
      expect(error.message).toContain("unsubscribe");
      expect(error.message).toContain("useEffect");
    }
  });
});

describe("Event System Stress Tests - Multiple Components", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should handle 100 components with 10 listeners each (1000 total subscriptions)", () => {
    gcObserver.start();

    const heapBefore = getHeapStats();

    // Create 100 components
    const components = Array.from({ length: 100 }, (_, i) => {
      const Comp: FC = () => <div>Component {i}</div>;

      Comp.displayName = `StressComp${i}`;

      return withProfiler(Comp);
    });

    // Render all components
    components.forEach((C) => render(<C />));

    // Add 10 listeners to each component (100 × 10 = 1000 subscriptions)
    const allUnsubscribes: (() => void)[] = [];

    components.forEach((C) => {
      for (let i = 0; i < 10; i++) {
        const unsubscribe = C.onRender(vi.fn());

        allUnsubscribes.push(unsubscribe);
      }
    });

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const bytesPerSubscription = heapDelta / 1000;

    console.log(
      "\n📊 Multiple Components Memory Profile (100 components × 10 listeners):",
    );
    console.log(`\n  Heap Statistics:`);
    console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
    console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);
    console.log(`    Per subscription: ${formatBytes(bytesPerSubscription)}`);
    console.log(`    Total subscriptions: 1000`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify isolation
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(1);
    });

    // Cleanup
    allUnsubscribes.forEach((unsub) => {
      unsub();
    });

    // Memory assertions
    if (!Number.isNaN(heapDelta) && heapDelta > 0) {
      expect(bytesPerSubscription).toBeLessThan(20_480); // < 20 KB per subscription (React overhead)
    }
  });
});

describe("Event System Stress Tests - Event Emission", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should emit events efficiently with 5000 render history", () => {
    const Component: FC<{ value: number }> = ({ value }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create 5000 render history first
    for (let i = 1; i < 5000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(5000);

    gcObserver.start();

    const heapBefore = getHeapStats();

    // Add listeners AFTER large history created
    const listeners: ReturnType<typeof vi.fn>[] = [];

    for (let i = 0; i < 50; i++) {
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);
      listeners.push(listener);
    }

    // Trigger renders with listeners active (emission overhead)
    const startTime = performance.now();

    for (let i = 5000; i < 5100; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    const endTime = performance.now();
    const emissionTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;

    console.log(
      "\n📊 Event Emission Performance (5000+ render history, 50 listeners, 100 emissions):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total emission time: ${emissionTime.toFixed(2)}ms`);
    console.log(
      `    Per emission: ${(emissionTime / 100).toFixed(2)}ms (100 renders)`,
    );
    console.log(`    Renders with large history: 5100 total`);

    console.log(`\n  Heap Statistics:`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify all listeners called
    listeners.forEach((listener) => {
      expect(listener).toHaveBeenCalledTimes(100); // 100 renders after subscription
    });

    // Performance assertion
    expect(emissionTime).toBeLessThan(1000); // < 1 second for 100 emissions with 50 listeners
  });

  it("should handle rapid subscribe/unsubscribe cycles (1000 iterations)", () => {
    const Component: FC = () => <div>Test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Rapid subscribe/unsubscribe cycles
    for (let i = 0; i < 1000; i++) {
      const unsubscribe = ProfiledComponent.onRender(vi.fn());

      unsubscribe(); // Immediately unsubscribe
    }

    const endTime = performance.now();
    const cycleTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;

    console.log(
      "\n📊 Subscribe/Unsubscribe Cycle Performance (1000 iterations):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total cycle time: ${cycleTime.toFixed(2)}ms`);
    console.log(
      `    Per cycle: ${(cycleTime / 1000).toFixed(3)}ms (subscribe + unsubscribe)`,
    );

    console.log(`\n  Heap Statistics:`);
    console.log(`    Delta:  ${formatBytes(heapDelta)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Memory should be mostly freed (GC collects unsubscribed listeners)
    if (!Number.isNaN(heapDelta)) {
      // Should not leak memory significantly
      const heapDeltaMB = heapDelta / (1024 * 1024);

      expect(Math.abs(heapDeltaMB)).toBeLessThan(5); // < 5 MB delta
    }

    // Performance assertion
    expect(cycleTime).toBeLessThan(100); // < 100ms for 1000 cycles
  });
});

describe("Event System Stress Tests - Async Patterns", () => {
  it("should handle 100 concurrent waitForNextRender calls", async () => {
    const Component: FC = () => {
      const [count, setCount] = React.useState(0);

      React.useEffect(() => {
        // Trigger render after mount
        const timer = setTimeout(() => {
          setCount(1);
        }, 50);

        return () => {
          clearTimeout(timer);
        };
      }, []);

      return <div>{count}</div>;
    };

    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    const startTime = performance.now();

    // Create 100 concurrent waitForNextRender promises
    const promises = Array.from({ length: 100 }, () =>
      ProfiledComponent.waitForNextRender({ timeout: 500 }),
    );

    // Wait for all to resolve
    const results = await Promise.all(promises);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(
      "\n📊 Concurrent waitForNextRender Performance (100 concurrent calls):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Concurrent promises: 100`);

    // Verify all resolved with same info
    results.forEach((info) => {
      expect(info.count).toBe(2);
      expect(info.phase).toBe("update");
    });

    // Performance assertion
    expect(totalTime).toBeLessThan(200); // < 200ms for 100 concurrent waits
  });
});
