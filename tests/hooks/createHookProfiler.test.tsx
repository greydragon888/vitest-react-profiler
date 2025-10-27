import { useState, useEffect } from "react";
import { describe, it, expect, expectTypeOf } from "vitest";

import { createHookProfiler } from "../../src";

// Helper hook that causes extra render
function useBadHook() {
  const [, setState] = useState(0);

  useEffect(() => {
    setState(1);
  }, []);
}

describe("createHookProfiler", () => {
  it("should provide simplified API", () => {
    const profiler = createHookProfiler(() => useState(0));

    expect(profiler.getRenderCount()).toBe(1);

    profiler.expectRenderCount(1);
  });

  it("should throw on unexpected render count", () => {
    const profiler = createHookProfiler(() => {
      useBadHook();
    });

    expect(() => {
      profiler.expectRenderCount(1);
    }).toThrow(/Expected 1 render\(s\), but got 2/);
  });

  it("should support rerender", () => {
    const profiler = createHookProfiler(({ value }) => useState(value), {
      value: 1,
    });

    profiler.expectRenderCount(1);

    profiler.rerender({ value: 2 });
    profiler.expectRenderCount(2);

    // Verify final render count
    expect(profiler.getRenderCount()).toBe(2);
  });

  it("should provide getRenderHistory", () => {
    const profiler = createHookProfiler(() => {
      useBadHook();
    });
    const history = profiler.getRenderHistory();

    expect(history).toHaveLength(2);
    expect(history[0]!.phase).toBe("mount");
    expect(history[1]!.phase).toBe("update");
  });

  it("should provide getLastRender", () => {
    const profiler = createHookProfiler(() => useState(0));
    const lastRender = profiler.getLastRender();

    expect(lastRender).toBeDefined();
    expect(lastRender!.phase).toBe("mount");
  });

  it("should provide getAverageRenderTime", () => {
    const profiler = createHookProfiler(() => useState(0));
    const avgTime = profiler.getAverageRenderTime();

    expect(avgTime).toBeGreaterThanOrEqual(0);

    expectTypeOf(avgTime).toBeNumber();
  });
});
