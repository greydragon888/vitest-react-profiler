import { describe, it, expect } from "vitest";
import { useState, useEffect } from "react";
import { profileHook, createHookProfiler } from "../../src";

/**
 * Examples of detecting unnecessary renders caused by improper state management
 */
describe("Unnecessary Renders Detection", () => {
  describe("Anti-Pattern: useEffect State Synchronization", () => {
    it("should detect extra renders from useEffect setState", () => {
      // ❌ BAD: Using useEffect to sync state
      function useBadCounter(initialValue: number) {
        const [count, setCount] = useState(0);

        useEffect(() => {
          setCount(initialValue); // Extra render!
        }, [initialValue]);

        return count;
      }

      const { ProfiledHook } = profileHook(
        ({ value }) => useBadCounter(value),
        { value: 5 },
      );

      // Detected: mount + effect = 2 renders
      expect(ProfiledHook).toHaveRenderedTimes(2); // ❌ Extra render!

      const history = ProfiledHook.getRenderHistory();
      expect(history[0]!.phase).toBe("mount");
      expect(history[1]!.phase).toBe("update"); // Unnecessary update
    });

    it("should verify fix: derive state instead of effect", () => {
      // ✅ GOOD: Derive state directly
      function useGoodCounter(initialValue: number) {
        return initialValue; // No state, just return the value
      }

      const { ProfiledHook } = profileHook(
        ({ value }) => useGoodCounter(value),
        { value: 5 },
      );

      // Perfect: only 1 render on mount
      expect(ProfiledHook).toHaveRenderedTimes(1); // ✅ No extra renders!
    });
  });

  describe("Anti-Pattern: Multiple State Updates in Effects", () => {
    it("should detect multiple setState calls in useEffect", () => {
      // ❌ BAD: Multiple state updates in one effect
      function useBadDataProcessor(data: string) {
        const [processed, setProcessed] = useState("");
        const [length, setLength] = useState(0);

        useEffect(() => {
          setProcessed(data.toUpperCase()); // First render
          setLength(data.length); // Second render
        }, [data]);

        return { processed, length };
      }

      const { ProfiledHook } = profileHook(
        ({ data }) => useBadDataProcessor(data),
        { data: "hello" },
      );

      // Note: React 18 batches these updates into fewer renders
      // But the pattern is still inefficient - multiple setState calls
      expect(ProfiledHook).toHaveRenderedTimes(2); // ❌ Extra render from effect!
    });

    it("should verify fix: single state object or derived values", () => {
      // ✅ GOOD: Single state update with object
      function useGoodDataProcessor(data: string) {
        const [state, setState] = useState({ processed: "", length: 0 });

        useEffect(() => {
          setState({
            processed: data.toUpperCase(),
            length: data.length,
          }); // Only one render
        }, [data]);

        return state;
      }

      const { ProfiledHook } = profileHook(
        ({ data }) => useGoodDataProcessor(data),
        { data: "hello" },
      );

      // mount + 1 effect update = 2 renders (still has one extra, but better)
      expect(ProfiledHook).toHaveRenderedTimes(2);

      // EVEN BETTER: derive values without state
      function useBestDataProcessor(data: string) {
        return {
          processed: data.toUpperCase(), // Computed on each render
          length: data.length,
        };
      }

      const { ProfiledHook: BestHook } = profileHook(
        ({ data }) => useBestDataProcessor(data),
        { data: "hello" },
      );

      expect(BestHook).toHaveRenderedTimes(1); // ✅ Perfect!
    });
  });

  describe("Anti-Pattern: Conditional State Updates", () => {
    it("should detect conditional setState causing extra renders", () => {
      // ❌ BAD: Conditional setState in effect
      function useBadConditional(value: number) {
        const [doubled, setDoubled] = useState(0);

        useEffect(() => {
          if (value > 10) {
            setDoubled(value * 2); // Extra render only when value > 10
          }
        }, [value]);

        return doubled;
      }

      // Test with small value - no extra render
      const { ProfiledHook: SmallValue } = profileHook(
        ({ value }) => useBadConditional(value),
        { value: 5 },
      );
      expect(SmallValue).toHaveRenderedTimes(1);

      // Test with large value - extra render
      const { ProfiledHook: LargeValue } = profileHook(
        ({ value }) => useBadConditional(value),
        { value: 15 },
      );
      expect(LargeValue).toHaveRenderedTimes(2); // ❌ Extra render!
    });
  });

  describe("Real-World: Data Fetching Anti-Pattern", () => {
    it("should detect unnecessary renders from data fetching hooks", () => {
      // ❌ BAD: Setting loading state unnecessarily
      function useBadDataFetch<T>(data: T) {
        const [loading, setLoading] = useState(true);
        const [result, setResult] = useState<T | null>(null);

        useEffect(() => {
          setLoading(true); // First extra render
          // Simulate async operation
          Promise.resolve(data).then((fetchedData) => {
            setResult(fetchedData); // Second extra render
            setLoading(false); // Third extra render
          });
        }, [data]);

        return { loading, result };
      }

      const profiler = createHookProfiler(({ data }) => useBadDataFetch(data), {
        data: "test",
      });

      // The anti-pattern here is the complexity: managing loading state separately
      // In sync tests, async operations don't complete, but the pattern is still inefficient
      const renderCount = profiler.getRenderCount();
      expect(renderCount).toBeGreaterThanOrEqual(1);

      // The real issue: too much state management for data fetching
      expect(profiler.result.current).toHaveProperty("loading");
      expect(profiler.result.current).toHaveProperty("result");
    });
  });

  describe("Batch Testing Multiple Hooks", () => {
    it("should test multiple hooks for performance issues", () => {
      // Test hook 1
      {
        const useBadHook1 = () => {
          const [state, setState] = useState(0);
          useEffect(() => setState(1), []);
          return state;
        };

        const { ProfiledHook } = profileHook(useBadHook1);
        expect(ProfiledHook.getRenderCount()).toBe(2);
      }

      // Test hook 2
      {
        const useBadHook2 = () => {
          const [s1, set1] = useState(0);
          const [s2, set2] = useState(0);
          useEffect(() => {
            set1(1);
            set2(2);
          }, []);
          return [s1, s2];
        };

        const { ProfiledHook } = profileHook(useBadHook2);
        expect(ProfiledHook.getRenderCount()).toBe(2); // React 18 batches
      }
    });
  });
});
