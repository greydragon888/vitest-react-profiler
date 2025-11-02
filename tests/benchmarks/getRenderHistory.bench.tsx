import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { withProfiler } from "@/withProfiler.tsx";

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
    const _history = ProfiledComponent.getRenderHistory();
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
      const _history = ProfiledComponent.getRenderHistory();
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

    const _history = ProfiledComponent.getRenderHistory();
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
      const _history = ProfiledComponent.getRenderHistory();
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

    const _history = ProfiledComponent.getRenderHistory();
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
      const _history = ProfiledComponent.getRenderHistory();
    }
  });
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

    const _updates = ProfiledComponent.getRendersByPhase("update");
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
      const _updates = ProfiledComponent.getRendersByPhase("update");
    }
  });
});

describe("getRenderHistory - Realistic Test Patterns", () => {
  bench("Typical test - multiple method calls", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 50; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Typical test pattern: check history, average, and phases
    const _history = ProfiledComponent.getRenderHistory();
    const _mounts = ProfiledComponent.getRendersByPhase("mount");
    const _updates = ProfiledComponent.getRendersByPhase("update");
  });

  bench("Stress test - heavy repeated access", () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Simulate heavy usage
    for (let i = 0; i < 20; i++) {
      const _history = ProfiledComponent.getRenderHistory();
      const _updates = ProfiledComponent.getRendersByPhase("update");
    }
  });
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
        const _history = ProfiledComponent.getRenderHistory();
      }
    }
  });
});
