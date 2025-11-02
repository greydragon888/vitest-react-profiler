import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { withProfiler } from "../../src";

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
  bench("single call - 100 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.getRendersByPhase("update");
  });

  bench("10 calls - 100 renders (9 cache hits)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // 1st call: cache miss, remaining 9: cache hits
    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getRendersByPhase("update");
    }
  });

  bench("100 calls - 100 renders (99 cache hits)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // 1st call: cache miss, remaining 99: cache hits
    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getRendersByPhase("update");
    }
  });

  bench("100 calls - 500 renders (99 cache hits)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 500; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.getRendersByPhase("update");
    }
  });
});

describe("hasMounted() caching", () => {
  bench("single call - 100 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    ProfiledComponent.hasMounted();
  });

  bench("10 calls - 100 renders (9 cache hits)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 10; i++) {
      ProfiledComponent.hasMounted();
    }
  });

  bench("100 calls - 100 renders (99 cache hits)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.hasMounted();
    }
  });

  bench("100 calls - 500 renders (99 cache hits)", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 500; i++) {
      rerender(<ProfiledComponent />);
    }

    for (let i = 0; i < 100; i++) {
      ProfiledComponent.hasMounted();
    }
  });
});

describe("Multiple phases caching", () => {
  bench("all 3 phases called 10 times each - 100 renders", () => {
    const ProfiledComponent = withProfiler(TestComponent);
    const { rerender } = render(<ProfiledComponent />);

    for (let i = 1; i < 100; i++) {
      rerender(<ProfiledComponent />);
    }

    // Each phase caches independently
    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getRendersByPhase("mount");
      ProfiledComponent.getRendersByPhase("update");
      ProfiledComponent.getRendersByPhase("nested-update");
    }
  });
});
