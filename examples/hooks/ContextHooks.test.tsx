import { describe, expect, it } from "vitest";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { profileHook, createHookProfiler } from "@/hooks";

/**
 * Examples of profiling hooks that depend on React Context
 *
 * When a hook uses useContext(), it requires the corresponding Provider
 * to be present in the component tree. Use the `wrapper` option to provide it.
 */

// ============================================================================
// Example 1: Simple Theme Context
// ============================================================================

describe("Example: Theme Context Hook", () => {
  // Define the context
  interface ThemeContextValue {
    theme: "light" | "dark";
    toggleTheme: () => void;
  }

  const ThemeContext = createContext<ThemeContextValue | null>(null);

  // Custom hook that uses the context
  function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);

    if (context === null) {
      throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
  }

  // Context provider component
  function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    const toggleTheme = useCallback(() => {
      setTheme((t) => (t === "light" ? "dark" : "light"));
    }, []);

    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

    return (
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
  }

  it("should profile hook with context using wrapper option", () => {
    // ✅ Create a wrapper that provides the context
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    // ✅ Pass wrapper via renderOptions
    const { result, ProfiledHook } = profileHook(() => useTheme(), {
      renderOptions: { wrapper },
    });

    // ✅ Hook renders once and has access to context
    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current.theme).toBe("light");
    expect(typeof result.current.toggleTheme).toBe("function");
  });

  it("should work with createHookProfiler too", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const profiler = createHookProfiler(() => useTheme(), {
      renderOptions: { wrapper },
    });

    profiler.expectRenderCount(1);
    expect(profiler.result.current.theme).toBe("light");
  });
});

// ============================================================================
// Example 2: Auth Context with Props
// ============================================================================

describe("Example: Auth Context Hook with Props", () => {
  interface AuthContextValue {
    user: { id: string; name: string } | null;
    isAuthenticated: boolean;
  }

  const AuthContext = createContext<AuthContextValue>({
    user: null,
    isAuthenticated: false,
  });

  // Hook that combines context with props
  function useUserPermissions(props: { requiredRole: string }) {
    const { user, isAuthenticated } = useContext(AuthContext);

    return {
      isAuthenticated,
      hasPermission: isAuthenticated && user?.id === props.requiredRole,
      userName: user?.name ?? "Guest",
    };
  }

  // Provider with test data
  function AuthProvider({
    children,
    user,
  }: {
    children: React.ReactNode;
    user?: { id: string; name: string };
  }) {
    const value = useMemo(
      () => ({
        user: user ?? null,
        isAuthenticated: user !== undefined,
      }),
      [user],
    );

    return (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
  }

  it("should profile hook with context AND props", () => {
    // Wrapper with authenticated user
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider user={{ id: "admin", name: "John Admin" }}>
        {children}
      </AuthProvider>
    );

    // ✅ Use 3-argument form: hook, initialProps, options
    const { result, ProfiledHook } = profileHook(
      (props) => useUserPermissions(props),
      { requiredRole: "admin" }, // initialProps
      { renderOptions: { wrapper } }, // options
    );

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current).toStrictEqual({
      isAuthenticated: true,
      hasPermission: true,
      userName: "John Admin",
    });
  });

  it("should preserve context when props change", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider user={{ id: "user", name: "Jane User" }}>
        {children}
      </AuthProvider>
    );

    const { result, rerender, ProfiledHook } = profileHook(
      (props) => useUserPermissions(props),
      { requiredRole: "admin" },
      { renderOptions: { wrapper } },
    );

    // Initial: no permission (role mismatch)
    expect(result.current.hasPermission).toBe(false);

    // Change props to match user's role
    rerender({ requiredRole: "user" });

    // Context preserved, props updated
    expect(ProfiledHook).toHaveRenderedTimes(2);
    expect(result.current.hasPermission).toBe(true);
    expect(result.current.userName).toBe("Jane User");
  });
});

// ============================================================================
// Example 3: Router-like Context (Real-World Scenario)
// ============================================================================

describe("Example: Router Context (Real-World)", () => {
  interface RouteParams {
    [key: string]: string;
  }

  interface RouterContextValue {
    pathname: string;
    params: RouteParams;
    navigate: (path: string) => void;
  }

  const RouterContext = createContext<RouterContextValue | null>(null);

  // Hook similar to useRouter from popular routing libraries
  function useRouter(): RouterContextValue {
    const context = useContext(RouterContext);

    if (context === null) {
      throw new Error("useRouter must be used within a RouterProvider");
    }

    return context;
  }

  // Hook for route parameters
  function useRouteParams(): RouteParams {
    return useRouter().params;
  }

  // Mock router provider for tests
  function MockRouterProvider({
    children,
    pathname = "/",
    params = {},
  }: {
    children: React.ReactNode;
    pathname?: string;
    params?: RouteParams;
  }) {
    const [currentPath, setCurrentPath] = useState(pathname);

    const value = useMemo(
      () => ({
        pathname: currentPath,
        params,
        navigate: setCurrentPath,
      }),
      [currentPath, params],
    );

    return (
      <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
    );
  }

  it("should profile router hook without extra renders", () => {
    // This pattern is common when testing hooks from routing libraries
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockRouterProvider pathname="/users/123" params={{ userId: "123" }}>
        {children}
      </MockRouterProvider>
    );

    const { result, ProfiledHook } = profileHook(() => useRouter(), {
      renderOptions: { wrapper },
    });

    // ✅ Only 1 render on mount
    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current.pathname).toBe("/users/123");
    expect(result.current.params).toStrictEqual({ userId: "123" });
  });

  it("should profile useRouteParams hook", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MockRouterProvider params={{ id: "42", tab: "settings" }}>
        {children}
      </MockRouterProvider>
    );

    const { result, ProfiledHook } = profileHook(() => useRouteParams(), {
      renderOptions: { wrapper },
    });

    expect(ProfiledHook).toHaveRenderedTimes(1);
    expect(result.current).toStrictEqual({ id: "42", tab: "settings" });
  });
});

// ============================================================================
// Anti-Pattern: What NOT to do
// ============================================================================

describe("Anti-Pattern: Missing Context Provider", () => {
  const SomeContext = createContext<string | null>(null);

  function useRequiredContext(): string {
    const value = useContext(SomeContext);

    if (value === null) {
      throw new Error("Context is required!");
    }

    return value;
  }

  it("should throw when context provider is missing", () => {
    // ❌ BAD: Forgetting to provide the wrapper
    expect(() => {
      profileHook(() => useRequiredContext());
    }).toThrow("Context is required!");
  });

  it("should work when wrapper is provided", () => {
    // ✅ GOOD: Providing the wrapper
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SomeContext.Provider value="test-value">{children}</SomeContext.Provider>
    );

    const { result } = profileHook(() => useRequiredContext(), {
      renderOptions: { wrapper },
    });

    expect(result.current).toBe("test-value");
  });
});
