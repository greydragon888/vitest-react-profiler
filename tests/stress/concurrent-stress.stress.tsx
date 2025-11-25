/**
 * Concurrent Features Stress Tests
 *
 * Tests React 18+ concurrent features under extreme conditions:
 * - 500+ rapid startTransition calls
 * - useDeferredValue with 1000+ rapid updates
 * - Concurrent features + 5000 renders
 * - Multiple components using concurrent features
 * - Interrupted renders at scale
 *
 * Uses V8 heap statistics and GC profiling for memory analysis.
 *
 * Run with: npm run test:stress
 */

import { PerformanceObserver } from "node:perf_hooks";

import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import {
  useState,
  useTransition,
  useDeferredValue,
  startTransition as reactStartTransition,
  type FC,
} from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

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

describe("Concurrent Features Stress Tests - startTransition", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  afterEach(() => {
    cleanup();
  });

  it("should handle 500 rapid startTransition calls", async () => {
    const RapidTransitionComponent: FC = () => {
      const [isPending, startTransition] = useTransition();
      const [count, setCount] = useState(0);

      // Expose increment function for testing
      (globalThis as any).incrementTransition = () => {
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

    const ProfiledComponent = withProfiler(RapidTransitionComponent);

    gcObserver.start();

    const heapBefore = getHeapStats();

    render(<ProfiledComponent />);

    const startTime = performance.now();

    // Trigger 500 rapid transitions
    act(() => {
      for (let i = 0; i < 500; i++) {
        (globalThis as any).incrementTransition();
      }
    });

    // Wait for all transitions to settle
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

    console.log("\n📊 Rapid Transitions Stress (500 startTransition calls):");
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Transitions: 500`);
    console.log(`    Final count: 500`);

    console.log(`\n  Render Tracking:`);
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(
      `    Render history length: ${ProfiledComponent.getRenderHistory().length}`,
    );

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);
    console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

    // Verify correctness
    expect(ProfiledComponent.getRenderCount()).toBeGreaterThan(1);
    expect(screen.getByTestId("count")).toHaveTextContent("500");

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(50); // < 50 MB for 500 transitions
    }

    // Cleanup
    delete (globalThis as any).incrementTransition;
  }, 15_000); // 15s timeout

  it("should track all renders during concurrent mode", async () => {
    const ConcurrentComponent: FC<{ updates: number }> = ({
      updates: _updates,
    }) => {
      const [count, setCount] = useState(0);

      // Expose update function
      (globalThis as any).triggerConcurrentUpdate = () => {
        reactStartTransition(() => {
          setCount((c) => c + 1);
        });
      };

      return <div data-testid="count">{count}</div>;
    };

    const ProfiledComponent = withProfiler(ConcurrentComponent);

    render(<ProfiledComponent updates={0} />);

    const initialRenderCount = ProfiledComponent.getRenderCount();

    // Trigger 100 concurrent updates
    act(() => {
      for (let i = 0; i < 100; i++) {
        (globalThis as any).triggerConcurrentUpdate();
      }
    });

    // Wait for all updates to complete
    await waitFor(
      () => {
        expect(screen.getByTestId("count")).toHaveTextContent("100");
      },
      { timeout: 5000 },
    );

    const finalRenderCount = ProfiledComponent.getRenderCount();

    console.log("\n📊 Concurrent Render Tracking (100 transitions):");
    console.log(`    Initial renders: ${initialRenderCount}`);
    console.log(`    Final renders: ${finalRenderCount}`);
    console.log(`    Renders added: ${finalRenderCount - initialRenderCount}`);

    // Verify all renders tracked
    expect(finalRenderCount).toBeGreaterThan(initialRenderCount);

    // Cleanup
    delete (globalThis as any).triggerConcurrentUpdate;
  }, 10_000);
});

describe("Concurrent Features Stress Tests - useDeferredValue", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  afterEach(() => {
    cleanup();
  });

  it("should handle 1000 rapid deferred value updates", async () => {
    const DeferredStressComponent: FC = () => {
      const [value, setValue] = useState(0);
      const deferredValue = useDeferredValue(value);

      // Expose update function
      (globalThis as any).updateValue = (newValue: number) => {
        setValue(newValue);
      };

      return (
        <div>
          <div data-testid="immediate">{value}</div>
          <div data-testid="deferred">{deferredValue}</div>
        </div>
      );
    };

    const ProfiledComponent = withProfiler(DeferredStressComponent);

    gcObserver.start();

    const heapBefore = getHeapStats();

    render(<ProfiledComponent />);

    const startTime = performance.now();

    // Trigger 1000 rapid updates
    act(() => {
      for (let i = 1; i <= 1000; i++) {
        (globalThis as any).updateValue(i);
      }
    });

    // Wait for deferred value to catch up
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

    console.log("\n📊 Deferred Value Stress (1000 rapid updates):");
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Updates: 1000`);

    console.log(`\n  Render Tracking:`);
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify correctness
    expect(screen.getByTestId("immediate")).toHaveTextContent("1000");
    expect(screen.getByTestId("deferred")).toHaveTextContent("1000");

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(30); // < 30 MB for 1000 updates
    }

    // Cleanup
    delete (globalThis as any).updateValue;
  }, 15_000);
});

describe("Concurrent Features Stress Tests - Combined", () => {
  afterEach(() => {
    cleanup();
  });

  it("should handle concurrent features + 5000 renders", async () => {
    const CombinedStressComponent: FC<{ value: number }> = ({ value }) => {
      const deferredValue = useDeferredValue(value);

      return (
        <div>
          <div data-testid="immediate">{value}</div>
          <div data-testid="deferred">{deferredValue}</div>
        </div>
      );
    };

    const ProfiledComponent = withProfiler(CombinedStressComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create 5000 renders with deferred values
    act(() => {
      for (let i = 1; i < 5000; i++) {
        rerender(<ProfiledComponent value={i} />);
      }
    });

    // Wait for deferred value to catch up
    await waitFor(
      () => {
        expect(screen.getByTestId("deferred")).toHaveTextContent("4999");
      },
      { timeout: 10_000 },
    );

    console.log("\n📊 Concurrent + 5000 Renders:");
    console.log(`    Total renders: ${ProfiledComponent.getRenderCount()}`);
    console.log(
      `    History length: ${ProfiledComponent.getRenderHistory().length}`,
    );
    console.log(
      `    React batching: 5000 rerenders → ${ProfiledComponent.getRenderCount()} actual renders`,
    );

    // Verify renders tracked (React batches heavily in concurrent mode)
    // Note: 5000 rerenders may be batched into just a few actual renders
    expect(ProfiledComponent.getRenderCount()).toBeGreaterThan(1);

    // Verify final state
    expect(screen.getByTestId("immediate")).toHaveTextContent("4999");
    expect(screen.getByTestId("deferred")).toHaveTextContent("4999");
  }, 15_000);

  it("should handle 50 components with concurrent features simultaneously", async () => {
    const components = Array.from({ length: 50 }, (_, i) => {
      const Comp: FC = () => {
        const [_isPending, startTransition] = useTransition();
        const [count, setCount] = useState(0);

        // Expose increment for this component
        (globalThis as any)[`increment${i}`] = () => {
          startTransition(() => {
            setCount((c) => c + 1);
          });
        };

        return <div data-testid={`comp-${i}`}>{count}</div>;
      };

      Comp.displayName = `ConcurrentComp${i}`;

      return withProfiler(Comp);
    });

    // Render all components
    components.forEach((C) => render(<C />));

    // Trigger 10 transitions for each component (500 total)
    act(() => {
      for (let i = 0; i < 50; i++) {
        for (let j = 0; j < 10; j++) {
          (globalThis as any)[`increment${i}`]();
        }
      }
    });

    // Wait for all to settle
    await waitFor(
      () => {
        components.forEach((_, i) => {
          expect(screen.getByTestId(`comp-${i}`)).toHaveTextContent("10");
        });
      },
      { timeout: 10_000 },
    );

    console.log(
      "\n📊 Multiple Concurrent Components (50 components × 10 transitions):",
    );
    components.forEach((C, i) => {
      const renderCount = C.getRenderCount();

      if (i === 0 || i === 49) {
        console.log(`    Component ${i}: ${renderCount} renders`);
      }
    });

    // Verify all components tracked renders
    components.forEach((C) => {
      expect(C.getRenderCount()).toBeGreaterThan(1);
    });

    // Cleanup
    for (let i = 0; i < 50; i++) {
      delete (globalThis as any)[`increment${i}`];
    }
  }, 15_000);
});
