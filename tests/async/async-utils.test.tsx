import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  withProfiler,
  waitForRenders,
  waitForMinimumRenders,
  waitForPhase,
} from "../../src";

// Helper component for multiple renders (triggers N renders with 10ms delay)
const createMultiRenderCounter = (maxCount: number) => {
  const Counter = () => {
    const [count, setCount] = useState(0);

    if (count < maxCount) {
      setTimeout(() => {
        setCount(count + 1);
      }, 10);
    }

    return <div>{count}</div>;
  };

  return Counter;
};

describe("waitForRenders", () => {
  it("should wait for exact render count", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      // Trigger async re-render
      if (count < 2) {
        setTimeout(() => {
          setCount(count + 1);
        }, 10);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Initially only 1 render (mount)
    expect(ProfiledCounter.getRenderCount()).toBe(1);

    // Wait for 3 renders
    await waitForRenders(ProfiledCounter, 3);

    expect(ProfiledCounter.getRenderCount()).toBe(3);
  });

  it("should timeout if render count not reached", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    let error: unknown;

    try {
      await waitForRenders(ProfiledStatic, 5, { timeout: 100 });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringMatching(/Expected 5 renders, but got 1/),
    });
    // Verify the error message correctly calculates "more render(s)" needed
    // If we expect 5 and got 1, we need 4 more (5 - 1 = 4, not 5 + 1 = 6)
    expect(error).toMatchObject({
      message: expect.stringMatching(/Waiting for 4 more render/),
    });
  });
});

describe("waitForMinimumRenders", () => {
  it("should wait for at least N renders", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      // Trigger multiple async re-renders
      if (count < 3) {
        setTimeout(() => {
          setCount(count + 1);
        }, 10);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Wait for at least 2 renders (will actually have more)
    await waitForMinimumRenders(ProfiledCounter, 2);

    // Could be 2, 3, or 4 depending on timing
    expect(ProfiledCounter.getRenderCount()).toBeGreaterThanOrEqual(2);
  });

  it("should succeed immediately if already at minimum", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // Already at 1, waiting for 1 should succeed immediately
    await waitForMinimumRenders(ProfiledComponent, 1);

    expect(ProfiledComponent.getRenderCount()).toBe(1);
  });

  it("should timeout if minimum not reached", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    await expect(
      waitForMinimumRenders(ProfiledStatic, 3, { timeout: 100 }),
    ).rejects.toThrow(/Expected at least 3 renders, but got 1/);
  });

  it("should show correct arithmetic in error message (minCount - actual)", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    let error: unknown;

    try {
      await waitForMinimumRenders(ProfiledStatic, 5, { timeout: 100 });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringMatching(/Expected at least 5 renders, but got 1/),
    });
    // Verify correct calculation: 5 - 1 = 4, NOT 5 + 1 = 6
    expect(error).toMatchObject({
      message: expect.stringMatching(/Waiting for 4 more render\(s\)/),
    });
  });
});

describe("waitForPhase", () => {
  it("should wait for mount phase", async () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    // Mount phase should be immediate
    await waitForPhase(ProfiledComponent, "mount");

    const mounts = ProfiledComponent.getRendersByPhase("mount");

    expect(mounts).toHaveLength(1);
  });

  it("should wait for update phase", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      // Trigger async update
      if (count === 0) {
        setTimeout(() => {
          setCount(1);
        }, 20);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Initially only mount phase
    expect(ProfiledCounter.getRendersByPhase("update")).toHaveLength(0);

    // Wait for update phase
    await waitForPhase(ProfiledCounter, "update");

    const updates = ProfiledCounter.getRendersByPhase("update");

    expect(updates.length).toBeGreaterThan(0);
  });

  it("should timeout if phase not reached", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    // Only mounted, never updated
    await expect(
      waitForPhase(ProfiledStatic, "update", { timeout: 100 }),
    ).rejects.toThrow(/Expected component to reach phase "update"/);
  });

  it("should provide helpful error message with current phases", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    let error: unknown;

    try {
      await waitForPhase(ProfiledStatic, "update", { timeout: 50 });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringContaining("Current phases: [mount]"),
    });
  });

  it("should show comma-separated phases in error message", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      if (count < 2) {
        setTimeout(() => {
          setCount(count + 1);
        }, 5);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // Wait a bit for some updates
    await new Promise((resolve) => setTimeout(resolve, 30));

    let error: unknown;

    try {
      // Try to wait for a phase that doesn't exist
      await waitForPhase(ProfiledCounter, "nested-update", { timeout: 50 });

      throw new Error("Should have thrown");
    } catch (error_) {
      error = error_;
    }

    expect(error).toMatchObject({
      message: expect.stringMatching(/Current phases: \[[\w, ]+\]/),
    });
    // Verify phases are separated by ", " not just ""
    expect(error).toMatchObject({
      message: expect.stringContaining(", "),
    });
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
      waitForPhase(ProfiledComponent, "update", { timeout: 100 }),
    ).rejects.toThrow(/Expected component to reach phase "update"/);

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
    await waitForPhase(ProfiledComponent, "update", { timeout: 100 });

    // Verify we actually reached update phase
    const history = ProfiledComponent.getRenderHistory();

    expect(history).toContain("update");
    expect(history.length).toBeGreaterThanOrEqual(2); // mount + update
  });
});

describe("Event-based behavior tests", () => {
  describe("Multiple parallel waiters", () => {
    it("multiple waitForRenders can wait simultaneously", async () => {
      const Counter = createMultiRenderCounter(3);
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      // Create 3 parallel waiters
      const waiter1 = waitForRenders(ProfiledCounter, 2);
      const waiter2 = waitForRenders(ProfiledCounter, 3);
      const waiter3 = waitForRenders(ProfiledCounter, 4);

      // All should complete successfully
      await Promise.all([waiter1, waiter2, waiter3]);

      expect(ProfiledCounter.getRenderCount()).toBe(4);
    });

    it("multiple waitForPhase can wait simultaneously", async () => {
      const Counter = createMultiRenderCounter(1);
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      // Create 3 parallel waiters for same phase
      const waiter1 = waitForPhase(ProfiledCounter, "update");
      const waiter2 = waitForPhase(ProfiledCounter, "update");
      const waiter3 = waitForPhase(ProfiledCounter, "update");

      // All should complete when update phase occurs
      await Promise.all([waiter1, waiter2, waiter3]);

      expect(ProfiledCounter.getRendersByPhase("update")).toHaveLength(1);
    });
  });

  describe("Cleanup verification", () => {
    it("should cleanup listeners on successful resolution", async () => {
      const Counter = createMultiRenderCounter(1);
      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      // Wait for renders
      await waitForRenders(ProfiledCounter, 2);

      // Verify component still works after cleanup
      expect(ProfiledCounter.getRenderCount()).toBe(2);

      // Should be able to call other methods without issues
      expect(ProfiledCounter.getRenderHistory()).toStrictEqual([
        "mount",
        "update",
      ]);
    });

    it("should cleanup listeners on timeout", async () => {
      const Static = () => <div>Static</div>;
      const ProfiledStatic = withProfiler(Static);

      render(<ProfiledStatic />);

      try {
        await waitForRenders(ProfiledStatic, 5, { timeout: 100 });
      } catch {
        // Expected timeout
      }

      // Verify component still works after timeout cleanup
      expect(ProfiledStatic.getRenderCount()).toBe(1);
      expect(ProfiledStatic.getRenderHistory()).toStrictEqual(["mount"]);
    });

    it("should cleanup timeout on successful resolution", async () => {
      const Counter = () => {
        const [count, setCount] = useState(0);

        if (count === 0) {
          setTimeout(() => {
            setCount(1);
          }, 10);
        }

        return <div>{count}</div>;
      };

      const ProfiledCounter = withProfiler(Counter);

      render(<ProfiledCounter />);

      // Wait with very long timeout
      await waitForRenders(ProfiledCounter, 2, { timeout: 5000 });

      // If timeout wasn't cleared, it would still be running
      // This verifies that cleanup worked correctly
      expect(ProfiledCounter.getRenderCount()).toBe(2);

      // Wait a bit to ensure no hanging timeouts cause issues
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });
});

describe("Real-world async scenarios", () => {
  it("should handle component with multiple async state updates", async () => {
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

    // Wait for all updates
    await waitForRenders(ProfiledComponent, 3, { timeout: 500 });

    expect(ProfiledComponent.getRenderCount()).toBe(3);
    expect(ProfiledComponent.getRendersByPhase("mount")).toHaveLength(1);
    expect(ProfiledComponent.getRendersByPhase("update")).toHaveLength(2);
  });

  it("should handle rapid consecutive renders", async () => {
    const RapidComponent = () => {
      const [count, setCount] = useState(0);

      // Trigger 5 rapid updates
      if (count === 0) {
        setTimeout(() => {
          for (let i = 1; i <= 5; i++) {
            setTimeout(() => {
              setCount(i);
            }, i * 5);
          }
        }, 10);
      }

      return <div>{count}</div>;
    };

    const ProfiledComponent = withProfiler(RapidComponent);

    render(<ProfiledComponent />);

    // Wait for at least 3 renders (could be more due to batching)
    await waitForMinimumRenders(ProfiledComponent, 3, { timeout: 1000 });

    expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(3);

    // Wait for all setTimeout to complete before test finishes
    // Last setTimeout executes at 10ms (outer) + 25ms (inner, i=5) = 35ms
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
