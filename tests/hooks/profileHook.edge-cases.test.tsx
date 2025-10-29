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

  describe("Hook throws during render - advanced scenarios", () => {
    it("should handle hook that throws after state update", () => {
      function useThrowsAfterUpdate({ shouldThrow }: { shouldThrow: boolean }) {
        const [count, setCount] = useState(0);

        useEffect(() => {
          if (!shouldThrow && count === 0) {
            // Trigger one extra render
            setCount(1);
          }
        }, [shouldThrow, count]);

        // Throw when shouldThrow is true AND count > 0
        if (shouldThrow && count > 0) {
          throw new Error("Failed after update");
        }

        return count;
      }

      // First: renders successfully with shouldThrow=false (mount + effect update = 2 renders)
      const { ProfiledHook, rerender } = profileHook(
        ({ shouldThrow }) => useThrowsAfterUpdate({ shouldThrow }),
        { shouldThrow: false },
      );

      // Should have rendered at least once (mount + effect update)
      expect(ProfiledHook.getRenderCount()).toBeGreaterThanOrEqual(1);

      // Second: try to rerender with shouldThrow=true - this should throw
      expect(() => {
        rerender({ shouldThrow: true });
      }).toThrow("Failed after update");
    });

    it("should handle hook that throws conditionally based on props", () => {
      function useConditionalThrow({ shouldThrow }: { shouldThrow: boolean }) {
        const [state] = useState(0);

        if (shouldThrow) {
          throw new Error("Conditional error");
        }

        return state;
      }

      // Should work when shouldThrow is false
      const { ProfiledHook, rerender } = profileHook(
        ({ shouldThrow }) => useConditionalThrow({ shouldThrow }),
        { shouldThrow: false },
      );

      expect(ProfiledHook).toHaveRenderedTimes(1);

      // Should throw when shouldThrow becomes true
      expect(() => {
        rerender({ shouldThrow: true });
      }).toThrow("Conditional error");

      // Should have profiled the successful render before the throw
      expect(ProfiledHook).toHaveRenderedTimes(1);
    });

    it("should handle hook that throws in useEffect", () => {
      // Track if effect ran
      const effectCalls: string[] = [];

      function useThrowsInEffect() {
        const [state] = useState(0);

        useEffect(() => {
          effectCalls.push("effect-start");

          throw new Error("Effect error");
        }, []);

        return state;
      }

      // Note: Errors in effects don't prevent the component from rendering
      // They're caught by React's error boundary system
      expect(() => {
        profileHook(() => useThrowsInEffect());
      }).toThrow("Effect error");

      // Effect should have been called
      expect(effectCalls).toContain("effect-start");
    });
  });

  describe("Deep hook composition", () => {
    it("should work with custom hooks using other custom hooks (3 levels deep)", () => {
      // Level 1: Base hook
      function useLevel1(value: number) {
        const [state, setState] = useState(value);

        return { state, setState };
      }

      // Level 2: Uses level 1
      function useLevel2(value: number) {
        const { state: state1, setState: setState1 } = useLevel1(value);
        const doubled = state1 * 2;

        return { state1, setState1, doubled };
      }

      // Level 3: Uses level 2
      function useLevel3(value: number) {
        const { state1, doubled } = useLevel2(value);
        const tripled = state1 * 3;

        return { original: state1, doubled, tripled };
      }

      const { result, ProfiledHook } = profileHook(
        ({ value }) => useLevel3(value),
        { value: 5 },
      );

      // Should work correctly
      expect(result.current.original).toBe(5);
      expect(result.current.doubled).toBe(10);
      expect(result.current.tripled).toBe(15);

      // Should only render once (no extra renders from composition)
      expect(ProfiledHook).toHaveRenderedTimes(1);
    });

    it("should work with deeply nested hooks that trigger effects", () => {
      const effectOrder: string[] = [];

      // Level 1: Hook with effect
      function useBase(id: string) {
        const [value, setValue] = useState(0);

        useEffect(() => {
          effectOrder.push(`base-${id}`);
          setValue(1);
        }, [id]);

        return value;
      }

      // Level 2: Uses multiple base hooks
      function useMiddle(id: string) {
        const val1 = useBase(`${id}-1`);
        const val2 = useBase(`${id}-2`);

        return val1 + val2;
      }

      // Level 3: Uses middle hook
      function useTop(id: string) {
        const middle = useMiddle(id);
        const [computed, setComputed] = useState(0);

        useEffect(() => {
          effectOrder.push("top");
          setComputed(middle * 2);
        }, [middle]);

        return computed;
      }

      const { result, ProfiledHook } = profileHook(({ id }) => useTop(id), {
        id: "test",
      });

      // Should have triggered multiple effects
      expect(effectOrder).toContain("base-test-1");
      expect(effectOrder).toContain("base-test-2");
      expect(effectOrder).toContain("top");

      // Should have multiple renders due to effects
      expect(ProfiledHook.getRenderCount()).toBeGreaterThan(1);

      // Final computed value should be correct
      expect(result.current).toBe(4); // (1 + 1) * 2 = 4
    });

    it("should handle 5-level deep hook composition", () => {
      // Test extreme nesting
      function useL1(n: number) {
        return useState(n);
      }

      function useL2(n: number) {
        const [val] = useL1(n);

        return val * 2;
      }

      function useL3(n: number) {
        const val = useL2(n);

        return val + 1;
      }

      function useL4(n: number) {
        const val = useL3(n);

        return val * 3;
      }

      function useL5(n: number) {
        const val = useL4(n);

        return { result: val, description: "5 levels deep" };
      }

      const { result, ProfiledHook } = profileHook(() => useL5(10));

      // Math: 10 * 2 + 1 = 21; 21 * 3 = 63
      expect(result.current.result).toBe(63);
      expect(result.current.description).toBe("5 levels deep");

      // Should still only render once
      expect(ProfiledHook).toHaveRenderedTimes(1);
    });
  });

  describe("Conditional hooks (breaking Rules of Hooks)", () => {
    it("should demonstrate impact of conditional hooks (anti-pattern)", () => {
      // ❌ BREAKING RULES: Conditional hook call
      // Note: React may not always throw immediately, but this is still wrong!
      function useBrokenConditionalHooks(condition: boolean) {
        // This is an anti-pattern - hooks should ALWAYS be called
        // even if the condition logic can be conditional
        if (condition) {
          const [state] = useState("conditional");

          return state;
        }

        return "no-hook";
      }

      // This documents the anti-pattern, even if it doesn't always throw
      const { ProfiledHook } = profileHook(
        ({ condition }) => useBrokenConditionalHooks(condition),
        { condition: true }, // Start with condition=true to have 1 hook
      );

      // The hook executes, but this is still wrong practice
      expect(ProfiledHook).toHaveRenderedTimes(1);

      // Note: In production, changing condition from true to false
      // WILL cause React to throw "Rendered fewer hooks than expected"
    });

    it("should demonstrate conditional hook in loop (anti-pattern)", () => {
      // ❌ BREAKING RULES: Variable number of hooks
      function useVariableHooks(count: number) {
        const states: number[] = [];

        // This is wrong - number of hooks changes based on count
        for (let i = 0; i < count; i++) {
          const [state] = useState(i);

          states.push(state);
        }

        return states;
      }

      // Document the anti-pattern
      const { result, ProfiledHook } = profileHook(
        ({ count }) => useVariableHooks(count),
        { count: 2 }, // Always start with same count
      );

      expect(result.current).toHaveLength(2);
      expect(ProfiledHook).toHaveRenderedTimes(1);

      // Note: If count changes, React will throw an error
      // "Rendered more/fewer hooks than during the previous render"
    });

    it("should work with conditional LOGIC but not conditional HOOKS", () => {
      // ✅ CORRECT: Hooks are called unconditionally, only logic is conditional
      function useConditionalLogic({
        shouldSetHighValue,
      }: {
        shouldSetHighValue: boolean;
      }) {
        const [state, setState] = useState(0); // Always called

        useEffect(() => {
          // Conditional logic inside hook is fine
          setState(shouldSetHighValue ? 10 : 20);
        }, [shouldSetHighValue]);

        return state;
      }

      const { result, ProfiledHook, rerender } = profileHook(
        ({ shouldSetHighValue }) => useConditionalLogic({ shouldSetHighValue }),
        { shouldSetHighValue: true },
      );

      // Should work fine because hooks are called unconditionally
      expect(ProfiledHook.getRenderCount()).toBeGreaterThanOrEqual(1);

      // Value should be set based on condition
      expect(result.current).toBe(10);

      // Rerender with different condition
      rerender({ shouldSetHighValue: false });

      expect(result.current).toBe(20);
    });

    it("should handle early return after hooks (allowed pattern)", () => {
      // ✅ CORRECT: Early return is fine as long as all hooks run first
      function useEarlyReturn(shouldReturnEarly: boolean, value: number) {
        const [state] = useState(value); // Hook called first
        const [count, setCount] = useState(0); // All hooks called

        useEffect(() => {
          setCount((c) => c + 1);
        }, []);

        // Early return AFTER all hooks is fine
        if (shouldReturnEarly) {
          return { state, early: true };
        }

        return { state: state * 2, early: false, count };
      }

      const { result: result1, ProfiledHook: ProfiledHook1 } = profileHook(
        ({ shouldReturnEarly, value }) =>
          useEarlyReturn(shouldReturnEarly, value),
        { shouldReturnEarly: true, value: 5 },
      );

      expect(result1.current.early).toBe(true);
      expect(result1.current.state).toBe(5);

      const { result: result2, ProfiledHook: ProfiledHook2 } = profileHook(
        ({ shouldReturnEarly, value }) =>
          useEarlyReturn(shouldReturnEarly, value),
        { shouldReturnEarly: false, value: 5 },
      );

      expect(result2.current.early).toBe(false);
      expect(result2.current.state).toBe(10);

      // Both should render correctly
      expect(ProfiledHook1.getRenderCount()).toBeGreaterThanOrEqual(1);
      expect(ProfiledHook2.getRenderCount()).toBeGreaterThanOrEqual(1);
    });
  });
});
