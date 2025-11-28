import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { clearProfilerData, withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Benchmark suite for core ProfiledComponent methods
 *
 * This benchmark measures the performance of the three basic accessor methods:
 * - getRenderCount() - Returns total number of renders (O(1) expected)
 * - getLastRender() - Returns the most recent render info (O(1) expected)
 * - getRenderAt() - Returns render info at specific index (O(1) expected)
 *
 * Purpose: Establish baseline performance metrics before v1.5.0 architecture refactoring
 *
 * What we measure:
 * - Throughput (calls per second)
 * - Latency (time per single call)
 * - Scalability (performance with 10 vs 100 vs 500 renders)
 */

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("Core Methods - Performance", () => {
  describe("getRenderCount()", () => {
    const ProfiledComponent = withProfiler(TestComponent);

    bench("10 renders - single call", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      ProfiledComponent.getRenderCount();
      unmount();
    });

    bench("10 renders - 100 calls", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      for (let i = 0; i < 100; i++) {
        void ProfiledComponent.getRenderCount();
      }

      unmount();
    });

    bench("100 renders - 100 calls", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      for (let i = 0; i < 100; i++) {
        void ProfiledComponent.getRenderCount();
      }

      unmount();
    });

    bench(
      "500 renders - 1000 calls (scalability check)",
      () => {
        clearProfilerData();
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 500; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        for (let i = 0; i < 1000; i++) {
          void ProfiledComponent.getRenderCount();
        }

        unmount();
      },
      {
        warmupTime: 200, // V8 JIT warmup
        time: 1000, // More samples for stability
      },
    );
  });

  describe("getLastRender()", () => {
    const ProfiledComponent = withProfiler(TestComponent);

    bench("10 renders - single call", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      void ProfiledComponent.getLastRender();
      unmount();
    });

    bench("10 renders - 100 calls", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      for (let i = 0; i < 100; i++) {
        void ProfiledComponent.getLastRender();
      }

      unmount();
    });

    bench(
      "500 renders - 1000 calls (scalability check)",
      () => {
        clearProfilerData();
        const { rerender, unmount } = render(<ProfiledComponent value={0} />);

        for (let i = 1; i < 500; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        for (let i = 0; i < 1000; i++) {
          void ProfiledComponent.getLastRender();
        }

        unmount();
      },
      {
        warmupTime: 200, // V8 JIT warmup
        time: 1000, // More samples for stability
      },
    );
  });

  describe("getRenderAt()", () => {
    const ProfiledComponent = withProfiler(TestComponent);

    bench("100 renders - random access (100 calls)", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      for (let i = 0; i < 100; i++) {
        const index = Math.floor(Math.random() * 100);

        void ProfiledComponent.getRenderAt(index);
      }

      unmount();
    });

    bench("100 renders - sequential access (100 calls)", () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      for (let i = 0; i < 100; i++) {
        void ProfiledComponent.getRenderAt(i);
      }

      unmount();
    });
  });
});
