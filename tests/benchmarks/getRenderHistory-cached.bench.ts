import { bench, describe } from "vitest";

import type { RenderInfo } from "@/types.ts";
import { withProfiler } from "@/withProfiler.tsx";

/**
 * Benchmark suite for CACHED getRenderHistory performance
 *
 * Tests a cached implementation that only creates a new frozen copy
 * when the history actually changes (cache invalidation on new renders)
 *
 * Compare these results with getRenderHistory.bench.ts to measure improvement
 */

// Helper to create mock render history
function createMockRenderHistory(count: number): RenderInfo[] {
  const history: RenderInfo[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    history.push({
      phase: i === 0 ? "mount" : "update",
      actualDuration: Math.random() * 10,
      baseDuration: 5,
      startTime: i * 10,
      commitTime: i * 10 + Math.random() * 10,
      timestamp: timestamp + i * 10,
    });
  }

  return history;
}

// Cached implementation with version tracking
interface CachedProfilerData {
  renderHistory: RenderInfo[];
  displayName: string;
  frozenHistoryCache?: readonly RenderInfo[] | undefined;
  historyVersion: number;
}

// Helper to populate component with CACHED renders
function populateRenderHistoryCached(component: any, count: number): void {
  const history = createMockRenderHistory(count);

  const profilerDataMap = new WeakMap<object, CachedProfilerData>();
  const OriginalComponent = component.OriginalComponent;

  profilerDataMap.set(OriginalComponent, {
    renderHistory: history,
    displayName: "BenchComponent",
    frozenHistoryCache: undefined,
    historyVersion: 1,
  });

  // Cached implementation
  component.getRenderHistory = () => {
    const data = profilerDataMap.get(OriginalComponent);

    if (!data) {
      return [];
    }

    // Return cached version if available
    if (data.frozenHistoryCache) {
      return data.frozenHistoryCache;
    }

    // Create and cache new frozen copy
    const frozenCopy = Object.freeze([...data.renderHistory]);

    data.frozenHistoryCache = frozenCopy;

    return frozenCopy;
  };
}

describe("getRenderHistory - Cached Implementation", () => {
  bench("10 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 10);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("10 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 10);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });

  bench("50 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 50);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("50 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 50);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });

  bench("100 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 100);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("100 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 100);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });

  bench("500 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 500);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("500 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 500);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });
});

describe("getRenderHistory - Cached Methods", () => {
  bench("getAverageRenderTime - 100 renders", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 100);

    ProfiledComponent.getAverageRenderTime = () => {
      const history = ProfiledComponent.getRenderHistory();

      if (history.length === 0) {
        return 0;
      }

      const total = history.reduce(
        (sum, render) => sum + render.actualDuration,
        0,
      );

      return total / history.length;
    };

    const _avg = ProfiledComponent.getAverageRenderTime();
  });

  bench("getAverageRenderTime - 100 renders, 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 100);

    ProfiledComponent.getAverageRenderTime = () => {
      const history = ProfiledComponent.getRenderHistory();

      if (history.length === 0) {
        return 0;
      }

      const total = history.reduce(
        (sum, render) => sum + render.actualDuration,
        0,
      );

      return total / history.length;
    };

    for (let i = 0; i < 100; i++) {
      const _avg = ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("getRendersByPhase - 100 renders", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 100);

    ProfiledComponent.getRendersByPhase = (phase: RenderInfo["phase"]) => {
      return Object.freeze(
        ProfiledComponent.getRenderHistory().filter((r) => r.phase === phase),
      );
    };

    const _updates = ProfiledComponent.getRendersByPhase("update");
  });

  bench("getRendersByPhase - 100 renders, 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 100);

    ProfiledComponent.getRendersByPhase = (phase: RenderInfo["phase"]) => {
      return Object.freeze(
        ProfiledComponent.getRenderHistory().filter((r) => r.phase === phase),
      );
    };

    for (let i = 0; i < 100; i++) {
      const _updates = ProfiledComponent.getRendersByPhase("update");
    }
  });
});

describe("getRenderHistory - Cached Realistic Usage", () => {
  bench("Mixed usage - typical test scenario", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 50);

    ProfiledComponent.getAverageRenderTime = () => {
      const history = ProfiledComponent.getRenderHistory();

      if (history.length === 0) {
        return 0;
      }

      const total = history.reduce(
        (sum, render) => sum + render.actualDuration,
        0,
      );

      return total / history.length;
    };

    ProfiledComponent.getRendersByPhase = (phase: RenderInfo["phase"]) => {
      return Object.freeze(
        ProfiledComponent.getRenderHistory().filter((r) => r.phase === phase),
      );
    };

    const _history = ProfiledComponent.getRenderHistory();
    const _avg = ProfiledComponent.getAverageRenderTime();
    const _updates = ProfiledComponent.getRendersByPhase("update");
    const _mounts = ProfiledComponent.getRendersByPhase("mount");
  });

  bench("Heavy usage - stress test", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistoryCached(ProfiledComponent, 200);

    ProfiledComponent.getAverageRenderTime = () => {
      const history = ProfiledComponent.getRenderHistory();

      if (history.length === 0) {
        return 0;
      }

      const total = history.reduce(
        (sum, render) => sum + render.actualDuration,
        0,
      );

      return total / history.length;
    };

    ProfiledComponent.getRendersByPhase = (phase: RenderInfo["phase"]) => {
      return Object.freeze(
        ProfiledComponent.getRenderHistory().filter((r) => r.phase === phase),
      );
    };

    for (let i = 0; i < 20; i++) {
      const _history = ProfiledComponent.getRenderHistory();
      const _avg = ProfiledComponent.getAverageRenderTime();
      const _updates = ProfiledComponent.getRendersByPhase("update");
    }
  });
});
