import { bench, describe } from "vitest";

import type { RenderInfo } from "@/types.ts";
import { withProfiler } from "@/withProfiler.tsx";

/**
 * Benchmark suite for getRenderHistory performance
 *
 * Tests the current implementation which creates a new frozen copy
 * on every call: `Object.freeze([...history])`
 *
 * Goal: Determine if caching would provide meaningful performance improvement
 * Threshold: If improvement < 5%, caching is not worth the added complexity
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

// Helper to populate component with renders
function populateRenderHistory(component: any, count: number): void {
  const history = createMockRenderHistory(count);

  // Access the profilerDataMap through the component
  // This is a bit hacky but necessary for benchmarking
  const profilerDataMap = new WeakMap();
  const OriginalComponent = component.OriginalComponent;

  profilerDataMap.set(OriginalComponent, {
    renderHistory: history,
    displayName: "BenchComponent",
  });

  // Monkey-patch getRenderHistory to use our test data
  component.getRenderHistory = () => {
    const data = profilerDataMap.get(OriginalComponent);

    if (!data) {
      return [];
    }

    return Object.freeze([...data.renderHistory]);
  };
}

describe("getRenderHistory - Current Implementation", () => {
  bench("10 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 10);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("10 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 10);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });

  bench("50 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 50);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("50 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 50);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });

  bench("100 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 100);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("100 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 100);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });

  bench("500 renders - single call", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 500);

    const _history = ProfiledComponent.getRenderHistory();
  });

  bench("500 renders - 100 calls", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 500);

    for (let i = 0; i < 100; i++) {
      const _history = ProfiledComponent.getRenderHistory();
    }
  });
});

describe("getRenderHistory - Methods that call it internally", () => {
  bench("getAverageRenderTime - 100 renders", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 100);

    // Monkey-patch getAverageRenderTime to use our test data
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

    populateRenderHistory(ProfiledComponent, 100);

    // Monkey-patch getAverageRenderTime
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

    populateRenderHistory(ProfiledComponent, 100);

    // Monkey-patch getRendersByPhase
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

    populateRenderHistory(ProfiledComponent, 100);

    // Monkey-patch getRendersByPhase
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

describe("getRenderHistory - Realistic usage patterns", () => {
  bench("Mixed usage - typical test scenario", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 50);

    // Monkey-patch methods
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

    // Typical test checks
    const _history = ProfiledComponent.getRenderHistory(); // Check full history
    const _avg = ProfiledComponent.getAverageRenderTime(); // Check average time
    const _updates = ProfiledComponent.getRendersByPhase("update"); // Check updates
    const _mounts = ProfiledComponent.getRendersByPhase("mount"); // Check mounts
  });

  bench("Heavy usage - stress test", () => {
    const TestComponent = () => null;
    const ProfiledComponent = withProfiler(TestComponent);

    populateRenderHistory(ProfiledComponent, 200);

    // Monkey-patch methods
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

    // Stress test with many calls
    for (let i = 0; i < 20; i++) {
      const _history = ProfiledComponent.getRenderHistory();
      const _avg = ProfiledComponent.getAverageRenderTime();
      const _updates = ProfiledComponent.getRendersByPhase("update");
    }
  });
});
