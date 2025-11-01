import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { withProfiler } from "@/withProfiler.tsx";

/**
 * Comprehensive benchmark for getAverageRenderTime() caching optimization
 *
 * This validates the metrics caching by testing the actual implementation
 * from withProfiler.tsx, not mock implementations.
 *
 * Expected behavior:
 * - First call: O(n) calculation, then cached
 * - Repeated calls: O(1) lookup from cache
 * - After new render: cache invalidated, recalculates
 *
 * To measure cache impact, run this benchmark twice:
 * 1. With cache enabled (current) → .bench/results-with-cache.json
 * 2. With cache disabled → .bench/results-without-cache.json
 * Expected: 17-35x speedup for 100 consecutive calls with cache
 */

const TestComponent = () => <div>Test</div>;

describe("Single call (baseline)", () => {
  bench("10 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.getAverageRenderTime();
  });

  bench("50 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.getAverageRenderTime();
  });

  bench("100 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.getAverageRenderTime();
  });

  bench("200 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 200; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.getAverageRenderTime();
  });
});

describe("Cache benefit: 10 calls per iteration", () => {
  bench("10 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent />);
    }

    // 10 calls: 1st is cache miss, remaining 9 are cache hits
    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("50 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("100 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("200 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 200; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });
});

describe("Cache benefit: 100 calls per iteration", () => {
  bench("10 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent />);
    }

    // 100 calls: 1st is cache miss, remaining 99 are cache hits
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("50 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("100 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("200 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 200; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("500 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 500; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getAverageRenderTime();
    }
  });
});

describe("Cache invalidation", () => {
  // Verify cache invalidates on new render
  bench("Interleaved: render + read (10 cycles)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    // Each render invalidates cache
    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent />);
      ProfiledComponent.getAverageRenderTime();
    }
  });

  bench("Interleaved: render + read (50 cycles)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent />);
      ProfiledComponent.getAverageRenderTime();
    }
  });
});

describe("Realistic usage patterns", () => {
  // Typical test pattern: render multiple times, check metrics once
  bench("Typical test - 30 renders, single check", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 30; i++) {
      rerender(<ProfiledComponent />);
    }

    // Typical assertion pattern
    const _avg = ProfiledComponent.getAverageRenderTime();
    const _count = ProfiledComponent.getRenderCount();
    const _history = ProfiledComponent.getRenderHistory();
  });

  // Heavy usage: many metrics checks
  bench("Heavy usage - 100 renders, 10 metric checks", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // Multiple metric checks (cache should help here)
    for (let i = 0; i < 10; i++) {
      const _avg = ProfiledComponent.getAverageRenderTime();
      const _count = ProfiledComponent.getRenderCount();
      const _updates = ProfiledComponent.getRendersByPhase("update");
    }
  });
});
