import { useState, useEffect } from "react";
import { describe, it, expect, expectTypeOf } from "vitest";

import { profileHook } from "../../src";

describe("profileHook - Edge cases", () => {
  it("should handle hook without props", () => {
    const { ProfiledHook } = profileHook(() => useState(0));

    expect(ProfiledHook).toHaveRenderedTimes(1);
  });

  it("should handle multiple rerenders", () => {
    const { rerender, ProfiledHook } = profileHook(
      ({ value }) => useState(value),
      { value: 1 },
    );

    rerender({ value: 2 });
    rerender({ value: 3 });
    rerender({ value: 4 });

    expect(ProfiledHook).toHaveRenderedTimes(4);
  });

  it("should handle hook that returns undefined", () => {
    const { result } = profileHook(() => {
      useEffect(() => {}, []);
    });

    expect(result.current).toBeUndefined();
  });

  it("should handle unmount", () => {
    const { unmount, ProfiledHook } = profileHook(() => useState(0));

    expect(ProfiledHook).toHaveRenderedTimes(1);

    unmount();
    // Should not throw
  });

  it("should handle conditional extra renders", () => {
    function useConditionalHook(value: number) {
      const [state, setState] = useState(0);

      useEffect(() => {
        if (value > 10) {
          setState(value * 2); // Extra render only if value > 10
        }
      }, [value]);

      return state;
    }

    // Small value - no extra render
    const { ProfiledHook: ProfiledSmall } = profileHook(() =>
      useConditionalHook(5),
    );

    expect(ProfiledSmall).toHaveRenderedTimes(1);

    // Large value - extra render
    const { ProfiledHook: ProfiledLarge } = profileHook(() =>
      useConditionalHook(15),
    );

    expect(ProfiledLarge).toHaveRenderedTimes(2);
  });

  it("should handle hooks that throw errors", () => {
    function useBrokenHook() {
      const [state] = useState(0);

      if (state === 0) {
        throw new Error("Hook error!");
      }

      return state;
    }

    expect(() => {
      profileHook(() => useBrokenHook());
    }).toThrow("Hook error!");
  });

  it("should run cleanup on unmount", () => {
    let cleanupCalled = false;

    function useHookWithCleanup() {
      useEffect(() => {
        return () => {
          cleanupCalled = true;
        };
      }, []);
    }

    const { unmount } = profileHook(() => {
      useHookWithCleanup();
    });

    expect(cleanupCalled).toBe(false);

    unmount();

    expect(cleanupCalled).toBe(true);
  });

  it("should preserve hook result type", () => {
    // Test type inference works correctly
    const { result } = profileHook(() => useState<string>("test"));

    // TypeScript should infer the correct type
    const [state, setState]: [
      string,
      React.Dispatch<React.SetStateAction<string>>,
    ] = result.current;

    expect(state).toBe("test");

    expectTypeOf(setState).toBeFunction();
  });

  it("should handle hook with complex return value", () => {
    interface ComplexResult {
      count: number;
      increment: () => void;
      decrement: () => void;
    }

    function useCounter(initial: number): ComplexResult {
      const [count, setCount] = useState(initial);

      return {
        count,
        increment: () => {
          setCount((c) => c + 1);
        },
        decrement: () => {
          setCount((c) => c - 1);
        },
      };
    }

    const { result, ProfiledHook } = profileHook(() => useCounter(5));

    expect(result.current.count).toBe(5);

    expectTypeOf(result.current.increment).toBeFunction();
    expectTypeOf(result.current.decrement).toBeFunction();

    expect(ProfiledHook).toHaveRenderedTimes(1);
  });
});
