import { useState, useEffect } from "react";
import { describe, it, expect } from "vitest";

import { profileHook } from "../../src";

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
});
