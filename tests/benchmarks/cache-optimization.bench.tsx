import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { clearProfilerData, withProfiler } from "../../src";

/**
 * Benchmark for getRendersByPhase() and hasMounted() caching
 *
 * These functions now use caching similar to getRenderHistory().
 * Expected behavior:
 * - First call: O(n) calculation, then cached
 * - Repeated calls: O(1) lookup from cache
 * - After new render: cache invalidated, recalculates
 */

const TestComponent = () => <div>Test</div>;

describe("getRendersByPhase() caching", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  bench("single call - 100 renders", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.getRendersByPhase("update");
    unmount();
  });

  bench("10 calls - 100 renders (9 cache hits)", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // 1st call: cache miss, remaining 9: cache hits
    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getRendersByPhase("update");
    }

    unmount();
  });

  bench("100 calls - 100 renders (99 cache hits)", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // 1st call: cache miss, remaining 99: cache hits
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getRendersByPhase("update");
    }

    unmount();
  });

  bench(
    "100 calls - 500 renders (99 cache hits)",
    () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent />);
      }

      for (let i = 0; i < 100; i++) {
        ProfiledComponent.getRendersByPhase("update");
      }

      unmount();
    },
    {
      setup() {
        if (globalThis.gc) {
          globalThis.gc();
        }
      },
      warmupTime: 300,
      time: 2000,
    },
  );

  bench(
    "1000 calls - 500 renders (999 cache hits)",
    () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent />);
      }

      // Demonstrate cache effectiveness with many calls
      for (let i = 0; i < 1000; i++) {
        ProfiledComponent.getRendersByPhase("update");
      }

      unmount();
    },
    {
      setup() {
        if (globalThis.gc) {
          globalThis.gc();
        }
      },
      warmupTime: 300,
      time: 2000,
    },
  );
});

describe("hasMounted() caching", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  bench("single call - 100 renders", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.hasMounted();
    unmount();
  });

  bench("10 calls - 100 renders (9 cache hits)", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 10; i++) {
      ProfiledComponent.hasMounted();
    }

    unmount();
  });

  bench("100 calls - 100 renders (99 cache hits)", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.hasMounted();
    }

    unmount();
  });

  bench(
    "100 calls - 500 renders (99 cache hits)",
    () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent />);
      }

      for (let i = 0; i < 100; i++) {
        ProfiledComponent.hasMounted();
      }

      unmount();
    },
    {
      setup() {
        if (globalThis.gc) {
          globalThis.gc();
        }
      },
      warmupTime: 300,
      time: 2000,
    },
  );

  bench(
    "1000 calls - 500 renders (999 cache hits)",
    () => {
      clearProfilerData();
      const { rerender, unmount } = render(<ProfiledComponent />);

      for (let i = 1; i < 500; i++) {
        rerender(<ProfiledComponent />);
      }

      // Demonstrate cache effectiveness with many calls
      for (let i = 0; i < 1000; i++) {
        ProfiledComponent.hasMounted();
      }

      unmount();
    },
    {
      setup() {
        if (globalThis.gc) {
          globalThis.gc();
        }
      },
      warmupTime: 300,
      time: 2000,
    },
  );
});

describe("Multiple phases caching", () => {
  const ProfiledComponent = withProfiler(TestComponent);

  bench("all 3 phases called 10 times each - 100 renders", () => {
    clearProfilerData();
    const { rerender, unmount } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // Each phase caches independently
    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getRendersByPhase("mount");
      ProfiledComponent.getRendersByPhase("update");
      ProfiledComponent.getRendersByPhase("nested-update");
    }

    unmount();
  });
});
