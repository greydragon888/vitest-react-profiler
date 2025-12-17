/**
 * Stabilization API - Integration Tests
 *
 * Comprehensive end-to-end testing of the stabilization feature (v1.12.0).
 * Tests cover real-world usage scenarios: debounced search, virtualization simulation.
 *
 * @since v1.12.0
 */

import { render } from "@testing-library/react";
import { useState, useEffect } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

import type { FC } from "react";

/**
 * Component that renders continuously (for testing timeout)
 */
const InfiniteRenderComponent: FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount((c) => c + 1);
    }, 10);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return <div>{count}</div>;
};

describe("Stabilization API - Integration Tests", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("waitForStabilization", () => {
    it("should resolve when component is already stable (no renders after mount)", async () => {
      const TestComponent: FC = () => <div>static</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      expect(ProfiledComponent.getRenderCount()).toBe(1);

      const result = await ProfiledComponent.waitForStabilization({
        debounceMs: 20,
        timeout: 100,
      });

      // No additional renders occurred, renderCount is 0 (since mount)
      expect(result.renderCount).toBe(0);
      expect(result.lastPhase).toBeUndefined();
    });

    it("should wait for component to stop rendering after rapid updates", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      // Start waiting for stabilization
      const stabilizationPromise = ProfiledComponent.waitForStabilization({
        debounceMs: 50,
        timeout: 500,
      });

      // Trigger rapid updates (simulating burst renders)
      for (let i = 1; i <= 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        rerender(<ProfiledComponent value={i} />);
      }

      // Wait for stabilization
      const result = await stabilizationPromise;

      // Should have captured all 5 renders
      expect(result.renderCount).toBe(5);
      expect(result.lastPhase).toBe("update");
    });

    it("should resolve immediately after debounceMs if no more renders occur", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      rerender(<ProfiledComponent value={1} />);

      const startTime = Date.now();
      const result = await ProfiledComponent.waitForStabilization({
        debounceMs: 30,
        timeout: 200,
      });
      const elapsed = Date.now() - startTime;

      // Should resolve after ~30ms debounce
      expect(elapsed).toBeGreaterThanOrEqual(25);
      expect(elapsed).toBeLessThan(100);
      expect(result.renderCount).toBe(0); // No renders during wait (rerender happened before)
    });

    it("should handle debounced search simulation", async () => {
      // Simulate a component that updates many times during typing
      const SearchComponent: FC = () => {
        const [, setSearchTerm] = useState("");
        const [, setUpdateCount] = useState(0);

        // Simulate debounced search updates
        useEffect(() => {
          const timers: NodeJS.Timeout[] = [];

          // Simulate user typing "hello" with debounced updates
          for (let i = 0; i < 5; i++) {
            timers.push(
              setTimeout(() => {
                setSearchTerm("hello".slice(0, i + 1));
                setUpdateCount((c) => c + 1);
              }, i * 15), // 15ms between each keystroke
            );
          }

          return () => {
            timers.forEach((t) => {
              clearTimeout(t);
            });
          };
        }, []);

        return <div>search</div>;
      };

      const ProfiledSearch = withProfiler(SearchComponent);

      render(<ProfiledSearch />);

      // Wait for the search to stabilize
      const result = await ProfiledSearch.waitForStabilization({
        debounceMs: 50,
        timeout: 500,
      });

      // Should have multiple renders from the simulated keystrokes
      expect(result.renderCount).toBeGreaterThanOrEqual(1);
      expect(result.lastPhase).toBe("update");
    });

    it("should reject with timeout error when renders continue too long", async () => {
      const ProfiledInfinite = withProfiler(InfiniteRenderComponent);

      render(<ProfiledInfinite />);

      await expect(
        ProfiledInfinite.waitForStabilization({
          debounceMs: 50,
          timeout: 100,
        }),
      ).rejects.toThrowError(/StabilizationTimeoutError/);
    });

    it("should reject with validation error when debounceMs >= timeout", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      await expect(
        ProfiledComponent.waitForStabilization({
          debounceMs: 100,
          timeout: 100,
        }),
      ).rejects.toThrowError(/ValidationError/);

      await expect(
        ProfiledComponent.waitForStabilization({
          debounceMs: 200,
          timeout: 100,
        }),
      ).rejects.toThrowError(/ValidationError/);
    });

    it("should track lastPhase correctly through multiple render phases", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const promise = ProfiledComponent.waitForStabilization({
        debounceMs: 30,
        timeout: 200,
      });

      // Trigger updates
      rerender(<ProfiledComponent value={1} />);
      rerender(<ProfiledComponent value={2} />);

      const result = await promise;

      // Last phase should be update
      expect(result.lastPhase).toBe("update");
      expect(result.renderCount).toBe(2);
    });
  });

  describe("toEventuallyStabilize matcher", () => {
    it("should pass when component stabilizes", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      rerender(<ProfiledComponent value={1} />);

      await expect(ProfiledComponent).toEventuallyStabilize({
        debounceMs: 20,
        timeout: 100,
      });
    });

    it("should fail when component does not stabilize within timeout", async () => {
      const ProfiledInfinite = withProfiler(InfiniteRenderComponent);

      render(<ProfiledInfinite />);

      await expect(
        expect(ProfiledInfinite).toEventuallyStabilize({
          debounceMs: 30,
          timeout: 80,
        }),
      ).rejects.toThrowError();
    });

    it("should fail with validation error message for invalid options", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      // debounceMs >= timeout should return pass: false with validation message
      // Using the matcher directly to check the result
      const { toEventuallyStabilize } =
        await import("@/matchers/async/stabilization");
      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 100,
        timeout: 50,
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toContain("debounceMs");
      expect(result.message()).toContain("less than timeout");
    });

    it("should work with default options", async () => {
      const TestComponent: FC = () => <div>static</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      // Use defaults (debounceMs: 50, timeout: 1000)
      await expect(ProfiledComponent).toEventuallyStabilize();
    });
  });

  describe("Real-world scenarios", () => {
    it("virtualization simulation: many rapid renders then stable", async () => {
      // Simulate virtual list that renders many times during scroll
      const VirtualList: FC<{ scrollTop: number }> = ({ scrollTop }) => {
        const [, setRenderedItems] = useState<number[]>([]);

        useEffect(() => {
          // Simulate calculating visible items on scroll
          const visible = Array.from(
            { length: 10 },
            (_, i) => Math.floor(scrollTop / 50) + i,
          );

          setRenderedItems(visible);
        }, [scrollTop]);

        return <div>items</div>;
      };

      const ProfiledList = withProfiler(VirtualList);

      const { rerender } = render(<ProfiledList scrollTop={0} />);

      const promise = ProfiledList.waitForStabilization({
        debounceMs: 30,
        timeout: 300,
      });

      // Simulate rapid scrolling
      for (let scrollTop = 0; scrollTop <= 500; scrollTop += 100) {
        rerender(<ProfiledList scrollTop={scrollTop} />);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      const result = await promise;

      // Should capture multiple scroll updates
      expect(result.renderCount).toBeGreaterThanOrEqual(5);
      expect(result.lastPhase).toBe("update");
    });

    it("animation completion: burst of renders then stop", async () => {
      const AnimatedComponent: FC = () => {
        const [frame, setFrame] = useState(0);

        useEffect(() => {
          // Simulate 10-frame animation at 60fps
          const frames = 10;
          let currentFrame = 0;

          const animate = () => {
            if (currentFrame < frames) {
              setFrame(currentFrame++);
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }, []);

        return <div>frame: {frame}</div>;
      };

      const ProfiledAnimation = withProfiler(AnimatedComponent);

      render(<ProfiledAnimation />);

      const result = await ProfiledAnimation.waitForStabilization({
        debounceMs: 50,
        timeout: 500,
      });

      // Animation should complete and stabilize
      expect(result.renderCount).toBeGreaterThanOrEqual(1);
    });

    it("cleanup should work when component unmounts during stabilization", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender, unmount } = render(<ProfiledComponent value={0} />);

      // Start waiting for stabilization
      const stabilizationPromise = ProfiledComponent.waitForStabilization({
        debounceMs: 50,
        timeout: 200,
      });

      // Trigger some updates
      rerender(<ProfiledComponent value={1} />);

      // Unmount during stabilization wait
      unmount();

      // Should still resolve (no memory leaks)
      const result = await stabilizationPromise;

      expect(result.renderCount).toBe(1);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero renderCount when stable from start", async () => {
      const TestComponent: FC = () => <div>static</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await ProfiledComponent.waitForStabilization({
        debounceMs: 10,
        timeout: 100,
      });

      expect(result.renderCount).toBe(0);
      expect(result.lastPhase).toBeUndefined();
    });

    it("should use default options when none provided", async () => {
      const TestComponent: FC = () => <div>static</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      // Default: debounceMs=50, timeout=1000
      const result = await ProfiledComponent.waitForStabilization();

      expect(result.renderCount).toBe(0);
    });

    it("should handle concurrent waitForStabilization calls", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      // Start two concurrent stabilization waits
      const promise1 = ProfiledComponent.waitForStabilization({
        debounceMs: 20,
        timeout: 150,
      });
      const promise2 = ProfiledComponent.waitForStabilization({
        debounceMs: 30,
        timeout: 150,
      });

      rerender(<ProfiledComponent value={1} />);
      rerender(<ProfiledComponent value={2} />);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should capture the same renders
      expect(result1.renderCount).toBe(2);
      expect(result2.renderCount).toBe(2);
    });
  });
});
