import { render } from "@testing-library/react";
import { bench, describe } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Benchmark suite for realistic test patterns
 *
 * This benchmark measures real-world usage patterns that developers
 * commonly use in their tests. Only measurable scenarios are included.
 *
 * Purpose: Measure performance impact of v1.5.0 architecture on typical usage patterns.
 * Context: PERFORMANCE_ANALYSIS.md showed -20% regression on "Typical test - multiple method calls"
 *
 * Key insight: Only fail scenarios (with formatting) are measurable.
 * Pass-only scenarios complete in microseconds and produce NaN results.
 */

const TestComponent: FC<{ value: number }> = ({ value }) => <div>{value}</div>;

describe("Realistic Test Patterns - Performance", () => {
  describe("Pattern 1: Multiple Method Calls (Baseline Comparison)", () => {
    bench("50 renders → 3 method calls (baseline pattern)", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 50; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Typical test pattern: check history, mounts, and updates
      void ProfiledComponent.getRenderHistory();
      void ProfiledComponent.getRendersByPhase("mount");
      void ProfiledComponent.getRendersByPhase("update");
    });

    bench("50 renders → 3 method calls + 1 fail matcher", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 50; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Typical test pattern
      void ProfiledComponent.getRenderHistory();
      void ProfiledComponent.getRendersByPhase("mount");
      void ProfiledComponent.getRendersByPhase("update");

      // Add fail matcher (makes test measurable)
      try {
        expect(ProfiledComponent).toHaveRenderedTimes(999);
      } catch {
        // Expected
      }
    });
  });

  describe("Pattern 2: Repeated Assertions After Rerenders", () => {
    bench("3 rerenders → repeated fail matcher (worst case)", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i <= 3; i++) {
        rerender(<ProfiledComponent value={i} />);

        // Use matcher that fails after each rerender (worst case)
        try {
          expect(ProfiledComponent).toHaveRenderedTimes(999);
        } catch {
          // Expected
        }
      }
    });

    bench("10 rerenders → 1 fail matcher after each", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i <= 10; i++) {
        rerender(<ProfiledComponent value={i} />);

        // Fail matcher after each rerender
        try {
          expect(ProfiledComponent).toHaveRenderedTimes(999);
        } catch {
          // Expected
        }
      }
    });

    bench("20 rerenders → 1 fail matcher after each", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i <= 20; i++) {
        rerender(<ProfiledComponent value={i} />);

        // Fail matcher after each rerender
        try {
          expect(ProfiledComponent).toHaveRenderedTimes(999);
        } catch {
          // Expected
        }
      }
    });
  });

  describe("Pattern 3: Multiple Fail Matchers (Heavy Formatting)", () => {
    bench("10 renders → 2 fail matchers", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Multiple fail matchers (trigger formatting multiple times)
      try {
        expect(ProfiledComponent).toHaveRenderedTimes(999);
      } catch {
        // Expected
      }

      try {
        expect(ProfiledComponent).toHaveOnlyMounted();
      } catch {
        // Expected
      }
    });

    bench("10 renders → 3 fail matchers", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 10; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Multiple fail matchers
      try {
        expect(ProfiledComponent).toHaveRenderedTimes(999);
      } catch {
        // Expected
      }

      try {
        expect(ProfiledComponent).toHaveOnlyMounted();
      } catch {
        // Expected
      }

      try {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      } catch {
        // Expected
      }
    });

    bench("50 renders → 3 fail matchers (stress test)", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 50; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Multiple fail matchers on large history
      try {
        expect(ProfiledComponent).toHaveRenderedTimes(999);
      } catch {
        // Expected
      }

      try {
        expect(ProfiledComponent).toHaveOnlyMounted();
      } catch {
        // Expected
      }

      try {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      } catch {
        // Expected
      }
    });
  });

  describe("Pattern 4: Realistic Test Workflows", () => {
    bench("Mount → 5 rerenders → 3 method calls + 1 fail matcher", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i <= 5; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Method calls
      void ProfiledComponent.getRendersByPhase("mount");
      void ProfiledComponent.getRendersByPhase("update");
      void ProfiledComponent.getRenderCount();

      // Fail matcher
      try {
        expect(ProfiledComponent).toHaveRenderedTimes(999);
      } catch {
        // Expected
      }
    });

    bench("Mount → unmount → remount → fail matcher", () => {
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      rerender(<ProfiledComponent value={1} />);
      unmount();
      render(<ProfiledComponent value={2} />);

      // Fail matcher (expects one mount, but got two)
      try {
        expect(ProfiledComponent).toHaveMountedOnce();
      } catch {
        // Expected
      }
    });

    bench("100 renders → getRenderHistory + fail matcher", () => {
      const ProfiledComponent = withProfiler(TestComponent);
      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i < 100; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // Large history access + fail matcher
      void ProfiledComponent.getRenderHistory();

      try {
        expect(ProfiledComponent).toHaveRenderedTimes(999);
      } catch {
        // Expected
      }
    });
  });
});
