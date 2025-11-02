import { describe, it, expect, vi } from "vitest";

import { ProfilerCache } from "../../src/profiler/core/ProfilerCache";

import type { PhaseType } from "../../src/types";

describe("ProfilerCache", () => {
  describe("getFrozenHistory", () => {
    it("should return cached value on subsequent calls", () => {
      const cache = new ProfilerCache();
      const mockHistory: readonly PhaseType[] = ["mount", "update"];
      const compute = vi.fn(() => mockHistory);

      const result1 = cache.getFrozenHistory(compute);
      const result2 = cache.getFrozenHistory(compute);

      expect(result1).toBe(mockHistory);
      expect(result2).toBe(mockHistory);
      expect(result1).toBe(result2); // Same reference
      expect(compute).toHaveBeenCalledTimes(1); // Computed only once
    });

    it("should compute only on first call", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => ["mount"] as const);

      cache.getFrozenHistory(compute);
      cache.getFrozenHistory(compute);
      cache.getFrozenHistory(compute);

      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should recompute after invalidate", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => ["mount"] as const);

      cache.getFrozenHistory(compute);

      expect(compute).toHaveBeenCalledTimes(1);

      cache.invalidate();
      cache.getFrozenHistory(compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getPhaseCache", () => {
    it("should work for mount phase", () => {
      const cache = new ProfilerCache();
      const mountRenders: readonly PhaseType[] = ["mount"];
      const compute = vi.fn(() => mountRenders);

      const result = cache.getPhaseCache("mount", compute);

      expect(result).toBe(mountRenders);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should work for update phase", () => {
      const cache = new ProfilerCache();
      const updateRenders: readonly PhaseType[] = ["update", "update"];
      const compute = vi.fn(() => updateRenders);

      const result = cache.getPhaseCache("update", compute);

      expect(result).toBe(updateRenders);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should work for nested-update phase", () => {
      const cache = new ProfilerCache();
      const nestedRenders: readonly PhaseType[] = ["nested-update"];
      const compute = vi.fn(() => nestedRenders);

      const result = cache.getPhaseCache("nested-update", compute);

      expect(result).toBe(nestedRenders);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should cache results separately for each phase", () => {
      const cache = new ProfilerCache();
      const mountCompute = vi.fn(() => ["mount"] as const);
      const updateCompute = vi.fn(() => ["update"] as const);

      cache.getPhaseCache("mount", mountCompute);
      cache.getPhaseCache("update", updateCompute);
      cache.getPhaseCache("mount", mountCompute); // Should use cache
      cache.getPhaseCache("update", updateCompute); // Should use cache

      expect(mountCompute).toHaveBeenCalledTimes(1);
      expect(updateCompute).toHaveBeenCalledTimes(1);
    });

    it("should recompute after invalidate", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => ["mount"] as const);

      cache.getPhaseCache("mount", compute);

      expect(compute).toHaveBeenCalledTimes(1);

      cache.invalidate();
      cache.getPhaseCache("mount", compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getHasMounted", () => {
    it("should cache boolean result", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => true);

      const result1 = cache.getHasMounted(compute);
      const result2 = cache.getHasMounted(compute);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should cache false result", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => false);

      const result1 = cache.getHasMounted(compute);
      const result2 = cache.getHasMounted(compute);

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should recompute after invalidate", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => true);

      cache.getHasMounted(compute);

      expect(compute).toHaveBeenCalledTimes(1);

      cache.invalidate();
      cache.getHasMounted(compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });
  });

  describe("invalidate", () => {
    it("should clear all caches", () => {
      const cache = new ProfilerCache();
      const historyCompute = vi.fn(() => ["mount"] as const);
      const phaseCompute = vi.fn(() => ["mount"] as const);
      const hasMountedCompute = vi.fn(() => true);

      // Populate all caches
      cache.getFrozenHistory(historyCompute);
      cache.getPhaseCache("mount", phaseCompute);
      cache.getHasMounted(hasMountedCompute);

      expect(historyCompute).toHaveBeenCalledTimes(1);
      expect(phaseCompute).toHaveBeenCalledTimes(1);
      expect(hasMountedCompute).toHaveBeenCalledTimes(1);

      // Invalidate and verify recomputation
      cache.invalidate();

      cache.getFrozenHistory(historyCompute);
      cache.getPhaseCache("mount", phaseCompute);
      cache.getHasMounted(hasMountedCompute);

      expect(historyCompute).toHaveBeenCalledTimes(2);
      expect(phaseCompute).toHaveBeenCalledTimes(2);
      expect(hasMountedCompute).toHaveBeenCalledTimes(2);
    });
  });

  describe("clear", () => {
    it("should fully reset state by calling invalidate", () => {
      const cache = new ProfilerCache();
      const historyCompute = vi.fn(() => ["mount"] as const);
      const phaseCompute = vi.fn(() => ["update"] as const);
      const hasMountedCompute = vi.fn(() => true);

      // Populate all caches
      cache.getFrozenHistory(historyCompute);
      cache.getPhaseCache("update", phaseCompute);
      cache.getHasMounted(hasMountedCompute);

      expect(historyCompute).toHaveBeenCalledTimes(1);
      expect(phaseCompute).toHaveBeenCalledTimes(1);
      expect(hasMountedCompute).toHaveBeenCalledTimes(1);

      // Clear and verify recomputation
      cache.clear();

      cache.getFrozenHistory(historyCompute);
      cache.getPhaseCache("update", phaseCompute);
      cache.getHasMounted(hasMountedCompute);

      expect(historyCompute).toHaveBeenCalledTimes(2);
      expect(phaseCompute).toHaveBeenCalledTimes(2);
      expect(hasMountedCompute).toHaveBeenCalledTimes(2);
    });
  });

  describe("lazy evaluation", () => {
    it("should not call compute function until cache is accessed", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => ["mount"] as const);

      // Create cache but don't access it
      expect(compute).not.toHaveBeenCalled();

      // Access cache
      cache.getFrozenHistory(compute);

      expect(compute).toHaveBeenCalledTimes(1);
    });
  });

  describe("multiple phase caches", () => {
    it("should maintain separate caches for all three phases simultaneously", () => {
      const cache = new ProfilerCache();
      const mountCompute = vi.fn(() => ["mount"] as const);
      const updateCompute = vi.fn(() => ["update"] as const);
      const nestedCompute = vi.fn(() => ["nested-update"] as const);

      // Populate all phase caches
      const mountResult1 = cache.getPhaseCache("mount", mountCompute);
      const updateResult1 = cache.getPhaseCache("update", updateCompute);
      const nestedResult1 = cache.getPhaseCache("nested-update", nestedCompute);

      // Access again - should use cache
      const mountResult2 = cache.getPhaseCache("mount", mountCompute);
      const updateResult2 = cache.getPhaseCache("update", updateCompute);
      const nestedResult2 = cache.getPhaseCache("nested-update", nestedCompute);

      // Verify each computed only once
      expect(mountCompute).toHaveBeenCalledTimes(1);
      expect(updateCompute).toHaveBeenCalledTimes(1);
      expect(nestedCompute).toHaveBeenCalledTimes(1);

      // Verify same references
      expect(mountResult1).toBe(mountResult2);
      expect(updateResult1).toBe(updateResult2);
      expect(nestedResult1).toBe(nestedResult2);
    });
  });
});
