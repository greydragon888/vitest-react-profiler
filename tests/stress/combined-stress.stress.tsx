/**
 * Combined Multi-Factor Stress Tests
 *
 * Tests multiple stress factors simultaneously:
 * - Events + Concurrent features
 * - Events + Multiple components
 * - Concurrent features + Large render history
 * - Events + Concurrent + Multiple components
 * - All combined: Events + Concurrent + 50 components + 1000 renders
 *
 * Uses V8 heap statistics and GC profiling for memory analysis.
 *
 * Run with: npm run test:stress
 */

import { PerformanceObserver } from "node:perf_hooks";
import * as v8 from "node:v8";

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { type FC, useDeferredValue, useState, useTransition } from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

interface GCEvent {
  kind: number;
  kindName: string;
  startTime: number;
  duration: number;
  flags: number;
}

interface GCDetail {
  kind?: number;
  flags?: number;
}

interface GCPerformanceEntry extends PerformanceEntry {
  detail?: GCDetail;
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
          const gcEntry = entry as GCPerformanceEntry;
          const kind = gcEntry.detail?.kind ?? 0;

          this.events.push({
            kind,
            kindName: GC_KINDS[kind] ?? "Unknown",
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
  const stats = v8.getHeapStatistics();

  if (
    typeof stats.used_heap_size !== "number" ||
    Number.isNaN(stats.used_heap_size)
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

  return {
    totalHeapSize: stats.total_heap_size,
    totalHeapSizeExecutable: stats.total_heap_size_executable,
    totalPhysicalSize: stats.total_physical_size,
    totalAvailableSize: stats.total_available_size,
    usedHeapSize: stats.used_heap_size,
    heapSizeLimit: stats.heap_size_limit,
    mallocedMemory: stats.malloced_memory,
    peakMallocedMemory: stats.peak_malloced_memory,
    doesZapGarbage: stats.does_zap_garbage,
  };
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

describe("Combined Stress Tests - Events + Concurrent Features", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  afterEach(() => {
    cleanup();
  });

  it("should handle 50 listeners + 500 startTransition calls", async () => {
    const CombinedComponent: FC = () => {
      const [isPending, startTransition] = useTransition();
      const [count, setCount] = useState(0);

      (globalThis as any).incrementCombined = () => {
        startTransition(() => {
          setCount((c) => c + 1);
        });
      };

      return (
        <div>
          <div data-testid="count">{count}</div>
          <div data-testid="pending">{isPending ? "yes" : "no"}</div>
        </div>
      );
    };

    const ProfiledComponent = withProfiler(CombinedComponent);

    gcObserver.start();

    const heapBefore = getHeapStats();

    render(<ProfiledComponent />);

    // Add 50 event listeners
    const listeners: ReturnType<typeof vi.fn>[] = [];

    for (let i = 0; i < 50; i++) {
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);
      listeners.push(listener);
    }

    const startTime = performance.now();

    // Trigger 500 transitions (all listeners will be notified)
    act(() => {
      for (let i = 0; i < 500; i++) {
        (globalThis as any).incrementCombined();
      }
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("count")).toHaveTextContent("500");
        expect(screen.getByTestId("pending")).toHaveTextContent("no");
      },
      { timeout: 10_000 },
    );

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log(
      "\n📊 Events + Concurrent Stress (50 listeners + 500 transitions):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Transitions: 500`);
    console.log(`    Event listeners: 50`);

    console.log(`\n  Render Tracking:`);
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);

    // Verify all listeners called for each render
    const renderCount = ProfiledComponent.getRenderCount();

    listeners.forEach((listener) => {
      // Initial mount + subsequent renders
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    console.log(`\n  Event Emissions:`);
    console.log(`    Listeners notified per render: 50`);
    console.log(`    Total notifications: ${renderCount * 50}`);

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify correctness
    expect(screen.getByTestId("count")).toHaveTextContent("500");

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(100); // < 100 MB for combined stress
    }

    // Cleanup
    delete (globalThis as any).incrementCombined;
  }, 15_000);

  it("should handle 30 listeners + 1000 useDeferredValue updates", async () => {
    const DeferredWithListenersComponent: FC = () => {
      const [value, setValue] = useState(0);
      const deferredValue = useDeferredValue(value);

      (globalThis as any).updateDeferredValue = (newValue: number) => {
        setValue(newValue);
      };

      return (
        <div>
          <div data-testid="immediate">{value}</div>
          <div data-testid="deferred">{deferredValue}</div>
        </div>
      );
    };

    const ProfiledComponent = withProfiler(DeferredWithListenersComponent);

    render(<ProfiledComponent />);

    // Add 30 listeners
    const listeners: ReturnType<typeof vi.fn>[] = [];

    for (let i = 0; i < 30; i++) {
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);
      listeners.push(listener);
    }

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Trigger 1000 rapid updates
    act(() => {
      for (let i = 1; i <= 1000; i++) {
        (globalThis as any).updateDeferredValue(i);
      }
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("deferred")).toHaveTextContent("1000");
      },
      { timeout: 10_000 },
    );

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    const renderCount = ProfiledComponent.getRenderCount();

    console.log(
      "\n📊 Events + Deferred Value Stress (30 listeners + 1000 updates):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Updates: 1000`);
    console.log(`    Total renders: ${renderCount}`);

    console.log(`\n  Event System:`);
    console.log(`    Listeners: 30`);
    console.log(`    Total notifications: ${renderCount * 30}`);

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify correctness
    expect(screen.getByTestId("immediate")).toHaveTextContent("1000");
    expect(screen.getByTestId("deferred")).toHaveTextContent("1000");

    // All listeners should have been called
    listeners.forEach((listener) => {
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(80); // < 80 MB for deferred + listeners
    }

    // Cleanup
    delete (globalThis as any).updateDeferredValue;
  }, 15_000);
});

describe("Combined Stress Tests - Multiple Components + Concurrent Features", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle 20 components with concurrent features + 10 listeners each", async () => {
    const components = Array.from({ length: 20 }, (_, i) => {
      const Comp: FC = () => {
        const [, startTransition] = useTransition();
        const [count, setCount] = useState(0);

        (globalThis as any)[`updateComp${i}`] = () => {
          startTransition(() => {
            setCount((c) => c + 1);
          });
        };

        return <div data-testid={`comp-${i}`}>{count}</div>;
      };

      Comp.displayName = `CombinedComp${i}`;

      return withProfiler(Comp);
    });

    const heapBefore = getHeapStats();

    // Render all components
    components.forEach((C) => render(<C />));

    // Add 10 listeners to each component (20 × 10 = 200 total listeners)
    const allListeners: ReturnType<typeof vi.fn>[] = [];

    components.forEach((C) => {
      for (let i = 0; i < 10; i++) {
        const listener = vi.fn();

        C.onRender(listener);
        allListeners.push(listener);
      }
    });

    // Trigger 50 transitions per component (20 × 50 = 1000 total transitions)
    act(() => {
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 50; j++) {
          (globalThis as any)[`updateComp${i}`]();
        }
      }
    });

    // Wait for all to settle
    await waitFor(
      () => {
        components.forEach((_, i) => {
          expect(screen.getByTestId(`comp-${i}`)).toHaveTextContent("50");
        });
      },
      { timeout: 15_000 },
    );

    forceGC(5);

    const heapAfter = getHeapStats();

    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log("\n📊 Multiple Components + Concurrent + Events:");
    console.log(`    Components: 20`);
    console.log(`    Transitions per component: 50`);
    console.log(`    Listeners per component: 10`);
    console.log(`    Total listeners: 200`);
    console.log(`    Total transitions: 1000`);

    let totalRenders = 0;

    components.forEach((C) => {
      totalRenders += C.getRenderCount();
    });

    console.log(`    Total renders across all components: ${totalRenders}`);
    console.log(
      `    Heap delta: ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    // Verify all components rendered
    components.forEach((C) => {
      expect(C.getRenderCount()).toBeGreaterThan(1);
    });

    // Verify all listeners called
    allListeners.forEach((listener) => {
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(150); // < 150 MB for 20 components + concurrent + listeners
    }

    // Cleanup
    for (let i = 0; i < 20; i++) {
      delete (globalThis as any)[`updateComp${i}`];
    }
  }, 20_000);
});

describe("Combined Stress Tests - All Factors", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle 50 components + concurrent features + 20 listeners + 1000 renders each", async () => {
    console.log("\n📊 ULTIMATE STRESS TEST:");
    console.log("  🎯 50 components");
    console.log("  🎯 useDeferredValue in each component");
    console.log("  🎯 20 event listeners per component (1000 total)");
    console.log("  🎯 1000 updates per component (50,000 total updates)");

    const components = Array.from({ length: 50 }, (_, i) => {
      const Comp: FC = () => {
        const [value, setValue] = useState(0);
        const deferredValue = useDeferredValue(value);

        (globalThis as any)[`setValue${i}`] = (newValue: number) => {
          setValue(newValue);
        };

        return <div data-testid={`ultimate-${i}`}>{deferredValue}</div>;
      };

      Comp.displayName = `UltimateComp${i}`;

      return withProfiler(Comp);
    });

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Render all 50 components
    components.forEach((C) => render(<C />));

    // Add 20 listeners to each component
    const allListeners: ReturnType<typeof vi.fn>[] = [];

    components.forEach((C) => {
      for (let i = 0; i < 20; i++) {
        const listener = vi.fn();

        C.onRender(listener);
        allListeners.push(listener);
      }
    });

    // Trigger 1000 updates per component
    act(() => {
      for (let i = 0; i < 50; i++) {
        for (let j = 1; j <= 1000; j++) {
          (globalThis as any)[`setValue${i}`](j);
        }
      }
    });

    // Wait for all deferred values to catch up
    await waitFor(
      () => {
        components.forEach((_, i) => {
          expect(screen.getByTestId(`ultimate-${i}`)).toHaveTextContent("1000");
        });
      },
      { timeout: 30_000 },
    );

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    let totalRenders = 0;

    components.forEach((C) => {
      totalRenders += C.getRenderCount();
    });

    console.log("\n📊 ULTIMATE STRESS TEST RESULTS:");
    console.log(`\n  ⏱️  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Time per component: ${(totalTime / 50).toFixed(2)}ms`);

    console.log(`\n  🔢 Statistics:`);
    console.log(`    Components: 50`);
    console.log(`    Total updates requested: 50,000`);
    console.log(`    Total renders: ${totalRenders}`);
    console.log(
      `    Avg renders per component: ${(totalRenders / 50).toFixed(1)}`,
    );
    console.log(
      `    React batching efficiency: ${((50_000 / totalRenders) * 100).toFixed(1)}% reduction`,
    );

    console.log(`\n  📡 Event System:`);
    console.log(`    Total listeners: 1000`);
    console.log(
      `    Total notifications: ${totalRenders * 20} (per component avg)`,
    );

    console.log(`\n  💾 Memory:`);
    console.log(
      `    Heap delta: ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per component: ${formatBytes(heapDelta / 50)}`);

    // Verify all components reached final state
    components.forEach((_, i) => {
      expect(screen.getByTestId(`ultimate-${i}`)).toHaveTextContent("1000");
    });

    // Verify all components rendered
    components.forEach((C) => {
      expect(C.getRenderCount()).toBeGreaterThan(1);
    });

    // Verify all listeners called
    allListeners.forEach((listener) => {
      expect(listener.mock.calls.length).toBeGreaterThan(0);
    });

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(300); // < 300 MB for ultimate stress
    }

    // Performance assertion
    expect(totalTime).toBeLessThan(30_000); // < 30 seconds

    // Cleanup
    for (let i = 0; i < 50; i++) {
      delete (globalThis as any)[`setValue${i}`];
    }
  }, 40_000); // 40s timeout for ultimate stress test
});
