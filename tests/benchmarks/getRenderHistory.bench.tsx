import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Optimized benchmark suite for getRenderHistory caching performance
 *
 * This benchmark tests the REAL implementation with proper component lifecycle.
 * Compares performance between first call (uncached) and repeated calls (cached).
 *
 * Key improvements over previous benchmarks:
 * - Tests actual withProfiler implementation (no monkey-patching)
 * - Proper React rendering and cleanup
 * - Separate benchmarks for cache-miss vs cache-hit scenarios
 * - Memory-safe component lifecycle management
 */

describe("getRenderHistory - Cache Performance (Optimized)", () => {
  // Small history - typical unit test scenario
  bench("10 renders - first call (cache miss)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Generate 9 more renders (total 10)
    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // First call - cache miss
    void ProfiledComponent.getRenderHistory();
  });

  bench("10 renders - 100 calls (cache hit)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Prime the cache
    ProfiledComponent.getRenderHistory();

    // 100 cached calls
    for (let i = 0; i < 100; i++) {
      void ProfiledComponent.getRenderHistory();
    }
  });

  // Medium history - typical integration test scenario
  bench("50 renders - first call (cache miss)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    void ProfiledComponent.getRenderHistory();
  });

  bench("50 renders - 100 calls (cache hit)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    ProfiledComponent.getRenderHistory();

    for (let i = 0; i < 100; i++) {
      void ProfiledComponent.getRenderHistory();
    }
  });

  // Large history - stress test scenario
  bench("100 renders - first call (cache miss)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    void ProfiledComponent.getRenderHistory();
  });

  bench("100 renders - 100 calls (cache hit)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    ProfiledComponent.getRenderHistory();

    for (let i = 0; i < 100; i++) {
      void ProfiledComponent.getRenderHistory();
    }
  });

  // Extreme stress tests - 1000 renders
  bench("1000 renders - first call (extreme cache miss)", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // First call - cache miss, expensive array copy
    void ProfiledComponent.getRenderHistory();
  });

  bench(
    "1000 renders - 500 calls (extreme cache hit)",
    () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 1000; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Prime the cache
      ProfiledComponent.getRenderHistory();

      // 500 cached calls - reduced from 1000 to improve stability
      for (let i = 0; i < 500; i++) {
        void ProfiledComponent.getRenderHistory();
      }
    },
    {
      warmupTime: 500, // Extended warmup to reduce GC variance
      time: 1000, // More samples for stability
    },
  );
});

describe("getRenderHistory - Methods Using Cache", () => {
  bench("getRendersByPhase - 100 renders, single call", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    void ProfiledComponent.getRendersByPhase("update");
  });

  bench("getRendersByPhase - 100 renders, 100 calls", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    for (let i = 0; i < 100; i++) {
      void ProfiledComponent.getRendersByPhase("update");
    }
  });
});

describe("getRenderHistory - Realistic Test Patterns", () => {
  bench(
    "Typical test - multiple method calls",
    () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 50; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Repeat typical test pattern 10 times for stable measurements
      for (let rep = 0; rep < 10; rep++) {
        void ProfiledComponent.getRenderHistory();
        void ProfiledComponent.getRendersByPhase("mount");
        void ProfiledComponent.getRendersByPhase("update");
      }
    },
    {
      time: 1000, // Run for 1 second
      warmupTime: 200, // Warmup for JIT
    },
  );

  bench(
    "Stress test - heavy repeated access",
    () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Simulate heavy usage - increased from 20 to 50 iterations
      for (let i = 0; i < 50; i++) {
        void ProfiledComponent.getRenderHistory();
        void ProfiledComponent.getRendersByPhase("update");
      }
    },
    {
      time: 1000, // Run for 1 second
      warmupTime: 200, // Warmup for JIT
    },
  );
});

describe("getRenderHistory - Cache Invalidation Pattern", () => {
  bench("Alternating render and read - 50 cycles", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Simulate pattern: render -> read multiple times -> render -> read multiple times
    for (let cycle = 0; cycle < 10; cycle++) {
      // New render (invalidates cache)
      for (let i = 0; i < 5; i++) {
        rerender(<ProfiledComponent value={cycle * 5 + i} />);
      }

      // Multiple reads (should use cache after first)
      for (let i = 0; i < 5; i++) {
        void ProfiledComponent.getRenderHistory();
      }
    }
  });
});
