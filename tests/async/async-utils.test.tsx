import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  withProfiler,
  waitForRenders,
  waitForMinimumRenders,
  waitForPhase,
} from "../../src";

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

  it("should use custom timeout", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    const start = Date.now();

    await expect(
      waitForRenders(ProfiledStatic, 2, { timeout: 200 }),
    ).rejects.toThrow();

    const elapsed = Date.now() - start;

    // Should timeout around 200ms (with some tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(180);
    expect(elapsed).toBeLessThan(300);
  });

  it("should use custom interval", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      if (count === 0) {
        setTimeout(() => {
          setCount(1);
        }, 80);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

    render(<ProfiledCounter />);

    // With 100ms interval, this should succeed before first check
    await waitForRenders(ProfiledCounter, 2, { timeout: 200, interval: 100 });

    expect(ProfiledCounter.getRenderCount()).toBe(2);
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

  it("should respect custom timeout and interval options", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    const start = Date.now();

    try {
      await waitForMinimumRenders(ProfiledStatic, 3, {
        timeout: 200,
        interval: 30,
      });

      throw new Error("Should have thrown");
    } catch {
      // Error expected
    }

    const elapsed = Date.now() - start;

    // Should timeout around 200ms (with some tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(180);
    expect(elapsed).toBeLessThan(300);
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

  it("should use custom timeout and interval for waitForPhase", async () => {
    const Static = () => <div>Static</div>;
    const ProfiledStatic = withProfiler(Static);

    render(<ProfiledStatic />);

    const start = Date.now();

    try {
      await waitForPhase(ProfiledStatic, "update", {
        timeout: 150,
        interval: 25,
      });

      throw new Error("Should have thrown");
    } catch {
      // Error expected
    }

    const elapsed = Date.now() - start;

    // Should timeout around 150ms (with some tolerance)
    expect(elapsed).toBeGreaterThanOrEqual(130);
    expect(elapsed).toBeLessThan(250);
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
