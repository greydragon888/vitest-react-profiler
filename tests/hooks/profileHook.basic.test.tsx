import { useState, useEffect, useContext, createContext } from "react";
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

describe("profileHook - Context wrapper support", () => {
  // Create a test context
  const TestContext = createContext({ value: "default" });

  function useTestContext() {
    return useContext(TestContext);
  }

  const TestProvider = ({ children }: { children: React.ReactNode }) => (
    <TestContext.Provider value={{ value: "from-provider" }}>
      {children}
    </TestContext.Provider>
  );

  it("should support wrapper option for hooks without parameters", () => {
    const { result, ProfiledHook } = profileHook(() => useTestContext(), {
      renderOptions: { wrapper: TestProvider },
    });

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current).toStrictEqual({ value: "from-provider" });
  });

  it("should support wrapper option for hooks with parameters", () => {
    function useTestHookWithProps(props: { multiplier: number }) {
      const ctx = useContext(TestContext);

      return { ...ctx, multiplied: props.multiplier * 2 };
    }

    const { result, ProfiledHook } = profileHook(
      (props) => useTestHookWithProps(props),
      { multiplier: 5 },
      { renderOptions: { wrapper: TestProvider } },
    );

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current).toStrictEqual({
      value: "from-provider",
      multiplied: 10,
    });
  });

  it("should preserve wrapper during rerender", () => {
    const { result, rerender, ProfiledHook } = profileHook(
      () => useTestContext(),
      { renderOptions: { wrapper: TestProvider } },
    );

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current.value).toBe("from-provider");

    // Rerender should still have access to context
    rerender();

    expect(ProfiledHook).toHaveRenderedTimes(2);
    expect(result.current.value).toBe("from-provider");
  });

  it("should preserve wrapper during rerender with props", () => {
    function useTestHookWithProps(props: { count: number }) {
      const ctx = useContext(TestContext);

      return { ...ctx, count: props.count };
    }

    const { result, rerender, ProfiledHook } = profileHook(
      (props) => useTestHookWithProps(props),
      { count: 1 },
      { renderOptions: { wrapper: TestProvider } },
    );

    expect(result.current).toStrictEqual({ value: "from-provider", count: 1 });

    rerender({ count: 2 });

    expect(ProfiledHook).toHaveRenderedTimes(2);
    expect(result.current).toStrictEqual({ value: "from-provider", count: 2 });
  });

  it("should work with empty options object (edge case)", () => {
    // Empty options should work like no options
    const { ProfiledHook } = profileHook(() => useState(0), {});

    expect(ProfiledHook).toHaveRenderedTimes(1);
  });

  it("should work with undefined renderOptions (edge case)", () => {
    const { ProfiledHook } = profileHook(() => useState(0), {
      renderOptions: undefined,
    });

    expect(ProfiledHook).toHaveRenderedTimes(1);
  });
});
