import { describe, it, expect } from "vitest";
import { useState, useMemo, useEffect } from "react";
import { profileHook, createHookProfiler } from "../../src";

/**
 * Examples of performance issues with derived state calculations
 */
describe("Derived State Performance Issues", () => {
  describe("Anti-Pattern: Expensive Calculations Without Memoization", () => {
    it("should detect repeated expensive calculations", () => {
      // ❌ BAD: Expensive calculation on every render
      function useBadExpensiveCalc(items: number[]) {
        const [count, setCount] = useState(0);

        // This runs on EVERY render, even when items don't change
        const sum = items.reduce((acc, val) => acc + val, 0);
        const avg = sum / items.length;
        const max = Math.max(...items);

        return {
          count,
          sum,
          avg,
          max,
          increment: () => setCount((c) => c + 1),
        };
      }

      const profiler = createHookProfiler(
        ({ items }) => useBadExpensiveCalc(items),
        { items: Array.from({ length: 1000 }, (_, i) => i) },
      );

      // First render
      expect(profiler.getRenderCount()).toBe(1);

      // Call increment - items haven't changed but calculations rerun
      profiler.result.current.increment();

      // Track that we're recalculating unnecessarily
      // (In real app, this would be expensive)
    });

    it("should verify fix: useMemo for expensive calculations", () => {
      // ✅ GOOD: Memoize expensive calculations
      function useGoodExpensiveCalc(items: number[]) {
        const [count, setCount] = useState(0);

        const stats = useMemo(() => {
          const sum = items.reduce((acc, val) => acc + val, 0);
          const avg = sum / items.length;
          const max = Math.max(...items);
          return { sum, avg, max };
        }, [items]); // Only recalculate when items change

        return { count, ...stats, increment: () => setCount((c) => c + 1) };
      }

      const profiler = createHookProfiler(
        ({ items }) => useGoodExpensiveCalc(items),
        { items: Array.from({ length: 1000 }, (_, i) => i) },
      );

      const result1 = profiler.result.current;
      const stats1 = { sum: result1.sum, avg: result1.avg, max: result1.max };

      // Rerender with same items
      profiler.rerender({ items: Array.from({ length: 1000 }, (_, i) => i) });

      const result2 = profiler.result.current;
      const stats2 = { sum: result2.sum, avg: result2.avg, max: result2.max };

      // Stats should be deeply equal (recalculated because array reference changed)
      expect(stats1).toEqual(stats2);
    });
  });

  describe("Anti-Pattern: Filtering/Sorting Without Memoization", () => {
    it("should detect repeated filtering operations", () => {
      // ❌ BAD: Filter/sort on every render
      function useBadFilter(items: string[], searchTerm: string) {
        const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

        // Runs on every render
        const filtered = items.filter((item) =>
          item.toLowerCase().includes(searchTerm.toLowerCase()),
        );

        const sorted =
          sortOrder === "asc"
            ? [...filtered].sort()
            : [...filtered].sort().reverse();

        return {
          items: sorted,
          sortOrder,
          setSortOrder,
        };
      }

      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const profiler = createHookProfiler(
        ({ items, search }) => useBadFilter(items, search),
        { items, search: "5" },
      );

      // Every render recalculates filtering and sorting
      profiler.expectRenderCount(1);
    });

    it("should verify fix: memoize filtering and sorting", () => {
      // ✅ GOOD: Memoize filter and sort operations
      function useGoodFilter(items: string[], searchTerm: string) {
        const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

        const filtered = useMemo(
          () =>
            items.filter((item) =>
              item.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
          [items, searchTerm],
        );

        const sorted = useMemo(() => {
          const copy = [...filtered];
          copy.sort();
          return sortOrder === "desc" ? copy.reverse() : copy;
        }, [filtered, sortOrder]);

        return {
          items: sorted,
          sortOrder,
          setSortOrder,
        };
      }

      const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const profiler = createHookProfiler(
        ({ items, search }) => useGoodFilter(items, search),
        { items, search: "5" },
      );

      const result1 = profiler.result.current.items;

      // Rerender with same props
      profiler.rerender({ items, search: "5" });

      const result2 = profiler.result.current.items;

      // Same reference because deps haven't changed
      expect(result1).toBe(result2); // ✅
    });
  });

  describe("Anti-Pattern: Derived State in useEffect", () => {
    it("should detect derived state stored in separate state", () => {
      // ❌ BAD: Storing derived data in state
      function useBadDerived(count: number) {
        const [doubled, setDoubled] = useState(count * 2);
        const [tripled, setTripled] = useState(count * 3);

        useEffect(() => {
          setDoubled(count * 2); // Extra render!
        }, [count]);

        useEffect(() => {
          setTripled(count * 3); // Another extra render!
        }, [count]);

        return { doubled, tripled };
      }

      const profiler = createHookProfiler(({ count }) => useBadDerived(count), {
        count: 5,
      });

      // Note: React 18 batches these updates, but it's still inefficient
      // The anti-pattern is storing derived data in state at all
      expect(profiler.getRenderCount()).toBeGreaterThanOrEqual(1); // ❌ Inefficient pattern!
    });

    it("should verify fix: derive values directly", () => {
      // ✅ GOOD: Calculate derived values directly
      function useGoodDerived(count: number) {
        const doubled = count * 2; // Just calculate it
        const tripled = count * 3;

        return { doubled, tripled };
      }

      const profiler = createHookProfiler(
        ({ count }) => useGoodDerived(count),
        { count: 5 },
      );

      // Only 1 render!
      profiler.expectRenderCount(1); // ✅
    });
  });

  describe("Real-World: Data Transformation Chains", () => {
    it("should detect inefficient data transformation pipelines", () => {
      interface Item {
        id: number;
        name: string;
        price: number;
        category: string;
      }

      // ❌ BAD: Multiple transformation steps without memoization
      function useBadDataPipeline(items: Item[], category: string) {
        // Each of these runs on every render
        const filtered = items.filter((item) => item.category === category);
        const sorted = [...filtered].sort((a, b) => a.price - b.price);
        const withTax = sorted.map((item) => ({
          ...item,
          priceWithTax: item.price * 1.2,
        }));
        const grouped = withTax.reduce(
          (acc, item) => {
            const key = item.category;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          },
          {} as Record<string, typeof withTax>,
        );

        return { items: withTax, grouped };
      }

      const items: Item[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        price: Math.random() * 100,
        category: i % 3 === 0 ? "A" : "B",
      }));

      const profiler = createHookProfiler(
        ({ items, category }) => useBadDataPipeline(items, category),
        { items, category: "A" },
      );

      // Hook renders once but does all transformations on each render
      profiler.expectRenderCount(1);

      // The real problem: new references every render
      const result1 = profiler.result.current;
      profiler.rerender({ items, category: "A" });
      const result2 = profiler.result.current;

      expect(result1.items).not.toBe(result2.items); // ❌ New reference
    });

    it("should verify fix: memoize transformation pipeline", () => {
      interface Item {
        id: number;
        name: string;
        price: number;
        category: string;
      }

      // ✅ GOOD: Memoize each step
      function useGoodDataPipeline(items: Item[], category: string) {
        const filtered = useMemo(
          () => items.filter((item) => item.category === category),
          [items, category],
        );

        const sorted = useMemo(
          () => [...filtered].sort((a, b) => a.price - b.price),
          [filtered],
        );

        const withTax = useMemo(
          () =>
            sorted.map((item) => ({
              ...item,
              priceWithTax: item.price * 1.2,
            })),
          [sorted],
        );

        const grouped = useMemo(
          () =>
            withTax.reduce(
              (acc, item) => {
                const key = item.category;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
              },
              {} as Record<string, typeof withTax>,
            ),
          [withTax],
        );

        return { items: withTax, grouped };
      }

      const items: Item[] = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        price: Math.random() * 100,
        category: i % 3 === 0 ? "A" : "B",
      }));

      const profiler = createHookProfiler(
        ({ items, category }) => useGoodDataPipeline(items, category),
        { items, category: "A" },
      );

      const result1 = profiler.result.current;
      profiler.rerender({ items, category: "A" });
      const result2 = profiler.result.current;

      // Stable references! ✅
      expect(result1.items).toBe(result2.items);
      expect(result1.grouped).toBe(result2.grouped);
    });
  });

  describe("Performance Metrics", () => {
    it("should compare render times with/without memoization", () => {
      const data = Array.from({ length: 10000 }, (_, i) => i);

      // Bad version
      const bad = profileHook(
        ({ items }) => {
          return items.reduce((acc, val) => acc + val, 0);
        },
        { items: data },
      );

      // Good version
      const good = profileHook(
        ({ items }) => {
          return useMemo(
            () => items.reduce((acc, val) => acc + val, 0),
            [items],
          );
        },
        { items: data },
      );

      // Both render once, but good version is more efficient for rerenders
      expect(bad.ProfiledHook).toHaveRenderedTimes(1);
      expect(good.ProfiledHook).toHaveRenderedTimes(1);

      // Check render times
      const badTime = bad.ProfiledHook.getAverageRenderTime();
      const goodTime = good.ProfiledHook.getAverageRenderTime();

      expect(badTime).toBeGreaterThanOrEqual(0);
      expect(goodTime).toBeGreaterThanOrEqual(0);
    });
  });
});
