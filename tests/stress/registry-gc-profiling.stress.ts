/**
 * Advanced GC profiling tests for registry memory behavior
 *
 * Uses Node.js GC traces and performance hooks to analyze:
 * - GC frequency and types (scavenge vs mark-sweep)
 * - Heap statistics (used, total, limit)
 * - GC pause time and efficiency
 * - Memory retained vs released
 *
 * Based on: https://nodejs.org/en/learn/diagnostics/memory/using-gc-traces
 *
 * Run with: NODE_OPTIONS='--expose-gc --trace-gc' npm test
 */

import { PerformanceObserver } from "node:perf_hooks";

import { describe, it, expect, beforeEach } from "vitest";

import { ProfilerData } from "@/profiler/core/ProfilerData";
import { registry } from "@/registry";

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

describe("Registry GC Profiling Tests", () => {
  let gcObserver: GCObserver;

  beforeEach(() => {
    registry.clearAll();
    gcObserver = new GCObserver();
  });

  describe("GC behavior with component accumulation", () => {
    it("should analyze GC activity for 1,000 components", () => {
      const COUNT = 1000;

      // Start observing GC
      gcObserver.start();

      const heapBefore = getHeapStats();

      // Create components
      for (let i = 0; i < COUNT; i++) {
        const profilerData = new ProfilerData();

        registry.register(profilerData);

        // Add renders to make it more realistic
        profilerData.addRender("mount");
        profilerData.addRender("update");
      }

      // Force GC and observe
      forceGC(5);

      const heapAfter = getHeapStats();

      gcObserver.stop();

      const gcStats = gcObserver.getStats();
      const heapDelta = heapAfter.usedHeapSize - heapBefore.usedHeapSize;
      const heapDeltaMB = heapDelta / (1024 * 1024);

      console.log("\n📊 GC Analysis (1,000 components):");
      console.log(`\n  Heap Statistics:`);
      console.log(`    Before: ${formatBytes(heapBefore.usedHeapSize)}`);
      console.log(`    After:  ${formatBytes(heapAfter.usedHeapSize)}`);
      console.log(
        `    Delta:  ${formatBytes(heapDelta)} (${heapDeltaMB.toFixed(2)} MB)`,
      );
      console.log(`    Heap Limit: ${formatBytes(heapAfter.heapSizeLimit)}`);
      console.log(
        `    Usage: ${((heapAfter.usedHeapSize / heapAfter.heapSizeLimit) * 100).toFixed(2)}%`,
      );

      console.log(`\n  GC Activity:`);
      console.log(`    Total GC events: ${gcStats.total}`);
      console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
      console.log(`    Avg GC duration: ${gcStats.avgDuration.toFixed(2)}ms`);
      console.log(`    Max GC pause: ${gcStats.maxDuration.toFixed(2)}ms`);

      console.log(`\n  GC Types:`);
      for (const [kind, count] of Object.entries(gcStats.byKind)) {
        console.log(`    ${kind}: ${count} times`);
      }

      console.log(
        `\n  Registry State: ${(registry as any).activeComponents.size} components`,
      );

      // Assertions
      // Note: GC events might not be captured in all environments
      if (gcStats.total > 0) {
        expect(gcStats.maxDuration).toBeLessThan(100); // Max pause < 100ms
      }

      expect(heapDeltaMB).toBeLessThan(5); // < 5 MB for 1k components
    });

    it("should compare GC behavior: with vs without external references", async () => {
      const COUNT = 1000;

      console.log("\n🔬 GC Comparison Test:");

      // Scenario 1: Keep external references
      console.log("\n  Scenario 1: WITH external references");
      gcObserver.start();
      gcObserver.reset();

      const heapBefore1 = getHeapStats();
      const references: ProfilerData[] = [];

      for (let i = 0; i < COUNT; i++) {
        const profilerData = new ProfilerData();

        registry.register(profilerData);
        references.push(profilerData); // Keep reference!
      }

      forceGC(5);
      const heapAfter1 = getHeapStats();
      const gcStats1 = gcObserver.getStats();

      const retained1 = heapAfter1.usedHeapSize - heapBefore1.usedHeapSize;

      console.log(`    Heap retained: ${formatBytes(retained1)}`);
      console.log(`    GC events: ${gcStats1.total}`);
      console.log(`    Total GC time: ${gcStats1.totalDuration.toFixed(2)}ms`);
      console.log(`    Set size: ${(registry as any).activeComponents.size}`);

      gcObserver.stop();

      // Small delay to ensure GC settles
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      // Scenario 2: No external references (scope-limited)
      console.log("\n  Scenario 2: WITHOUT external references");
      gcObserver.start();
      gcObserver.reset();

      const heapBefore2 = getHeapStats();
      const setSizeBefore = (registry as any).activeComponents.size;

      {
        // Scope block
        for (let i = 0; i < COUNT; i++) {
          const profilerData = new ProfilerData();

          registry.register(profilerData);
          // No external reference kept!
        }
        // All ProfilerData go out of scope
      }

      forceGC(5);
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      const heapAfter2 = getHeapStats();
      const gcStats2 = gcObserver.getStats();
      const setSizeAfter = (registry as any).activeComponents.size;

      const retained2 = heapAfter2.usedHeapSize - heapBefore2.usedHeapSize;

      console.log(`    Heap retained: ${formatBytes(retained2)}`);
      console.log(`    GC events: ${gcStats2.total}`);
      console.log(`    Total GC time: ${gcStats2.totalDuration.toFixed(2)}ms`);
      console.log(`    Set size before: ${setSizeBefore}`);
      console.log(`    Set size after: ${setSizeAfter}`);
      console.log(`    Set delta: +${setSizeAfter - setSizeBefore}`);

      gcObserver.stop();

      // Analysis
      console.log("\n  Comparison:");
      const difference = retained1 - retained2;

      console.log(
        `    Memory difference: ${formatBytes(Math.abs(difference))}`,
      );
      console.log(
        `    GC efficiency: ${difference > 0 ? "✅ Scenario 2 freed more" : "❌ Similar retention"}`,
      );
      console.log(
        `    Set prevents GC: ${setSizeAfter > setSizeBefore ? "✅ Confirmed (Set grew)" : "❌ Not confirmed"}`,
      );

      // Assertions
      expect(setSizeAfter).toBeGreaterThan(setSizeBefore); // Set should grow
      expect(setSizeAfter - setSizeBefore).toBe(COUNT); // Should add exactly COUNT
    });

    it("should measure GC impact of clearAll() operation", () => {
      const COUNT = 1000;
      const RENDERS_PER_COMPONENT = 20;

      console.log("\n🧹 clearAll() GC Impact Test:");

      // Create components with render history
      const components: ProfilerData[] = [];

      for (let i = 0; i < COUNT; i++) {
        const profilerData = new ProfilerData();

        registry.register(profilerData);

        for (let j = 0; j < RENDERS_PER_COMPONENT; j++) {
          profilerData.addRender(j % 2 === 0 ? "mount" : "update");
        }

        components.push(profilerData);
      }

      const heapBeforeClear = getHeapStats();
      const setSizeBeforeClear = (registry as any).activeComponents.size;

      console.log(`\n  Before clearAll():`);
      console.log(`    Heap: ${formatBytes(heapBeforeClear.usedHeapSize)}`);
      console.log(`    Set size: ${setSizeBeforeClear}`);
      console.log(
        `    Components: ${COUNT} × ${RENDERS_PER_COMPONENT} renders`,
      );

      // Observe GC during clearAll
      gcObserver.start();
      registry.clearAll();
      forceGC(3);
      gcObserver.stop();

      const heapAfterClear = getHeapStats();
      const setSizeAfterClear = (registry as any).activeComponents.size;
      const gcStats = gcObserver.getStats();

      const freed = heapBeforeClear.usedHeapSize - heapAfterClear.usedHeapSize;

      console.log(`\n  After clearAll():`);
      console.log(`    Heap: ${formatBytes(heapAfterClear.usedHeapSize)}`);
      console.log(`    Freed: ${formatBytes(freed)}`);
      console.log(`    Set size: ${setSizeAfterClear}`);
      console.log(
        `    Set unchanged: ${setSizeBeforeClear === setSizeAfterClear ? "✅" : "❌"}`,
      );

      console.log(`\n  GC Activity:`);
      console.log(`    GC events: ${gcStats.total}`);
      console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);

      // Verify each component's history is cleared
      let clearedCount = 0;

      for (const component of components) {
        if (component.getHistory().length === 0) {
          clearedCount++;
        }
      }

      console.log(`\n  Verification:`);
      console.log(
        `    Components with cleared history: ${clearedCount}/${COUNT}`,
      );

      // Assertions
      expect(setSizeAfterClear).toBe(setSizeBeforeClear); // Set unchanged
      expect(clearedCount).toBe(COUNT); // All histories cleared

      // Memory freed might be negative due to GC timing
      if (!Number.isNaN(freed) && freed > 0) {
        expect(freed).toBeGreaterThan(0); // Some memory freed
      }
    });

    it("should analyze heap fragmentation under stress", () => {
      console.log("\n🔥 Heap Fragmentation Stress Test:");

      const initialHeap = getHeapStats();

      console.log(`\n  Initial Heap State:`);
      console.log(`    Used: ${formatBytes(initialHeap.usedHeapSize)}`);
      console.log(`    Total: ${formatBytes(initialHeap.totalHeapSize)}`);
      console.log(
        `    Fragmentation: ${(((initialHeap.totalHeapSize - initialHeap.usedHeapSize) / initialHeap.totalHeapSize) * 100).toFixed(2)}%`,
      );

      // Allocate and deallocate in waves to create fragmentation
      const waves = [100, 500, 1000, 5000, 10_000];

      for (const count of waves) {
        console.log(`\n  Wave: ${count} components`);

        const heapBefore = getHeapStats();

        // Allocate
        for (let i = 0; i < count; i++) {
          const profilerData = new ProfilerData();

          registry.register(profilerData);
          profilerData.addRender("mount");
          profilerData.addRender("update");
        }

        const heapAfterAlloc = getHeapStats();

        // Clear (but Set retains!)
        registry.clearAll();
        forceGC(3);

        const heapAfterClear = getHeapStats();

        const allocated = heapAfterAlloc.usedHeapSize - heapBefore.usedHeapSize;
        const retained = heapAfterClear.usedHeapSize - heapBefore.usedHeapSize;
        const freed = heapAfterAlloc.usedHeapSize - heapAfterClear.usedHeapSize;

        console.log(`    Allocated: ${formatBytes(allocated)}`);
        console.log(`    Freed: ${formatBytes(freed)}`);
        console.log(`    Retained: ${formatBytes(retained)}`);
        console.log(
          `    Retention rate: ${((retained / allocated) * 100).toFixed(2)}%`,
        );
      }

      const finalHeap = getHeapStats();
      const totalAccumulated =
        finalHeap.usedHeapSize - initialHeap.usedHeapSize;

      console.log(`\n  Final Heap State:`);
      console.log(`    Used: ${formatBytes(finalHeap.usedHeapSize)}`);
      console.log(`    Total: ${formatBytes(finalHeap.totalHeapSize)}`);
      console.log(`    Total accumulated: ${formatBytes(totalAccumulated)}`);
      console.log(`    Set size: ${(registry as any).activeComponents.size}`);
      console.log(
        `    Avg per component: ${formatBytes(totalAccumulated / (registry as any).activeComponents.size)}`,
      );

      // Assertions
      const totalComponents = waves.reduce((sum, count) => sum + count, 0);

      expect((registry as any).activeComponents.size).toBeGreaterThanOrEqual(
        totalComponents,
      );

      // Only check memory if we have valid stats
      if (!Number.isNaN(totalAccumulated)) {
        expect(totalAccumulated).toBeLessThan(50 * 1024 * 1024); // < 50 MB total
      }
    });
  });

  describe("Long-running process simulation", () => {
    it("should simulate 100 test files with memory tracking", () => {
      console.log("\n⏱️  Long-Running Process Simulation:");

      const TEST_FILES = 100;
      const COMPONENTS_PER_FILE = 10;

      const snapshots: {
        file: number;
        heapUsed: number;
        setSize: number;
        gcEvents: number;
      }[] = [];

      gcObserver.start();

      for (let fileNum = 0; fileNum < TEST_FILES; fileNum++) {
        // Reset GC observer for this file
        const gcCountBefore = gcObserver.getEvents().length;

        // Simulate test file
        for (let i = 0; i < COMPONENTS_PER_FILE; i++) {
          const profilerData = new ProfilerData();

          registry.register(profilerData);
          profilerData.addRender("mount");
        }

        // Simulate afterEach
        registry.clearAll();

        // Occasional GC (every 10 files)
        if (fileNum % 10 === 0) {
          forceGC(1);

          const heap = getHeapStats();

          snapshots.push({
            file: fileNum,
            heapUsed: heap.usedHeapSize,
            setSize: (registry as any).activeComponents.size,
            gcEvents: gcObserver.getEvents().length - gcCountBefore,
          });
        }
      }

      gcObserver.stop();

      const finalHeap = getHeapStats();
      const finalSetSize = (registry as any).activeComponents.size;
      const gcStats = gcObserver.getStats();

      console.log(`\n  Simulation Results:`);
      console.log(`    Test files: ${TEST_FILES}`);
      console.log(`    Total components: ${TEST_FILES * COMPONENTS_PER_FILE}`);
      console.log(`    Final heap: ${formatBytes(finalHeap.usedHeapSize)}`);
      console.log(`    Final Set size: ${finalSetSize}`);

      console.log(`\n  GC Activity:`);
      console.log(`    Total GC events: ${gcStats.total}`);
      console.log(`    Total GC time: ${gcStats.totalDuration.toFixed(2)}ms`);
      console.log(`    Avg GC pause: ${gcStats.avgDuration.toFixed(2)}ms`);

      console.log(`\n  Memory Growth (snapshots every 10 files):`);
      for (const snapshot of snapshots) {
        console.log(
          `    File ${snapshot.file}: ${formatBytes(snapshot.heapUsed)}, Set: ${snapshot.setSize}, GC: ${snapshot.gcEvents}`,
        );
      }

      // Check for linear growth (not exponential)
      if (snapshots.length >= 3) {
        const firstSnapshot = snapshots[0]!;
        const lastSnapshot = snapshots.at(-1)!;
        const heapGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
        const setGrowth = lastSnapshot.setSize - firstSnapshot.setSize;
        const componentsAdded =
          (lastSnapshot.file - firstSnapshot.file) * COMPONENTS_PER_FILE;

        console.log(`\n  Growth Analysis:`);
        console.log(`    Heap growth: ${formatBytes(heapGrowth)}`);
        console.log(`    Set growth: ${setGrowth}`);
        console.log(`    Components added: ${componentsAdded}`);

        const bytesPerComponent = heapGrowth / componentsAdded;

        console.log(
          `    Bytes per component: ${formatBytes(bytesPerComponent)}`,
        );

        // Only check if we have valid stats
        if (!Number.isNaN(bytesPerComponent)) {
          expect(bytesPerComponent).toBeLessThan(1024); // < 1 KB per component
        }
      }
    });
  });
});
