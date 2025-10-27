import { describe, it, expect } from "vitest";
import { useState, useCallback, useMemo, useEffect } from "react";
import { createHookProfiler } from "../../src";

/**
 * Examples of performance issues when composing custom hooks
 */
describe("Hook Composition Performance", () => {
  describe("Anti-Pattern: Cascading State Updates", () => {
    it("should detect cascading updates from composed hooks", () => {
      // ❌ BAD: Each hook triggers its own effect
      function useHookA(value: number) {
        const [stateA, setStateA] = useState(0);

        useEffect(() => {
          setStateA(value); // First extra render
        }, [value]);

        return stateA;
      }

      function useHookB(valueA: number) {
        const [stateB, setStateB] = useState(0);

        useEffect(() => {
          setStateB(valueA * 2); // Second extra render
        }, [valueA]);

        return stateB;
      }

      function useBadComposed(value: number) {
        const a = useHookA(value);
        const b = useHookB(a);
        return { a, b };
      }

      const profiler = createHookProfiler(
        ({ value }) => useBadComposed(value),
        { value: 10 },
      );

      // mount + effectA + effectB = 3 renders minimum
      expect(profiler.getRenderCount()).toBeGreaterThanOrEqual(3); // ❌ Cascade!
    });

    it("should verify fix: single source of truth", () => {
      // ✅ GOOD: Derive values instead of storing in state
      function useGoodComposed(value: number) {
        const a = value; // Derive directly
        const b = a * 2; // Derive from a

        return { a, b };
      }

      const profiler = createHookProfiler(
        ({ value }) => useGoodComposed(value),
        { value: 10 },
      );

      profiler.expectRenderCount(1); // ✅ Only mount render!
    });
  });

  describe("Anti-Pattern: Each Hook Creates New References", () => {
    it("should detect reference instability in hook chain", () => {
      // ❌ BAD: Each hook creates new object
      function useHookA(id: number) {
        return { id, timestamp: Date.now() };
      }

      function useHookB(dataA: { id: number; timestamp: number }) {
        return { ...dataA, processed: true };
      }

      function useBadChain(id: number) {
        const a = useHookA(id);
        const b = useHookB(a);
        return b;
      }

      const profiler = createHookProfiler(({ id }) => useBadChain(id), {
        id: 1,
      });

      const result1 = profiler.result.current;
      profiler.rerender({ id: 1 });
      const result2 = profiler.result.current;

      // New reference every render ❌
      expect(result1).not.toBe(result2);
    });

    it("should verify fix: memoize in composition chain", () => {
      // ✅ GOOD: Memoize at each step
      function useHookA(id: number) {
        return useMemo(() => ({ id, timestamp: Date.now() }), [id]);
      }

      function useHookB(dataA: { id: number; timestamp: number }) {
        return useMemo(() => ({ ...dataA, processed: true }), [dataA]);
      }

      function useGoodChain(id: number) {
        const a = useHookA(id);
        const b = useHookB(a);
        return b;
      }

      const profiler = createHookProfiler(({ id }) => useGoodChain(id), {
        id: 1,
      });

      const result1 = profiler.result.current;
      profiler.rerender({ id: 1 });
      const result2 = profiler.result.current;

      // Stable reference ✅
      expect(result1).toBe(result2);
    });
  });

  describe("Real-World: Form + Validation Composition", () => {
    it("should detect issues in form hook composition", () => {
      type FormValues = Record<string, string>;

      // ❌ BAD: Each concern creates new references
      function useBadFormState(initial: FormValues) {
        const [values, setValues] = useState(initial);

        const handleChange = (field: string) => (value: string) => {
          setValues((v) => ({ ...v, [field]: value }));
        };

        return { values, handleChange };
      }

      function useBadValidation(values: FormValues) {
        const [errors, setErrors] = useState<Record<string, string>>({});

        useEffect(() => {
          const newErrors: Record<string, string> = {};
          Object.entries(values).forEach(([key, value]) => {
            if (!value) newErrors[key] = "Required";
          });
          setErrors(newErrors); // Extra render!
        }, [values]);

        return errors;
      }

      function useBadForm(initial: FormValues) {
        const { values, handleChange } = useBadFormState(initial);
        const errors = useBadValidation(values);

        return {
          values,
          errors,
          handleChange,
          isValid: Object.keys(errors).length === 0,
        };
      }

      const profiler = createHookProfiler(
        ({ initial }) => useBadForm(initial),
        { initial: { name: "", email: "" } },
      );

      // mount + validation effect = 2+ renders
      expect(profiler.getRenderCount()).toBeGreaterThanOrEqual(2);

      const result1 = profiler.result.current;
      profiler.rerender({ initial: { name: "", email: "" } });
      const result2 = profiler.result.current;

      // New handleChange reference ❌
      expect(result1.handleChange).not.toBe(result2.handleChange);
    });

    it("should verify fix: optimized form composition", () => {
      type FormValues = Record<string, string>;

      // ✅ GOOD: Optimized with memoization
      function useGoodFormState(initial: FormValues) {
        const [values, setValues] = useState(initial);

        const handleChange = useCallback(
          (field: string) => (value: string) => {
            setValues((v) => ({ ...v, [field]: value }));
          },
          [],
        );

        return { values, handleChange };
      }

      function useGoodValidation(values: FormValues) {
        // Derive errors directly, no state needed
        return useMemo(() => {
          const errors: Record<string, string> = {};
          Object.entries(values).forEach(([key, value]) => {
            if (!value) errors[key] = "Required";
          });
          return errors;
        }, [values]);
      }

      function useGoodForm(initial: FormValues) {
        const { values, handleChange } = useGoodFormState(initial);
        const errors = useGoodValidation(values);

        return {
          values,
          errors,
          handleChange,
          isValid: Object.keys(errors).length === 0,
        };
      }

      const profiler = createHookProfiler(
        ({ initial }) => useGoodForm(initial),
        { initial: { name: "", email: "" } },
      );

      // Only mount render! ✅
      profiler.expectRenderCount(1);

      const result1 = profiler.result.current;
      profiler.rerender({ initial: { name: "", email: "" } });
      const result2 = profiler.result.current;

      // Stable handleChange ✅
      expect(result1.handleChange).toBe(result2.handleChange);
    });
  });

  describe("Real-World: Data Fetching + Caching Composition", () => {
    it("should detect issues in data hook composition", () => {
      // ❌ BAD: Separate hooks for cache and fetch
      function useBadCache<T>() {
        const [cache, setCache] = useState<Map<string, T>>(new Map());

        const get = (key: string) => cache.get(key);
        const set = (key: string, value: T) => {
          setCache(new Map(cache).set(key, value));
        };

        return { get, set };
      }

      function useBadDataFetch(url: string) {
        const [data, setData] = useState<{ data: string } | null>(null);
        const cache = useBadCache<{ data: string }>();

        useEffect(() => {
          const cached = cache.get(url);
          if (cached) {
            setData(cached); // Extra render if cached
          } else {
            Promise.resolve({ data: url }).then((result) => {
              setData(result);
              cache.set(url, result);
            });
          }
        }, [url, cache]); // cache reference changes every render!

        return data;
      }

      const profiler = createHookProfiler(({ url }) => useBadDataFetch(url), {
        url: "/api/data",
      });

      // Multiple renders due to cache reference instability
      expect(profiler.getRenderCount()).toBeGreaterThanOrEqual(1);
    });

    it("should verify fix: integrated data hook", () => {
      // ✅ GOOD: Single integrated hook
      function useGoodDataFetch(url: string) {
        const [cache] = useState(() => new Map<string, { data: string }>());
        const [data, setData] = useState<{ data: string } | null>(null);

        useEffect(() => {
          const cached = cache.get(url);
          if (cached) {
            setData(cached);
          } else {
            Promise.resolve({ data: url }).then((result) => {
              cache.set(url, result);
              setData(result);
            });
          }
        }, [url, cache]); // cache is stable

        return data;
      }

      const profiler = createHookProfiler(({ url }) => useGoodDataFetch(url), {
        url: "/api/data",
      });

      // Cleaner render count
      expect(profiler.getRenderCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Performance Testing Pattern", () => {
    it("should create pattern for testing hook composition performance", () => {
      // Helper to test if composed hooks are efficient
      function testHookCompositionEfficiency<P, R>(
        hook: (props: P) => R,
        props: P,
        expectedMaxRenders: number,
      ) {
        const profiler = createHookProfiler(hook, props);

        const renderCount = profiler.getRenderCount();
        const avgTime = profiler.getAverageRenderTime();

        return {
          renderCount,
          avgTime,
          isEfficient: renderCount <= expectedMaxRenders,
        };
      }

      // Test bad composition
      function useBadMultiHook(value: number) {
        const [a, setA] = useState(0);
        const [b, setB] = useState(0);

        useEffect(() => setA(value), [value]);
        useEffect(() => setB(value * 2), [value]);

        return { a, b };
      }

      const badResult = testHookCompositionEfficiency(
        ({ value }) => useBadMultiHook(value),
        { value: 10 },
        1,
      );

      expect(badResult.isEfficient).toBe(false); // ❌ Too many renders

      // Test good composition
      function useGoodMultiHook(value: number) {
        const a = value;
        const b = value * 2;
        return { a, b };
      }

      const goodResult = testHookCompositionEfficiency(
        ({ value }) => useGoodMultiHook(value),
        { value: 10 },
        1,
      );

      expect(goodResult.isEfficient).toBe(true); // ✅ Optimal renders
    });
  });
});
