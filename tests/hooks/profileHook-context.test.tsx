import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { describe, it, expect } from "vitest";

import { profileHook, createHookProfiler } from "@/hooks";

/**
 * Integration tests for profileHook with React Context
 *
 * These tests verify that hooks depending on React Context work correctly
 * when using the wrapper option.
 */

// ============================================================================
// Test Context Setup
// ============================================================================

interface ThemeContextValue {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

interface ThemeProviderProps {
  readonly children: React.ReactNode;
  readonly initialTheme?: "light" | "dark";
}

function ThemeProvider({
  children,
  initialTheme = "light",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<"light" | "dark">(initialTheme);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// ============================================================================
// profileHook Tests
// ============================================================================

describe("profileHook - Context Integration", () => {
  describe("Basic Context Usage", () => {
    it("should profile hook that uses context", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result, ProfiledHook } = profileHook(() => useTheme(), {
        renderOptions: { wrapper },
      });

      expect(ProfiledHook).toHaveRenderedTimes(1);
      expect(result.current.theme).toBe("light");
    });

    it("should throw error when context provider is missing", () => {
      // This should throw because useTheme requires ThemeProvider
      expect(() => {
        profileHook(() => useTheme());
      }).toThrow("useTheme must be used within a ThemeProvider");
    });

    it("should work with custom initial context value", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider initialTheme="dark">{children}</ThemeProvider>
      );

      const { result, ProfiledHook } = profileHook(() => useTheme(), {
        renderOptions: { wrapper },
      });

      expect(ProfiledHook).toHaveRenderedTimes(1);
      expect(result.current.theme).toBe("dark");
    });
  });

  describe("Context with Rerenders", () => {
    it("should maintain context access after rerender", () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result, rerender, ProfiledHook } = profileHook(() => useTheme(), {
        renderOptions: { wrapper },
      });

      expect(result.current.theme).toBe("light");

      rerender();

      expect(ProfiledHook).toHaveRenderedTimes(2);
      expect(result.current.theme).toBe("light");
    });
  });

  describe("Context with Props", () => {
    it("should work with both context and props", () => {
      function useThemedCounter(props: { initialCount: number }) {
        const { theme } = useTheme();
        const [count, setCount] = useState(props.initialCount);

        return {
          theme,
          count,
          increment: () => {
            setCount((c) => c + 1);
          },
        };
      }

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result, ProfiledHook } = profileHook(
        (props) => useThemedCounter(props),
        { initialCount: 10 },
        { renderOptions: { wrapper } },
      );

      expect(ProfiledHook).toHaveRenderedTimes(1);
      expect(result.current.theme).toBe("light");
      expect(result.current.count).toBe(10);
    });

    it("should preserve context when props change", () => {
      function useThemedValue(props: { multiplier: number }) {
        const { theme } = useTheme();

        return {
          theme,
          value: props.multiplier * 2,
        };
      }

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider>{children}</ThemeProvider>
      );

      const { result, rerender, ProfiledHook } = profileHook(
        (props) => useThemedValue(props),
        { multiplier: 5 },
        { renderOptions: { wrapper } },
      );

      expect(result.current).toStrictEqual({ theme: "light", value: 10 });

      rerender({ multiplier: 10 });

      expect(ProfiledHook).toHaveRenderedTimes(2);
      expect(result.current).toStrictEqual({ theme: "light", value: 20 });
    });
  });
});

// ============================================================================
// createHookProfiler Tests
// ============================================================================

describe("createHookProfiler - Context Integration", () => {
  it("should work with wrapper option", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const profiler = createHookProfiler(() => useTheme(), {
      renderOptions: { wrapper },
    });

    profiler.expectRenderCount(1);

    expect(profiler.result.current.theme).toBe("light");
  });

  it("should work with wrapper and props", () => {
    function useThemedValue(props: { value: number }) {
      const { theme } = useTheme();

      return { theme, doubled: props.value * 2 };
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialTheme="dark">{children}</ThemeProvider>
    );

    const profiler = createHookProfiler(
      (props) => useThemedValue(props),
      { value: 5 },
      { renderOptions: { wrapper } },
    );

    profiler.expectRenderCount(1);

    expect(profiler.result.current).toStrictEqual({
      theme: "dark",
      doubled: 10,
    });
  });

  it("should maintain context through rerenders", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const profiler = createHookProfiler(() => useTheme(), {
      renderOptions: { wrapper },
    });

    expect(profiler.result.current.theme).toBe("light");

    profiler.rerender();

    profiler.expectRenderCount(2);

    expect(profiler.result.current.theme).toBe("light");
  });
});

// ============================================================================
// Nested Context Tests
// ============================================================================

describe("profileHook - Nested Contexts", () => {
  interface UserContextValue {
    name: string;
    isLoggedIn: boolean;
  }

  const UserContext = createContext<UserContextValue | null>(null);

  function useUser(): UserContextValue {
    const context = useContext(UserContext);

    if (context === null) {
      throw new Error("useUser must be used within a UserProvider");
    }

    return context;
  }

  function UserProvider({
    children,
    name = "Guest",
  }: {
    readonly children: React.ReactNode;
    readonly name?: string;
  }) {
    const value = useMemo(
      () => ({ name, isLoggedIn: name !== "Guest" }),
      [name],
    );

    return (
      <UserContext.Provider value={value}>{children}</UserContext.Provider>
    );
  }

  it("should work with multiple nested contexts", () => {
    function useAppState() {
      const { theme } = useTheme();
      const { name, isLoggedIn } = useUser();

      return { theme, name, isLoggedIn };
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider initialTheme="dark">
        <UserProvider name="John">{children}</UserProvider>
      </ThemeProvider>
    );

    const { result, ProfiledHook } = profileHook(() => useAppState(), {
      renderOptions: { wrapper },
    });

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current).toStrictEqual({
      theme: "dark",
      name: "John",
      isLoggedIn: true,
    });
  });
});
