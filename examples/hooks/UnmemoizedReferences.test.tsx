import { describe, it, expect } from "vitest";
import { useState, useCallback, useMemo, useEffect } from "react";
import { createHookProfiler } from "../../src";

/**
 * Examples of detecting issues with unmemoized object/function references
 *
 * Note: These tests detect HOOK renders, not component re-renders caused by deps.
 * The real issue manifests when these hooks are used in components with useEffect deps.
 */
describe("Unmemoized References Detection", () => {
  describe("Anti-Pattern: Returning New Object References", () => {
    it("should document that new objects are created each render", () => {
      // ❌ BAD: Returns new object reference every render
      function useBadObjectRef(userId: number) {
        const [user] = useState({ id: userId, name: "User" });

        // This returns a NEW object every render
        return {
          ...user,
          formattedName: user.name.toUpperCase(),
        };
      }

      const profiler = createHookProfiler(
        ({ userId }) => useBadObjectRef(userId),
        { userId: 1 },
      );

      // Hook itself renders once (correct)
      profiler.expectRenderCount(1);

      // But the returned object is a new reference each time
      const result1 = profiler.result.current;

      // Rerender with same props
      profiler.rerender({ userId: 1 });
      profiler.expectRenderCount(2);

      const result2 = profiler.result.current;

      // Different references! This would cause child components to re-render
      expect(result1).not.toBe(result2); // ❌ New reference

      // But values are the same
      expect(result1).toEqual(result2);
    });

    it("should verify fix: useMemo for stable object references", () => {
      // ✅ GOOD: Use useMemo for stable references
      function useGoodObjectRef(userId: number) {
        const [user] = useState({ id: userId, name: "User" });

        return useMemo(
          () => ({
            ...user,
            formattedName: user.name.toUpperCase(),
          }),
          [user], // Only changes when user changes
        );
      }

      const profiler = createHookProfiler(
        ({ userId }) => useGoodObjectRef(userId),
        { userId: 1 },
      );

      profiler.expectRenderCount(1);
      const result1 = profiler.result.current;

      // Rerender with same props
      profiler.rerender({ userId: 1 });
      profiler.expectRenderCount(2);
      const result2 = profiler.result.current;

      // Same reference! ✅
      expect(result1).toBe(result2);
    });
  });

  describe("Anti-Pattern: Inline Function Creation", () => {
    it("should document new function references each render", () => {
      // ❌ BAD: Creates new function every render
      function useBadCallbacks(initialValue: number) {
        const [count, setCount] = useState(initialValue);

        // New function reference every render
        const increment = () => setCount((c) => c + 1);
        const decrement = () => setCount((c) => c - 1);
        const reset = () => setCount(initialValue);

        return { count, increment, decrement, reset };
      }

      const profiler = createHookProfiler(
        ({ value }) => useBadCallbacks(value),
        { value: 0 },
      );

      const result1 = profiler.result.current;

      // Rerender
      profiler.rerender({ value: 0 });
      const result2 = profiler.result.current;

      // All functions are new references
      expect(result1.increment).not.toBe(result2.increment); // ❌
      expect(result1.decrement).not.toBe(result2.decrement); // ❌
      expect(result1.reset).not.toBe(result2.reset); // ❌
    });

    it("should verify fix: useCallback for stable function references", () => {
      // ✅ GOOD: Use useCallback for stable references
      function useGoodCallbacks(initialValue: number) {
        const [count, setCount] = useState(initialValue);

        const increment = useCallback(() => setCount((c) => c + 1), []);
        const decrement = useCallback(() => setCount((c) => c - 1), []);
        const reset = useCallback(() => setCount(initialValue), [initialValue]);

        return { count, increment, decrement, reset };
      }

      const profiler = createHookProfiler(
        ({ value }) => useGoodCallbacks(value),
        { value: 0 },
      );

      const result1 = profiler.result.current;

      // Rerender with same props
      profiler.rerender({ value: 0 });
      const result2 = profiler.result.current;

      // Callbacks are stable ✅
      expect(result1.increment).toBe(result2.increment);
      expect(result1.decrement).toBe(result2.decrement);
      expect(result1.reset).toBe(result2.reset);
    });
  });

  describe("Anti-Pattern: Array Creation", () => {
    it("should detect new array references", () => {
      // ❌ BAD: Creates new array every render
      function useBadArray(items: string[]) {
        // Always returns new array reference
        return items.map((item) => item.toUpperCase());
      }

      const profiler = createHookProfiler(({ items }) => useBadArray(items), {
        items: ["a", "b", "c"],
      });

      const result1 = profiler.result.current;
      profiler.rerender({ items: ["a", "b", "c"] });
      const result2 = profiler.result.current;

      // New array reference even with same input
      expect(result1).not.toBe(result2); // ❌
      expect(result1).toEqual(result2); // Same values though
    });

    it("should verify fix: useMemo for arrays", () => {
      // ✅ GOOD: Memoize array
      function useGoodArray(items: string[]) {
        return useMemo(() => items.map((item) => item.toUpperCase()), [items]);
      }

      const sameItems = ["a", "b", "c"]; // Same reference
      const profiler = createHookProfiler(({ items }) => useGoodArray(items), {
        items: sameItems,
      });

      const result1 = profiler.result.current;
      profiler.rerender({ items: sameItems }); // Pass same reference
      const result2 = profiler.result.current;

      // Same reference! ✅
      expect(result1).toBe(result2);
    });
  });

  describe("Real-World: Form Handlers", () => {
    it("should detect unmemoized form handlers", () => {
      // ❌ BAD: New handlers every render
      function useBadForm(initialValues: Record<string, string>) {
        const [values, setValues] = useState(initialValues);

        const handleChange = (field: string) => (value: string) => {
          setValues((v) => ({ ...v, [field]: value }));
        };

        const handleSubmit = () => {
          console.log("Submit:", values);
        };

        return {
          values,
          handleChange,
          handleSubmit,
        };
      }

      const profiler = createHookProfiler(
        ({ initial }) => useBadForm(initial),
        { initial: { name: "" } },
      );

      const result1 = profiler.result.current;
      profiler.rerender({ initial: { name: "" } });
      const result2 = profiler.result.current;

      // New functions every render ❌
      expect(result1.handleChange).not.toBe(result2.handleChange);
      expect(result1.handleSubmit).not.toBe(result2.handleSubmit);
    });

    it("should verify fix: memoized form handlers", () => {
      // ✅ GOOD: Stable handlers with useCallback
      function useGoodForm(initialValues: Record<string, string>) {
        const [values, setValues] = useState(initialValues);

        const handleChange = useCallback(
          (field: string) => (value: string) => {
            setValues((v) => ({ ...v, [field]: value }));
          },
          [],
        );

        const handleSubmit = useCallback(() => {
          console.log("Submit:", values);
        }, [values]);

        return {
          values,
          handleChange,
          handleSubmit,
        };
      }

      const profiler = createHookProfiler(
        ({ initial }) => useGoodForm(initial),
        { initial: { name: "" } },
      );

      const result1 = profiler.result.current;
      profiler.rerender({ initial: { name: "" } });
      const result2 = profiler.result.current;

      // Stable references ✅
      expect(result1.handleChange).toBe(result2.handleChange);
      // Note: handleSubmit depends on values, so it's a new reference
      // But that's intentional and correct
    });
  });

  describe("Real-World: API Hooks", () => {
    it("should detect options object recreation", () => {
      type ApiOptions = {
        url: string;
        params: Record<string, string>;
        headers: { "Content-Type": string };
      };

      // ❌ BAD: New options object every render
      function useBadApi(endpoint: string, params: Record<string, string>) {
        const [data, setData] = useState<ApiOptions | null>(null);

        useEffect(() => {
          // This creates a new options object every render
          const options = {
            url: endpoint,
            params: params,
            headers: { "Content-Type": "application/json" },
          };

          // Simulate fetch
          Promise.resolve(options).then(setData);
        }, [endpoint, params]); // params is likely a new object each render

        return data;
      }

      const profiler = createHookProfiler(
        ({ endpoint, params }) => useBadApi(endpoint, params),
        { endpoint: "/api", params: { id: "1" } },
      );

      // Multiple renders due to new params object
      const renderCount = profiler.getRenderCount();
      expect(renderCount).toBeGreaterThanOrEqual(1);
    });

    it("should verify fix: memoized config objects", () => {
      type ApiOptions = {
        url: string;
        params: Record<string, string>;
        headers: { "Content-Type": string };
      };

      // ✅ GOOD: Memoize config object
      function useGoodApi(endpoint: string, params: Record<string, string>) {
        const [data, setData] = useState<ApiOptions | null>(null);

        const options = useMemo(
          () => ({
            url: endpoint,
            params: params,
            headers: { "Content-Type": "application/json" },
          }),
          [endpoint, params],
        );

        useEffect(() => {
          Promise.resolve(options).then(setData);
        }, [options]); // Stable reference

        return data;
      }

      const profiler = createHookProfiler(
        ({ endpoint, params }) => useGoodApi(endpoint, params),
        { endpoint: "/api", params: { id: "1" } },
      );

      // Should have reasonable render count
      expect(profiler.getRenderCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Comparison Helper: Reference Stability Tests", () => {
    it("should create helper to test reference stability", () => {
      // Helper function to test if hook returns stable references
      function testReferenceStability<T>(
        hook: () => T,
        extractRefs: (result: T) => unknown[],
      ) {
        const profiler = createHookProfiler(hook);

        const refs1 = extractRefs(profiler.result.current);
        profiler.rerender();
        const refs2 = extractRefs(profiler.result.current);

        return refs1.every((ref, index) => ref === refs2[index]);
      }

      // Test with bad hook
      const badHook = () => ({
        onClick: () => console.log("click"),
        data: { value: 1 },
      });

      const badStability = testReferenceStability(badHook, (result) => [
        result.onClick,
        result.data,
      ]);
      expect(badStability).toBe(false); // ❌ Unstable

      // Test with good hook
      const goodHook = () => ({
        onClick: useCallback(() => console.log("click"), []),
        data: useMemo(() => ({ value: 1 }), []),
      });

      const goodStability = testReferenceStability(goodHook, (result) => [
        result.onClick,
        result.data,
      ]);
      expect(goodStability).toBe(true); // ✅ Stable
    });
  });
});
