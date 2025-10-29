import { render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

describe("toEventuallyRenderTimes", () => {
  it("should pass when exact render count is reached", async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);

      if (count < 2) {
        setTimeout(() => {
          setCount(count + 1);
        }, 10);
      }

      return <div>{count}</div>;
    };

    const ProfiledCounter = withProfiler(Counter);

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
