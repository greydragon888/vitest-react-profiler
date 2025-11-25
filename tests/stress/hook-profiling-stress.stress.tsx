/**
 * Hook Profiling Stress Tests
 *
 * Tests profileHook utility under extreme conditions:
 * - 2000+ rerenders of simple hooks
 * - Complex hooks with state + 1000 rerenders
 * - Multiple hooks profiled simultaneously
 * - Hooks with dependencies + rapid updates
 * - Memory efficiency of hook profiling
 *
 * Uses V8 heap statistics and GC profiling for memory analysis.
 *
 * Run with: npm run test:stress
 */

import { PerformanceObserver } from "node:perf_hooks";

import { useState, useEffect, useMemo, useCallback } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { profileHook } from "@/hooks/profileHook";

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

describe("Hook Profiling Stress Tests - Simple Hooks", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should handle 2000 rerenders of simple useState hook", () => {
    const useCounter = () => {
      const [count, setCount] = useState(0);

      return { count, setCount };
    };

    gcObserver.start();

    const heapBefore = getHeapStats();

    const { rerender, ProfiledHook, unmount } = profileHook(() => useCounter());

    const startTime = performance.now();

    // Trigger 2000 rerenders
    for (let i = 0; i < 2000; i++) {
      rerender();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log("\n📊 Simple Hook Stress (2000 rerenders):");
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per rerender: ${(totalTime / 2000).toFixed(3)}ms`);
    console.log(`    Rerenders/sec: ${((2000 / totalTime) * 1000).toFixed(0)}`);

    console.log(`\n  Render Tracking:`);
    console.log(`    Total renders: ${ProfiledHook.getRenderCount()}`);
    console.log(
      `    History length: ${ProfiledHook.getRenderHistory().length}`,
    );

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify correctness
    expect(ProfiledHook.getRenderCount()).toBe(2001); // Initial + 2000 rerenders

    // Performance assertion
    expect(totalTime).toBeLessThan(500); // < 500ms for 2000 rerenders

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(50); // < 50 MB for 2000 rerenders
    }

    // Cleanup
    unmount();
  }, 10_000);

  it("should handle 3000 rerenders of hook with no state", () => {
    const useTimestamp = () => {
      return Date.now();
    };

    const { rerender, ProfiledHook, unmount } = profileHook(() =>
      useTimestamp(),
    );

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Trigger 3000 rerenders
    for (let i = 0; i < 3000; i++) {
      rerender();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    console.log("\n📊 Stateless Hook Stress (3000 rerenders):");
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Total renders: ${ProfiledHook.getRenderCount()}`);
    console.log(
      `    Heap delta: ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    GC events: ${gcStats.total}`);

    expect(ProfiledHook.getRenderCount()).toBe(3001); // Initial + 3000 rerenders
    expect(totalTime).toBeLessThan(600); // < 600ms

    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(50); // < 50 MB
    }

    unmount();
  }, 10_000);
});

describe("Hook Profiling Stress Tests - Complex Hooks", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should handle 1000 rerenders of hook with state, memo, and callback", () => {
    const useComplexHook = ({ multiplier }: { multiplier: number }) => {
      const [count, setCount] = useState(0);

      const doubled = useMemo(() => count * 2, [count]);

      const increment = useCallback(() => {
        setCount((c) => c + 1);
      }, []);

      return { count, doubled, increment, multiplier };
    };

    gcObserver.start();

    const heapBefore = getHeapStats();

    const { result, rerender, ProfiledHook, unmount } = profileHook(
      useComplexHook,
      { multiplier: 1 },
    );

    const startTime = performance.now();

    // Trigger 1000 rerenders with changing props
    for (let i = 1; i <= 1000; i++) {
      rerender({ multiplier: i });
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
      "\n📊 Complex Hook Stress (state + memo + callback, 1000 rerenders):",
    );
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Per rerender: ${(totalTime / 1000).toFixed(3)}ms`);

    console.log(`\n  Render Tracking:`);
    console.log(`    Total renders: ${ProfiledHook.getRenderCount()}`);

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify hook still works
    expect(result.current.multiplier).toBe(1000);

    // Verify renders tracked
    expect(ProfiledHook.getRenderCount()).toBe(1001); // Initial + 1000 rerenders

    // Performance assertion
    expect(totalTime).toBeLessThan(800); // < 800ms

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(80); // < 80 MB
    }

    unmount();
  }, 12_000);

  it("should handle hook with useEffect + 500 rerenders", () => {
    const effectSpy = vi.fn();
    const cleanupSpy = vi.fn();

    const useEffectHook = ({ value }: { value: number }) => {
      const [state, setState] = useState(0);

      useEffect(() => {
        effectSpy(value);

        return () => {
          cleanupSpy(value);
        };
      }, [value]);

      return { state, setState };
    };

    const { rerender, ProfiledHook, unmount } = profileHook(useEffectHook, {
      value: 0,
    });

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Trigger 500 rerenders with changing value
    for (let i = 1; i <= 500; i++) {
      rerender({ value: i });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;

    console.log("\n📊 useEffect Hook Stress (500 rerenders with effects):");
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Total renders: ${ProfiledHook.getRenderCount()}`);
    console.log(`    Effects called: ${effectSpy.mock.calls.length}`);
    console.log(`    Cleanups called: ${cleanupSpy.mock.calls.length}`);
    console.log(`    Heap delta: ${formatBytes(heapDelta)}`);
    console.log(`    GC events: ${gcStats.total}`);

    // Verify effect called for each value change
    expect(effectSpy).toHaveBeenCalledTimes(501); // Initial + 500 changes
    expect(cleanupSpy).toHaveBeenCalledTimes(500); // Cleanup for each except last

    expect(ProfiledHook.getRenderCount()).toBe(501);
    expect(totalTime).toBeLessThan(1000); // < 1s

    unmount();

    // Final cleanup should have been called
    expect(cleanupSpy).toHaveBeenCalledTimes(501);
  }, 12_000);
});

describe("Hook Profiling Stress Tests - Multiple Hooks", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    gcObserver = new GCObserver();
  });

  it("should handle 20 hooks profiled simultaneously + 100 rerenders each", () => {
    const hooks = Array.from({ length: 20 }, (_, i) => {
      const useIndexedHook = () => {
        const [count, setCount] = useState(0);

        return { index: i, count, setCount };
      };

      return profileHook(() => useIndexedHook());
    });

    gcObserver.start();

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Rerender each hook 100 times
    hooks.forEach(({ rerender }) => {
      for (let i = 0; i < 100; i++) {
        rerender();
      }
    });

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    gcObserver.stop();

    const gcStats = gcObserver.getStats();
    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
    const heapDeltaMB = heapDelta / (1024 * 1024);

    let totalRenders = 0;

    hooks.forEach(({ ProfiledHook }) => {
      totalRenders += ProfiledHook.getRenderCount();
    });

    console.log("\n📊 Multiple Hooks Stress (20 hooks × 100 rerenders):");
    console.log(`\n  Performance:`);
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Hooks: 20`);
    console.log(`    Total rerenders: 2000`);
    console.log(`    Total renders: ${totalRenders}`);

    console.log(`\n  Heap Statistics:`);
    console.log(
      `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
    );
    console.log(`    Per hook: ${formatBytes(heapDelta / 20)}`);

    console.log(`\n  GC Activity:`);
    console.log(`    Total GC events: ${gcStats.total}`);

    // Verify all hooks tracked correctly
    hooks.forEach(({ ProfiledHook }) => {
      expect(ProfiledHook.getRenderCount()).toBe(101); // Initial + 100 rerenders
    });

    expect(totalRenders).toBe(2020); // 20 hooks × 101 renders

    // Performance assertion
    expect(totalTime).toBeLessThan(1500); // < 1.5s for 20 hooks × 100 rerenders

    // Memory assertions
    if (!Number.isNaN(heapDeltaMB)) {
      expect(heapDeltaMB).toBeLessThan(100); // < 100 MB
    }

    // Cleanup all hooks
    hooks.forEach(({ unmount }) => {
      unmount();
    });
  }, 15_000);
});

describe("Hook Profiling Stress Tests - Event Listeners", () => {
  it("should handle hook profiling + 50 event listeners + 200 rerenders", () => {
    const useTestHook = () => {
      const [value, setValue] = useState(0);

      return { value, setValue };
    };

    const { rerender, ProfiledHook, unmount } = profileHook(() =>
      useTestHook(),
    );

    // Add 50 event listeners
    const listeners: ReturnType<typeof vi.fn>[] = [];

    for (let i = 0; i < 50; i++) {
      const listener = vi.fn();

      ProfiledHook.onRender(listener);
      listeners.push(listener);
    }

    const heapBefore = getHeapStats();

    const startTime = performance.now();

    // Trigger 200 rerenders
    for (let i = 0; i < 200; i++) {
      rerender();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    forceGC(5);

    const heapAfter = getHeapStats();

    const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;

    console.log(
      "\n📊 Hook Profiling + Event Listeners (50 listeners, 200 rerenders):",
    );
    console.log(`    Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`    Total renders: ${ProfiledHook.getRenderCount()}`);
    console.log(`    Listeners: 50`);
    console.log(`    Total notifications: ${50 * 200} (expected)`);
    console.log(`    Heap delta: ${formatBytes(heapDelta)}`);

    // Verify all listeners called for each render
    listeners.forEach((listener) => {
      expect(listener).toHaveBeenCalledTimes(200); // Called for 200 rerenders (not initial mount)
    });

    expect(ProfiledHook.getRenderCount()).toBe(201); // Initial + 200 rerenders
    expect(totalTime).toBeLessThan(500); // < 500ms

    unmount();
  });
});
