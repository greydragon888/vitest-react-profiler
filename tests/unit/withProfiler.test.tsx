import { render, waitFor } from "@testing-library/react";
import { useState, useEffect, memo, StrictMode } from "react";
import { describe, beforeEach, it, expectTypeOf, expect, vi } from "vitest";

import { withProfiler } from "../../src";
import { MemoizedComponent } from "../fixtures/MemoizedComponent";
import { SimpleComponent } from "../fixtures/SimpleComponent";
import { StatefulComponent } from "../fixtures/StatefulComponent";

import type { ProfiledComponent } from "../../src";
import type { FC, ComponentType } from "react";

// Test components

describe("withProfiler", () => {
  let ProfiledSimple: ProfiledComponent<{ value?: string }> &
    ComponentType<{ value?: string }>;

  beforeEach(() => {
    // Create fresh profiled component for each test
    ProfiledSimple = withProfiler(SimpleComponent, "SimpleComponent");
  });

  describe("Component Creation", () => {
    // eslint-disable-next-line vitest/expect-expect
    it("should create a profiled component with all required methods", () => {
      const Profiled = withProfiler(SimpleComponent);

      // Check that all methods exist
      // @ts-expect-error - expectTypeOf doesn't recognize callable types
      expectTypeOf(Profiled).toBeFunction();
      expectTypeOf(Profiled.getRenderCount).toBeFunction();
      expectTypeOf(Profiled.getRenderHistory).toBeFunction();
      expectTypeOf(Profiled.getLastRender).toBeFunction();
      expectTypeOf(Profiled.getRenderAt).toBeFunction();
      expectTypeOf(Profiled.getRendersByPhase).toBeFunction();
      expectTypeOf(Profiled.getAverageRenderTime).toBeFunction();
      expectTypeOf(Profiled.hasMounted).toBeFunction();
    });

    it("should preserve component display name", () => {
      const Named = withProfiler(SimpleComponent, "CustomName");

      expect(Named.displayName).toBe("withProfiler(CustomName)");

      const Unnamed = withProfiler(SimpleComponent);

      expect(Unnamed.displayName).toBe("withProfiler(SimpleComponent)");
    });

    it("should preserve original component reference", () => {
      const Profiled = withProfiler(SimpleComponent);

      expect(Profiled.OriginalComponent).toBe(SimpleComponent);
    });

    it("should render the wrapped component correctly", () => {
      const { getByText } = render(<ProfiledSimple value="test" />);

      expect(getByText("test")).toBeInTheDocument();
    });
  });

  describe("Render Counting", () => {
    it("should count initial mount as 1 render", () => {
      expect(ProfiledSimple.getRenderCount()).toBe(0);

      render(<ProfiledSimple />);

      expect(ProfiledSimple.getRenderCount()).toBe(1);
    });

    it("should count re-renders correctly", () => {
      const { rerender } = render(<ProfiledSimple value="first" />);

      expect(ProfiledSimple.getRenderCount()).toBe(1);

      rerender(<ProfiledSimple value="second" />);

      expect(ProfiledSimple.getRenderCount()).toBe(2);

      rerender(<ProfiledSimple value="third" />);

      expect(ProfiledSimple.getRenderCount()).toBe(3);
    });

    it("should track multiple instances of the same component", () => {
      render(<ProfiledSimple key="1" value="one" />);
      render(<ProfiledSimple key="2" value="two" />);

      // Both instances contribute to the same counter
      expect(ProfiledSimple.getRenderCount()).toBe(2);
    });

    it("should handle unmount and remount", () => {
      const { unmount } = render(<ProfiledSimple />);

      expect(ProfiledSimple.getRenderCount()).toBe(1);

      unmount();

      expect(ProfiledSimple.getRenderCount()).toBe(1); // Count persists after unmount

      render(<ProfiledSimple />);

      expect(ProfiledSimple.getRenderCount()).toBe(2); // New mount adds to count
    });
  });

  describe("Phase Tracking", () => {
    it("should correctly identify mount phase", () => {
      render(<ProfiledSimple />);

      const lastRender = ProfiledSimple.getLastRender();

      expect(lastRender?.phase).toBe("mount");
      expect(ProfiledSimple.hasMounted()).toBe(true);
    });

    it("should correctly identify update phase", () => {
      const { rerender } = render(<ProfiledSimple value="initial" />);

      rerender(<ProfiledSimple value="updated" />);

      const history = ProfiledSimple.getRenderHistory();

      expect(history[0]?.phase).toBe("mount");
      expect(history[1]?.phase).toBe("update");
    });

    it("should filter renders by phase", () => {
      const { rerender } = render(<ProfiledSimple value="1" />);

      rerender(<ProfiledSimple value="2" />);
      rerender(<ProfiledSimple value="3" />);

      const mounts = ProfiledSimple.getRendersByPhase("mount");
      const updates = ProfiledSimple.getRendersByPhase("update");

      expect(mounts).toHaveLength(1);
      expect(updates).toHaveLength(2);
    });

    it("should handle nested updates", async () => {
      const ProfiledStateful = withProfiler(StatefulComponent);

      render(<ProfiledStateful initial={0} />);

      // Wait for useEffect to trigger updates
      await waitFor(() => {
        expect(ProfiledStateful.getRenderCount()).toBeGreaterThan(1);
      });

      const history = ProfiledStateful.getRenderHistory();

      expect(history[0]?.phase).toBe("mount");
      // Subsequent renders should be updates or nested-updates
      expect(["update", "nested-update"]).toContain(history[1]?.phase);
    });
  });

  describe("Render History", () => {
    it("should maintain complete render history", () => {
      const { rerender } = render(<ProfiledSimple value="1" />);

      rerender(<ProfiledSimple value="2" />);
      rerender(<ProfiledSimple value="3" />);

      const history = ProfiledSimple.getRenderHistory();

      expect(history).toHaveLength(3);

      // History should be frozen (immutable)
      expect(Object.isFrozen(history)).toBe(true);
    });

    it("should access specific render by index", () => {
      const { rerender } = render(<ProfiledSimple value="1" />);

      rerender(<ProfiledSimple value="2" />);

      const firstRender = ProfiledSimple.getRenderAt(0);
      const secondRender = ProfiledSimple.getRenderAt(1);
      const nonExistent = ProfiledSimple.getRenderAt(10);

      expect(firstRender?.phase).toBe("mount");
      expect(secondRender?.phase).toBe("update");
      expect(nonExistent).toBeUndefined();
    });

    it("should return empty history before any renders", () => {
      const Fresh = withProfiler(SimpleComponent);

      expect(Fresh.getRenderHistory()).toStrictEqual([]);
      expect(Fresh.getRenderCount()).toBe(0);
      expect(Fresh.getLastRender()).toBeUndefined();
    });

    it("should preserve render metadata", () => {
      render(<ProfiledSimple />);

      const lastRender = ProfiledSimple.getLastRender();

      expect(lastRender).toMatchObject({
        phase: expect.any(String),
        actualDuration: expect.any(Number),
        baseDuration: expect.any(Number),
        startTime: expect.any(Number),
        commitTime: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });
  });

  describe("Performance Metrics", () => {
    it("should measure render duration", () => {
      render(<ProfiledSimple />);

      const lastRender = ProfiledSimple.getLastRender();

      expect(lastRender?.actualDuration).toBeGreaterThanOrEqual(0);
      expect(lastRender?.baseDuration).toBeGreaterThanOrEqual(0);
    });

    it("should calculate average render time", () => {
      const { rerender } = render(<ProfiledSimple value="1" />);

      rerender(<ProfiledSimple value="2" />);
      rerender(<ProfiledSimple value="3" />);

      const avgTime = ProfiledSimple.getAverageRenderTime();

      expect(avgTime).toBeGreaterThanOrEqual(0);

      expectTypeOf(avgTime).toBeNumber();
    });

    it("should return 0 average time when no renders", () => {
      const Fresh = withProfiler(SimpleComponent);

      expect(Fresh.getAverageRenderTime()).toBe(0);
    });

    it("should track performance across multiple renders", () => {
      const { rerender } = render(<ProfiledSimple />);

      for (let i = 0; i < 5; i++) {
        rerender(<ProfiledSimple value={`render-${i}`} />);
      }

      const history = ProfiledSimple.getRenderHistory();
      const totalDuration = history.reduce(
        (sum, r) => sum + r.actualDuration,
        0,
      );
      const avgTime = ProfiledSimple.getAverageRenderTime();

      expect(avgTime).toBeCloseTo(totalDuration / history.length, 5);
    });
  });

  describe("Automatic Cleanup", () => {
    it("should automatically clear data between tests", () => {
      // This test relies on automatic cleanup from previous test
      // If automatic cleanup works, render count should start at 0
      expect(ProfiledSimple.getRenderCount()).toBe(0);

      render(<ProfiledSimple value="test" />);

      expect(ProfiledSimple.getRenderCount()).toBe(1);
    });

    it("should have clean state from previous test", () => {
      // Previous test rendered once, but this test should start fresh
      expect(ProfiledSimple.getRenderCount()).toBe(0);
      expect(ProfiledSimple.getRenderHistory()).toStrictEqual([]);
      expect(ProfiledSimple.getLastRender()).toBeUndefined();
      expect(ProfiledSimple.hasMounted()).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle data persistence across renders", () => {
      const TestComponent: FC = () => <div>Test</div>;
      const ProfiledTest = withProfiler(TestComponent, "TestComponent");

      // Render the component to initialize it
      const { unmount } = render(<ProfiledTest />);

      expect(ProfiledTest.getRenderCount()).toBe(1);

      // Unmount the component
      unmount();

      // Data should persist after unmount
      expect(ProfiledTest.getRenderCount()).toBe(1);
      expect(ProfiledTest.getRenderHistory()).toHaveLength(1);
    });

    it("should track multiple component instances independently", () => {
      const TestComponent: FC = () => <div>Test</div>;

      // Create two different wrappers for the same component
      const ProfiledTest1 = withProfiler(TestComponent, "Test1");
      const ProfiledTest2 = withProfiler(TestComponent, "Test2");

      // Render first wrapper
      render(<ProfiledTest1 />);

      expect(ProfiledTest1.getRenderCount()).toBe(1);

      // Verify that second wrapper shares the same underlying component data
      // (since they wrap the same Component reference)
      render(<ProfiledTest2 />);

      // Both wrappers point to the same component, so count accumulates
      expect(ProfiledTest2.getRenderCount()).toBe(2);
    });

    it("should handle React.StrictMode double rendering", () => {
      const ProfiledStrict = withProfiler(SimpleComponent);

      render(
        <StrictMode>
          <ProfiledStrict />
        </StrictMode>,
      );

      // StrictMode may cause double rendering in development
      expect(ProfiledStrict.getRenderCount()).toBeGreaterThanOrEqual(1);
    });

    it("should handle components without display name", () => {
      const AnonymousComponent = () => <div>anonymous</div>;
      const ProfiledAnon = withProfiler(AnonymousComponent);

      expect(ProfiledAnon.displayName).toContain("withProfiler");
    });

    it("should handle rapid re-renders", () => {
      const { rerender } = render(<ProfiledSimple value="0" />);

      for (let i = 1; i <= 100; i++) {
        rerender(<ProfiledSimple value={`${i}`} />);
      }

      expect(ProfiledSimple.getRenderCount()).toBe(101);
      expect(ProfiledSimple.getRenderHistory()).toHaveLength(101);
    });

    it("should return frozen arrays to prevent mutation", () => {
      render(<ProfiledSimple />);

      const history = ProfiledSimple.getRenderHistory();
      const mounts = ProfiledSimple.getRendersByPhase("mount");

      expect(Object.isFrozen(history)).toBe(true);
      expect(Object.isFrozen(mounts)).toBe(true);

      // Attempting to mutate should fail silently or throw in strict mode
      expect(() => {
        (history as any).push({} as any);
      }).toThrow();
    });

    it("should handle conditional rendering", () => {
      const ConditionalWrapper: FC<{ show: boolean }> = ({ show }) => {
        return show ? <ProfiledSimple /> : null;
      };

      const { rerender } = render(<ConditionalWrapper show={true} />);

      expect(ProfiledSimple.getRenderCount()).toBe(1);

      rerender(<ConditionalWrapper show={false} />);

      expect(ProfiledSimple.getRenderCount()).toBe(1); // No new render

      rerender(<ConditionalWrapper show={true} />);

      expect(ProfiledSimple.getRenderCount()).toBe(2); // New mount
    });
  });

  describe("Isolation Between Components", () => {
    it("should maintain separate data for different components", async () => {
      const ProfiledA = withProfiler(SimpleComponent, "ComponentA");
      const ProfiledB = withProfiler(StatefulComponent, "ComponentB");

      render(<ProfiledA />);
      render(<ProfiledB />);

      // Different components maintain separate render counts
      expect(ProfiledA.getRenderCount()).toBe(1);

      await waitFor(() => {
        expect(ProfiledB.getRenderCount()).toBeGreaterThanOrEqual(3);
      });

      const countB = ProfiledB.getRenderCount();

      // Rendering ProfiledA again should not affect ProfiledB's count
      render(<ProfiledA />);

      expect(ProfiledA.getRenderCount()).toBe(2);
      expect(ProfiledB.getRenderCount()).toBe(countB); // B should not be affected
    });

    it("should handle same component wrapped multiple times", () => {
      const Profiled1 = withProfiler(SimpleComponent);
      const Profiled2 = withProfiler(SimpleComponent);

      render(<Profiled1 />);

      // Same underlying component, data should be shared
      expect(Profiled1.getRenderCount()).toBe(1);
      expect(Profiled2.getRenderCount()).toBe(1);
    });
  });

  describe("Memoization Support", () => {
    it("should work with React.memo components", () => {
      const ProfiledMemo = withProfiler(MemoizedComponent);
      const MemoProfiled = memo(ProfiledMemo);

      const data = ["item1", "item2"];
      const { rerender } = render(<MemoProfiled data={data} />);

      expect(ProfiledMemo.getRenderCount()).toBe(1);

      // Same reference should not trigger re-render
      rerender(<MemoProfiled data={data} />);

      expect(ProfiledMemo.getRenderCount()).toBe(1);

      // New reference should trigger re-render
      rerender(<MemoProfiled data={[...data]} />);

      expect(ProfiledMemo.getRenderCount()).toBe(2);
    });
  });
});

describe("withProfiler Integration", () => {
  it("should work with React Testing Library queries", () => {
    const Interactive: FC<{ onClick?: () => void }> = ({ onClick }) => (
      <button onClick={onClick}>Click me</button>
    );

    const ProfiledInteractive = withProfiler(Interactive);
    const handleClick = vi.fn();

    const { getByRole } = render(<ProfiledInteractive onClick={handleClick} />);

    const button = getByRole("button");

    button.click();

    expect(handleClick).toHaveBeenCalled();
    expect(ProfiledInteractive.getRenderCount()).toBe(1);
  });

  it("should work with async components", async () => {
    const AsyncComponent: FC = () => {
      const [data, setData] = useState<string | null>(null);

      useEffect(() => {
        setTimeout(() => {
          setData("loaded");
        }, 10);
      }, []);

      return <div>{data ?? "loading"}</div>;
    };

    const ProfiledAsync = withProfiler(AsyncComponent);
    const { getByText } = render(<ProfiledAsync />);

    expect(getByText("loading")).toBeInTheDocument();
    expect(ProfiledAsync.getRenderCount()).toBe(1);

    await waitFor(() => {
      expect(getByText("loaded")).toBeInTheDocument();
    });

    expect(ProfiledAsync.getRenderCount()).toBe(2);
  });
});
