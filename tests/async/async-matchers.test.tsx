import { render } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

// Helper component that triggers 3 renders (mount + 2 updates)
const createAsyncCounter = () => {
  return () => {
    const [count, setCount] = useState(0);

    if (count < 2) {
      setTimeout(() => {
        setCount(count + 1);
      }, 10);
    }

    return <div>{count}</div>;
  };
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
    ).rejects.toThrowError(
      /Expected component to eventually render 5 times within 100ms, but got 1/,
    );
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyRenderTimes(1),
    ).rejects.toThrowError(/Expected a profiled component/);
  });

  it("should fail with invalid render count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(-1),
    ).rejects.toThrowError(/must be a non-negative integer/);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(1.5),
    ).rejects.toThrowError(/must be a non-negative integer/);
  });

  it("should include parameter name 'Expected render count' in error message", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // This test kills StringLiteral mutant that replaces "Expected render count" with ""
    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(-1),
    ).rejects.toThrowError(/Expected render count must be/);
  });

  it("should fail with invalid timeout", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(3, { timeout: 0 }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(3, { timeout: -100 }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(3, {
        timeout: Number.NaN,
      }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderTimes(3, {
        timeout: Infinity,
      }),
    ).rejects.toThrowError(/positive number/);
  });

  it("should accept 0 as valid expected count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Don't render - count is 0
    // Should succeed when expecting 0 renders
    await expect(ProfiledComponent).toEventuallyRenderTimes(0, { timeout: 50 });

    expect(ProfiledComponent.getRenderCount()).toBe(0);
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
    ).rejects.toThrowError(
      /Expected component not to eventually render 1 times within \d+ms, but it did/,
    );
  });

  it("should fail .not assertion when render count is reached AFTER starting to wait", async () => {
    // This test covers the onRender callback path (lines 86-92 in render-count.ts)
    // where the exact count is reached while we're actively waiting
    const Counter = createAsyncCounter();
    const ProfiledCounter = withProfiler(Counter);

    const { rerender } = render(<ProfiledCounter />);

    // Component is at render count 1, we wait for count 2 with .not
    const promise = expect(ProfiledCounter).not.toEventuallyRenderTimes(2);

    // Trigger second render - this will cause the .not assertion to fail
    rerender(<ProfiledCounter />);

    // The promise should reject with the appropriate message
    await expect(promise).rejects.toThrowError(
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
    ).rejects.toThrowError(
      /Expected component to eventually render at least 3 times within 100ms, but got 1/,
    );
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyRenderAtLeast(1),
    ).rejects.toThrowError(/Expected a profiled component/);
  });

  it("should fail with invalid minimum count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderAtLeast(-1),
    ).rejects.toThrowError(/must be a non-negative integer/);
  });

  it("should include parameter name 'Minimum render count' in error message", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // This test kills StringLiteral mutant that replaces "Minimum render count" with ""
    await expect(
      expect(ProfiledComponent).toEventuallyRenderAtLeast(-1),
    ).rejects.toThrowError(/Minimum render count must be/);
  });

  it("should fail with invalid timeout", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderAtLeast(3, { timeout: -50 }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRenderAtLeast(3, { timeout: 0 }),
    ).rejects.toThrowError(/positive number/);
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
    ).rejects.toThrowError(
      /Expected component not to eventually render at least 2 times within \d+ms, but it rendered \d+ times/,
    );
  });

  it("should fail .not assertion when minimum already reached (early return)", async () => {
    // This test covers the early return path (lines 143-149 in render-count.ts)
    // where the minimum count is already reached when we start waiting
    const Counter = createAsyncCounter();
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
    ).rejects.toThrowError(
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
    ).rejects.toThrowError(
      /Expected component to eventually reach phase "update"/,
    );
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
    ).rejects.toThrowError(
      /Expected component to eventually reach phase "update"/,
    );

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
    ).rejects.toThrowError(/Expected a profiled component/);
  });

  it("should fail with invalid phase", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      // @ts-expect-error - Testing invalid phase
      expect(ProfiledComponent).toEventuallyReachPhase("invalid"),
    ).rejects.toThrowError(
      /Phase must be one of: mount, update, nested-update/,
    );
  });

  it("should fail with invalid timeout", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyReachPhase("update", {
        timeout: 0,
      }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyReachPhase("update", {
        timeout: -50,
      }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyReachPhase("update", {
        timeout: Infinity,
      }),
    ).rejects.toThrowError(/positive number/);
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

    // Verify phases are separated by ", " not just "" (kills join("") mutation)
    expect(error).toMatchObject({
      message: expect.stringContaining(", "),
    });

    // Verify exact comma-separated format: "mount, update" not "mountupdate"
    const errorMessage = (error as Error).message;

    expect(errorMessage).toMatch(
      /Current phases: \[mount, update(?:, update)*\]/,
    );
  });

  it("should fail .not assertion when phase IS reached", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).not.toEventuallyReachPhase("mount"),
    ).rejects.toThrowError(
      /Expected component not to eventually reach phase "mount" within \d+ms, but it did/,
    );
  });

  it("should fail .not assertion when phase is reached AFTER starting to wait", async () => {
    // This test covers the onRender callback path (lines 82-84 in phase.ts)
    // where the phase is reached while we're actively waiting
    const Counter = createAsyncCounter();
    const ProfiledCounter = withProfiler(Counter);

    const { rerender } = render(<ProfiledCounter />);

    // Component is at "mount" phase, we wait for "update" with .not
    const promise =
      expect(ProfiledCounter).not.toEventuallyReachPhase("update");

    // Trigger update phase - this will cause the .not assertion to fail
    rerender(<ProfiledCounter />);

    // The promise should reject with the appropriate message
    await expect(promise).rejects.toThrowError(
      /Expected component not to eventually reach phase "update" within \d+ms, but it did/,
    );
  });
});

describe("Event-based behavior tests for async matchers", () => {
  describe("Cleanup verification", () => {
    it("should cleanup properly on successful resolution", async () => {
      const Counter = createAsyncCounter();
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

describe("toEventuallyRerender (v1.11.0)", () => {
  it("should pass when component rerenders after snapshot", async () => {
    // eslint-disable-next-line sonarjs/no-identical-functions -- Test isolation requires separate component
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

    ProfiledCounter.snapshot();

    await expect(ProfiledCounter).toEventuallyRerender();

    expect(ProfiledCounter.getRendersSinceSnapshot()).toBeGreaterThanOrEqual(1);
  });

  it("should pass immediately if already rerendered", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    // Already rerendered once
    await expect(ProfiledComponent).toEventuallyRerender();
  });

  it("should fail when no rerender within timeout", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    ProfiledStatic.snapshot();

    await expect(
      expect(ProfiledStatic).toEventuallyRerender({ timeout: 100 }),
    ).rejects.toThrowError(
      /Expected component to rerender after snapshot within 100ms, but it did not/,
    );
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyRerender(),
    ).rejects.toThrowError(/Expected a profiled component/);
  });

  it("should fail with invalid timeout", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRerender({ timeout: 0 }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRerender({ timeout: -100 }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRerender({ timeout: Number.NaN }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRerender({ timeout: Infinity }),
    ).rejects.toThrowError(/positive number/);
  });

  it("should fail .not assertion when single rerender occurs (singular)", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).not.toEventuallyRerender(),
    ).rejects.toThrowError(
      /Expected component not to rerender after snapshot within \d+ms, but it rerendered 1 time/,
    );
  });

  it("should fail .not assertion when multiple rerenders occur (plural)", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).not.toEventuallyRerender(),
    ).rejects.toThrowError(
      /Expected component not to rerender after snapshot within \d+ms, but it rerendered 2 times/,
    );
  });

  it("should use singular 'time' when exactly 1 rerender (early return path)", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    // Verify singular "time" not "times" for exactly 1 rerender
    let errorMessage = "";

    try {
      await expect(ProfiledComponent).not.toEventuallyRerender();
    } catch (error) {
      errorMessage = (error as Error).message;
    }

    // Must contain "1 time" (singular), not "1 times" (plural)
    expect(errorMessage).toContain("1 time");
    expect(errorMessage).not.toContain("1 times");
  });

  it("should fail .not assertion when rerender happens during wait", async () => {
    const AsyncUpdater = () => {
      const [count, setCount] = useState(0);

      useEffect(() => {
        if (count >= 1) {
          return;
        }

        const timer = setTimeout(() => {
          setCount(1);
        }, 10);

        return () => {
          clearTimeout(timer);
        };
      }, [count]);

      return <div>{count}</div>;
    };

    const ProfiledComponent = withProfiler(AsyncUpdater);

    render(<ProfiledComponent />);

    ProfiledComponent.snapshot();

    // Start waiting with .not - should fail when async update occurs
    // Note: The callback always reports "1 time" since it only fires once
    await expect(
      expect(ProfiledComponent).not.toEventuallyRerender({ timeout: 200 }),
    ).rejects.toThrowError(
      /Expected component not to rerender after snapshot within 200ms, but it rerendered 1 time/,
    );
  });
});

describe("toEventuallyRerenderTimes (v1.11.0)", () => {
  it("should pass when exact rerender count is reached", async () => {
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

    ProfiledCounter.snapshot();

    await expect(ProfiledCounter).toEventuallyRerenderTimes(2);

    expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
  });

  it("should pass immediately if count already met", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    // Already rerendered twice
    await expect(ProfiledComponent).toEventuallyRerenderTimes(2);
  });

  it("should pass (not fail) when actual equals expected - boundary test", async () => {
    // This test ensures that `actual > expected` check does NOT trigger when actual === expected
    // Mutant changes `>` to `>=` which would cause this to fail
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    // Exactly 3 rerenders, expecting 3 - should pass, not fail with "exceeded"
    await expect(ProfiledComponent).toEventuallyRerenderTimes(3);

    // Verify it passed without "exceeded" error
    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(3);
  });

  it("should fail early if count exceeded", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    // Already 3 rerenders, but we expect only 2
    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(2),
    ).rejects.toThrowError(/already got 3.*exceeded/);
  });

  it("should fail when count not reached within timeout", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    ProfiledComponent.snapshot();

    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(3, { timeout: 100 }),
    ).rejects.toThrowError(
      /Expected component to rerender 3 times after snapshot within 100ms, but got 0 times/,
    );
  });

  it("should fail .not when exact count is reached during wait", async () => {
    const AsyncUpdater = () => {
      const [count, setCount] = useState(0);

      useEffect(() => {
        if (count >= 2) {
          return;
        }

        const timer = setTimeout(() => {
          setCount((c) => c + 1);
        }, 10);

        return () => {
          clearTimeout(timer);
        };
      }, [count]);

      return <div>{count}</div>;
    };

    const ProfiledComponent = withProfiler(AsyncUpdater);

    render(<ProfiledComponent />);

    ProfiledComponent.snapshot();

    // Component will rerender 2 times, which matches our expected count
    // With .not, this should fail with a specific message
    await expect(
      expect(ProfiledComponent).not.toEventuallyRerenderTimes(2, {
        timeout: 300,
      }),
    ).rejects.toThrowError(
      /Expected component not to rerender 2 times after snapshot within 300ms, but it did/,
    );
  });

  it("should use singular 'time' in .not message when expected is 1", async () => {
    // eslint-disable-next-line sonarjs/no-identical-functions -- Test isolation requires separate component
    const AsyncUpdater = () => {
      const [count, setCount] = useState(0);

      useEffect(() => {
        if (count >= 1) {
          return;
        }

        const timer = setTimeout(() => {
          setCount(1);
        }, 10);

        return () => {
          clearTimeout(timer);
        };
      }, [count]);

      return <div>{count}</div>;
    };

    const ProfiledComponent = withProfiler(AsyncUpdater);

    render(<ProfiledComponent />);

    ProfiledComponent.snapshot();

    await expect(
      expect(ProfiledComponent).not.toEventuallyRerenderTimes(1, {
        timeout: 200,
      }),
    ).rejects.toThrowError(
      /Expected component not to rerender 1 time after snapshot within 200ms, but it did/,
    );
  });

  it("should fail with invalid component", async () => {
    await expect(
      expect("not-a-component").toEventuallyRerenderTimes(1),
    ).rejects.toThrowError(/Expected a profiled component/);
  });

  it("should fail with invalid expected count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(-1),
    ).rejects.toThrowError(/must be a non-negative integer/);

    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(1.5),
    ).rejects.toThrowError(/must be a non-negative integer/);
  });

  it("should include parameter name 'Expected rerender count' in error message", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // This test kills StringLiteral mutant that replaces "Expected rerender count" with ""
    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(-1),
    ).rejects.toThrowError(/Expected rerender count must be/);
  });

  it("should fail with invalid timeout", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(1, { timeout: 0 }),
    ).rejects.toThrowError(/positive number/);

    await expect(
      expect(ProfiledComponent).toEventuallyRerenderTimes(1, { timeout: -50 }),
    ).rejects.toThrowError(/positive number/);
  });

  it("should accept 0 as valid expected count", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    ProfiledComponent.snapshot();

    // Expect 0 rerenders
    await expect(ProfiledComponent).toEventuallyRerenderTimes(0, {
      timeout: 50,
    });

    expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(0);
  });

  it("should fail .not assertion when exact count is reached", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    await expect(
      expect(ProfiledComponent).not.toEventuallyRerenderTimes(1),
    ).rejects.toThrowError(
      /Expected component not to rerender 1 time after snapshot within \d+ms, but it did/,
    );
  });

  it("should show render history on timeout failure", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    let error: unknown;

    try {
      await expect(ProfiledComponent).toEventuallyRerenderTimes(5, {
        timeout: 50,
      });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringContaining("#"),
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
    // eslint-disable-next-line sonarjs/no-identical-functions -- Test isolation requires separate component
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
