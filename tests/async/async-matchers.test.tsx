import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

// Helper component that triggers 3 renders (mount + 2 updates)
const createAsyncCounter = () => {
  const Counter = () => {
    const [count, setCount] = useState(0);

    if (count < 2) {
      setTimeout(() => {
        setCount(count + 1);
      }, 10);
    }

    return <div>{count}</div>;
  };

  return Counter;
};

// Helper component for fast performance tests (triggers 2 renders with 5ms delay)
const createFastCounter = () => {
  const Counter = () => {
    const [count, setCount] = useState(0);

    if (count === 0) {
      setTimeout(() => {
        setCount(1);
      }, 5);
    }

    return <div>{count}</div>;
  };

  return Counter;
};

describe("toEventuallyRenderTimes", () => {
  it("should pass when exact render count is reached", async () => {
    const ProfiledCounter = withProfiler(createAsyncCounter());

    render(<ProfiledCounter />);

    await expect(ProfiledCounter).toEventuallyRenderTimes(3);

    expect(ProfiledCounter.getRenderCount()).toBe(3);
  });

  it("should fail when render count not reached within timeout", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    await expect(
      expect(ProfiledStatic).toEventuallyRenderTimes(5, { timeout: 100 }),
    ).rejects.toThrow(
      /Expected component to eventually render 5 times within 100ms, but got 1/,
    );
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyRenderTimes(1),
    ).rejects.toThrow(/Expected a profiled component/);
  });

  it("should fail with invalid render count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(-1),
    ).rejects.toThrow(/must be a non-negative integer/);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(1.5),
    ).rejects.toThrow(/must be a non-negative integer/);
  });

  it("should accept 0 as valid expected count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Don't render - count is 0
    // Should succeed when expecting 0 renders
    await expect(ProfiledComponent).toEventuallyRenderTimes(0, { timeout: 50 });

    expect(ProfiledComponent.getRenderCount()).toBe(0);
  });

  it("should use custom timeout", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    const start = Date.now();

    await expect(
      expect(ProfiledStatic).toEventuallyRenderTimes(3, { timeout: 150 }),
    ).rejects.toThrow();

    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(130);
    expect(elapsed).toBeLessThan(250);
  });

  it("should show detailed error message with render history", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    let error: unknown;

    try {
      await expect(ProfiledComponent).toEventuallyRenderTimes(3, {
        timeout: 50,
      });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringContaining("1 render (1 mount)"),
    });
    expect(error).toMatchObject({
      message: expect.stringContaining("#1 [mount"),
    });
  });

  it("should fail .not assertion when exact render count IS reached", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).not.toEventuallyRenderTimes(1),
    ).rejects.toThrow(
      /Expected component not to eventually render 1 times within \d+ms, but it did/,
    );
  });

  it("should fail .not assertion when render count is reached AFTER starting to wait", async () => {
    // This test covers the onRender callback path (lines 86-92 in render-count.ts)
    // where the exact count is reached while we're actively waiting
    const Counter = createFastCounter();
    const ProfiledCounter = withProfiler(Counter);

    const { rerender } = render(<ProfiledCounter />);

    // Component is at render count 1, we wait for count 2 with .not
    const promise = expect(ProfiledCounter).not.toEventuallyRenderTimes(2);

    // Trigger second render - this will cause the .not assertion to fail
    rerender(<ProfiledCounter />);

    // The promise should reject with the appropriate message
    await expect(promise).rejects.toThrow(
      /Expected component not to eventually render 2 times within \d+ms, but it did/,
    );
  });
});

describe("toEventuallyRenderAtLeast", () => {
  it("should pass when minimum render count is reached", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      if (count < 3) {
        setTimeout(() => {
          setCount(count + 1);
        }, 10);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Wait for at least 2 (will be more)
    await expect(ProfiledCounter).toEventuallyRenderAtLeast(2);

    expect(ProfiledCounter.getRenderCount()).toBeGreaterThanOrEqual(2);
  });

  it("should pass immediately if already at minimum", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(ProfiledComponent).toEventuallyRenderAtLeast(1);
  });

  it("should fail when minimum not reached within timeout", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    await expect(
      expect(ProfiledStatic).toEventuallyRenderAtLeast(3, { timeout: 100 }),
    ).rejects.toThrow(
      /Expected component to eventually render at least 3 times within 100ms, but got 1/,
    );
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyRenderAtLeast(1),
    ).rejects.toThrow(/Expected a profiled component/);
  });

  it("should fail with invalid minimum count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderAtLeast(-1),
    ).rejects.toThrow(/must be a non-negative integer/);
  });

  it("should accept 0 as valid minimum count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Don't render - count is 0
    // Should succeed when expecting at least 0 renders
    await expect(ProfiledComponent).toEventuallyRenderAtLeast(0, {
      timeout: 50,
    });

    expect(ProfiledComponent.getRenderCount()).toBe(0);
  });

  it("should fail .not assertion when minimum render count IS reached", async () => {
    const ProfiledCounter = withProfiler(createAsyncCounter());

    render(<ProfiledCounter />);

    await expect(
      expect(ProfiledCounter).not.toEventuallyRenderAtLeast(2),
    ).rejects.toThrow(
      /Expected component not to eventually render at least 2 times within \d+ms, but it rendered \d+ times/,
    );
  });

  it("should fail .not assertion when minimum already reached (early return)", async () => {
    // This test covers the early return path (lines 143-149 in render-count.ts)
    // where the minimum count is already reached when we start waiting
    const Counter = createFastCounter();
    const ProfiledCounter = withProfiler(Counter);

    const { rerender } = render(<ProfiledCounter />);

    // Trigger additional renders to ensure we have >= 3 renders
    rerender(<ProfiledCounter />);
    rerender(<ProfiledCounter />);

    // At this point, component has 3 renders
    expect(ProfiledCounter.getRenderCount()).toBe(3);

    // Now check .not assertion - should fail immediately (early return)
    await expect(
      expect(ProfiledCounter).not.toEventuallyRenderAtLeast(2),
    ).rejects.toThrow(
      /Expected component not to eventually render at least 2 times within \d+ms, but it rendered 3 times/,
    );
  });
});

describe("toEventuallyReachPhase", () => {
  it("should pass when mount phase is reached", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(ProfiledComponent).toEventuallyReachPhase("mount");
  });

  it("should pass when update phase is reached", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      if (count === 0) {
        setTimeout(() => {
          setCount(1);
        }, 20);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    await expect(ProfiledCounter).toEventuallyReachPhase("update");

    expect(ProfiledCounter.getRendersByPhase("update").length).toBeGreaterThan(
      0,
    );
  });

  it("should fail when phase not reached within timeout", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    await expect(
      expect(ProfiledStatic).toEventuallyReachPhase("update", { timeout: 100 }),
    ).rejects.toThrow(/Expected component to eventually reach phase "update"/);
  });

  it("should NOT resolve on wrong phase (only timeout on correct phase)", async () => {
    // This test ensures that we only resolve when renderPhase === phase
    // Mutant changes to: if (true) which would resolve on ANY phase
    const OnlyMountsComponent = () => <div>Static</div>;
    const ProfiledComponent = withProfiler(OnlyMountsComponent);

    render(<ProfiledComponent />);

    // Component only has "mount" phase, we're waiting for "update"
    // Mutant: would resolve immediately on "mount" (wrong!)
    // Correct: should timeout waiting for "update"
    await expect(
      expect(ProfiledComponent).toEventuallyReachPhase("update", {
        timeout: 100,
      }),
    ).rejects.toThrow(/Expected component to eventually reach phase "update"/);

    // Verify it only has mount phase
    const history = ProfiledComponent.getRenderHistory();

    expect(history).toStrictEqual(["mount"]);
    expect(history).not.toContain("update");
  });

  it("should resolve only on correct phase when multiple renders occur", async () => {
    // This test ensures we don't resolve prematurely on wrong phase
    let renderCount = 0;

    const MultiPhaseComponent = () => {
      const [, setCount] = useState(0);

      // First render: mount
      // After 20ms: update (wrong phase for our wait)
      // After 40ms: nested-update (correct phase!)
      if (renderCount === 0) {
        renderCount++;
        setTimeout(() => {
          setCount(1);
        }, 20); // First update at 20ms
      } else if (renderCount === 1) {
        renderCount++;
        setTimeout(() => {
          setCount(2);
        }, 20); // Nested update at 40ms
      }

      return <div>{renderCount}</div>;
    };

    const ProfiledComponent = withProfiler(MultiPhaseComponent);

    render(<ProfiledComponent />);

    // Wait for update phase (should NOT resolve on "mount")
    // Mutant: would resolve on first "mount" phase (wrong!)
    // Correct: should wait until "update" appears
    await expect(ProfiledComponent).toEventuallyReachPhase("update", {
      timeout: 100,
    });

    // Verify we actually got to update phase
    const history = ProfiledComponent.getRenderHistory();

    expect(history).toContain("update");
    expect(history.length).toBeGreaterThanOrEqual(2); // mount + update
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyReachPhase("mount"),
    ).rejects.toThrow(/Expected a profiled component/);
  });

  it("should fail with invalid phase", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      // @ts-expect-error - Testing invalid phase
      expect(ProfiledComponent).toEventuallyReachPhase("invalid"),
    ).rejects.toThrow(/Phase must be one of: mount, update, nested-update/);
  });

  it("should show helpful error message with current phases", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    let error: unknown;

    try {
      await expect(ProfiledStatic).toEventuallyReachPhase("update", {
        timeout: 50,
      });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringContaining("Current phases: [mount]"),
    });
    expect(error).toMatchObject({
      message: expect.stringContaining("1 render (1 mount)"),
    });
  });

  it("should show comma-separated phases in error message when multiple phases exist", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      // Trigger async updates
      if (count < 2) {
        setTimeout(() => {
          setCount(count + 1);
        }, 5);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Wait for some updates to occur
    await new Promise((resolve) => setTimeout(resolve, 30));

    let error: unknown;

    try {
      // Try to wait for a phase that doesn't exist
      await expect(ProfiledCounter).toEventuallyReachPhase("nested-update", {
        timeout: 50,
      });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      // Should show phases in format: [mount, update] not [mountupdate]
      message: expect.stringMatching(/Current phases: \[[\w, ]+\]/),
    });

    // Verify phases are separated by ", " not just ""
    expect(error).toMatchObject({
      message: expect.stringContaining(", "),
    });
  });

  it("should fail .not assertion when phase IS reached", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).not.toEventuallyReachPhase("mount"),
    ).rejects.toThrow(
      /Expected component not to eventually reach phase "mount" within \d+ms, but it did/,
    );
  });

  it("should fail .not assertion when phase is reached AFTER starting to wait", async () => {
    // This test covers the onRender callback path (lines 82-84 in phase.ts)
    // where the phase is reached while we're actively waiting
    const Counter = createFastCounter();
    const ProfiledCounter = withProfiler(Counter);

    const { rerender } = render(<ProfiledCounter />);

    // Component is at "mount" phase, we wait for "update" with .not
    const promise =
      expect(ProfiledCounter).not.toEventuallyReachPhase("update");

    // Trigger update phase - this will cause the .not assertion to fail
    rerender(<ProfiledCounter />);

    // The promise should reject with the appropriate message
    await expect(promise).rejects.toThrow(
      /Expected component not to eventually reach phase "update" within \d+ms, but it did/,
    );
  });
});

describe("Event-based behavior tests for async matchers", () => {
  describe("Performance: event-based response time", () => {
    it("toEventuallyRenderTimes should resolve in < 20ms (event-based, not polling)", async () => {
      const Counter = createFastCounter();
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      const start = Date.now();

      await expect(ProfiledCounter).toEventuallyRenderTimes(2);

      const elapsed = Date.now() - start;

      // Event-based should be very fast (< 20ms)
      // Polling would take at least 50ms (one interval)
      expect(elapsed).toBeLessThan(20);
      expect(ProfiledCounter.getRenderCount()).toBe(2);
    });

    it("toEventuallyRenderAtLeast should resolve in < 20ms (event-based)", async () => {
      const Counter = createFastCounter();
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      const start = Date.now();

      await expect(ProfiledCounter).toEventuallyRenderAtLeast(2);

      const elapsed = Date.now() - start;

      // Event-based should be very fast (< 20ms)
      expect(elapsed).toBeLessThan(20);
      expect(ProfiledCounter.getRenderCount()).toBeGreaterThanOrEqual(2);
    });

    it("toEventuallyReachPhase should resolve in < 20ms (event-based)", async () => {
      const Counter = createFastCounter();
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      const start = Date.now();

      await expect(ProfiledCounter).toEventuallyReachPhase("update");

      const elapsed = Date.now() - start;

      // Event-based should be very fast (< 20ms)
      expect(elapsed).toBeLessThan(20);
    });
  });

  describe("Race condition protection", () => {
    it("toEventuallyRenderTimes should work if condition already satisfied (instant resolve < 5ms)", async () => {
      const Static = () => <div>Static</div>;
      const ProfiledStatic = withProfiler(Static);

      render(<ProfiledStatic />);

      // Already rendered once (mount)
      expect(ProfiledStatic.getRenderCount()).toBe(1);

      const start = Date.now();

      await expect(ProfiledStatic).toEventuallyRenderTimes(1);

      const elapsed = Date.now() - start;

      // Should resolve instantly (race condition protection)
      expect(elapsed).toBeLessThan(5);
    });

    it("toEventuallyReachPhase should work if condition already satisfied (instant resolve < 5ms)", async () => {
      const Static = () => <div>Static</div>;
      const ProfiledStatic = withProfiler(Static);

      render(<ProfiledStatic />);

      // Already has mount phase
      expect(ProfiledStatic.getRenderHistory()).toContain("mount");

      const start = Date.now();

      await expect(ProfiledStatic).toEventuallyReachPhase("mount");

      const elapsed = Date.now() - start;

      // Should resolve instantly (race condition protection)
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe("Cleanup verification", () => {
    it("should cleanup properly on successful resolution", async () => {
      const Counter = createFastCounter();
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      await expect(ProfiledCounter).toEventuallyRenderTimes(2);

      // Verify component still works after cleanup
      expect(ProfiledCounter.getRenderCount()).toBe(2);
      expect(ProfiledCounter.getRenderHistory()).toStrictEqual([
        "mount",
        "update",
      ]);
    });

    it("should cleanup properly on timeout", async () => {
      const Static = () => <div>Static</div>;
      const ProfiledStatic = withProfiler(Static);

      render(<ProfiledStatic />);

      try {
        await expect(ProfiledStatic).toEventuallyRenderTimes(5, {
          timeout: 100,
        });

        throw new Error("Should have timed out");
      } catch {
        // Expected timeout
      }

      // Verify component still works after timeout cleanup
      expect(ProfiledStatic.getRenderCount()).toBe(1);
      expect(ProfiledStatic.getRenderHistory()).toStrictEqual(["mount"]);
    });
  });

  describe("Multiple parallel matchers", () => {
    it("should handle multiple concurrent matchers", async () => {
      const Counter = createAsyncCounter();
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      // Create 3 parallel matchers
      const matcher1 = expect(ProfiledCounter).toEventuallyRenderTimes(2);
      const matcher2 = expect(ProfiledCounter).toEventuallyRenderAtLeast(3);
      const matcher3 = expect(ProfiledCounter).toEventuallyReachPhase("update");

      // All matchers should complete successfully
      await Promise.all([matcher1, matcher2, matcher3]);

      expect(ProfiledCounter.getRenderCount()).toBeGreaterThanOrEqual(3);
    });
  });
});

describe("Real-world async matcher scenarios", () => {
  it("should handle complex async state updates", async () => {
    const AsyncComponent = () => {
      const [state1, setState1] = useState(0);
      const [state2, setState2] = useState(0);

      if (state1 === 0) {
        setTimeout(() => {
          setState1(1);
        }, 10);
      }

      if (state1 === 1 && state2 === 0) {
        setTimeout(() => {
          setState2(1);
        }, 10);
      }

      return (
        <div>
          {state1}-{state2}
        </div>
      );
    };

    const ProfiledComponent = withProfiler(AsyncComponent);

    render(<ProfiledComponent />);

    // Should eventually have 3 renders
    await expect(ProfiledComponent).toEventuallyRenderTimes(3, {
      timeout: 500,
    });

    // Should have reached update phase
    await expect(ProfiledComponent).toEventuallyReachPhase("update");

    // Should have at least 2 renders
    await expect(ProfiledComponent).toEventuallyRenderAtLeast(2);
  });

  it("should work with rapid consecutive renders", async () => {
    const RapidComponent = () => {
      const [count, setCount] = useState(0);

      if (count === 0) {
        // Trigger multiple updates
        setTimeout(() => {
          for (let i = 1; i <= 3; i++) {
            setTimeout(() => {
              setCount(i);
            }, i * 10);
          }
        }, 10);
      }

      return <div>{count}</div>;
    };

    const ProfiledComponent = withProfiler(RapidComponent);

    render(<ProfiledComponent />);

    // Should eventually have at least 3 renders
    await expect(ProfiledComponent).toEventuallyRenderAtLeast(3, {
      timeout: 500,
    });

    expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(3);
  });

  it("should combine with regular matchers", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      if (count < 2) {
        setTimeout(() => {
          setCount(count + 1);
        }, 15);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Async matcher first
    await expect(ProfiledCounter).toEventuallyRenderTimes(3);

    // Then regular matchers
    expect(ProfiledCounter).toHaveRenderedTimes(3);
    expect(ProfiledCounter).toHaveMountedOnce();
    expect(ProfiledCounter.getRendersByPhase("update")).toHaveLength(2);
  });
});
