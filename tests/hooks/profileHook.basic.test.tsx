import { useState, useEffect } from "react";
import { describe, it, expect } from "vitest";

import { profileHook } from "@/hooks";

describe("profileHook - Basic functionality", () => {
  it("should profile hook initial render", () => {
    const { ProfiledHook } = profileHook(() => useState(0));

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(ProfiledHook).toHaveMountedOnce();
  });

  it("should return hook result", () => {
    const { result } = profileHook(() => useState(42));

    expect(result.current).toStrictEqual([42, expect.any(Function)]);
  });

  it("should detect extra renders from useEffect", () => {
    function useBadHook(value: number) {
      const [state, setState] = useState(value);

      useEffect(() => {
        setState(value * 2); // Extra render!
      }, [value]);

      return state;
    }

    const { ProfiledHook } = profileHook(({ value }) => useBadHook(value), {
      value: 1,
    });

    // Mount + effect render = 2
    expect(ProfiledHook).toHaveRenderedTimes(2);
  });

  it("should support rerender", () => {
    const { rerender, ProfiledHook } = profileHook(
      ({ value }) => useState(value),
      { value: 1 },
    );

    expect(ProfiledHook).toHaveRenderedTimes(1);

    // Note: rerender is already wrapped in act() internally
    rerender({ value: 2 });

    expect(ProfiledHook).toHaveRenderedTimes(2);
  });

  it("should support rerender without props for hooks without parameters", () => {
    const { rerender, ProfiledHook } = profileHook(() => {
      const [count, setCount] = useState(0);

      return { count, setCount };
    });

    expect(ProfiledHook).toHaveRenderedTimes(1);

    // Rerender without parameters
    rerender();

    expect(ProfiledHook).toHaveRenderedTimes(2);
  });

  it("should use hook.name when available (named function)", () => {
    // Named function hook
    function useCustomHook() {
      return useState(0);
    }

    const { ProfiledHook } = profileHook(useCustomHook);

    // withProfiler wraps with "withProfiler(hookName)" format
    expect(ProfiledHook.displayName).toBe("withProfiler(useCustomHook)");
    // Verify hook name is used, not default fallback
    expect(ProfiledHook.displayName).not.toContain("useHook");
    expect(ProfiledHook.displayName).toContain("useCustomHook");
  });

  it("should use default name for anonymous hook (hook.name is empty)", () => {
    // Anonymous arrow function - hook.name will be empty string
    const { ProfiledHook } = profileHook(() => useState(0));

    // Should fall back to "useHook" when hook.name is empty
    expect(ProfiledHook.displayName).toBe("withProfiler(useHook)");
    // Verify it's not an empty name
    expect(ProfiledHook.displayName).not.toBe("withProfiler()");
  });

  it("should ensure displayName is never empty string", () => {
    function useTestHook() {
      return useState(0);
    }

    const { ProfiledHook } = profileHook(useTestHook);

    // displayName should always be a non-empty string with withProfiler prefix
    // eslint-disable-next-line vitest/prefer-strict-boolean-matchers -- checking string is truthy
    expect(ProfiledHook.displayName).toBeTruthy();
    expect(ProfiledHook.displayName).toMatch(/^withProfiler\(.+\)$/);
    expect(ProfiledHook.displayName).not.toBe("withProfiler()");
    expect(ProfiledHook.displayName).not.toBe("");
    // Verify hook name is not empty in displayName
    expect(ProfiledHook.displayName).toContain("useTestHook");
  });
});
