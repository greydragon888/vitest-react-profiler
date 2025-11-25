import { describe, it, expect, vi } from "vitest";

import { ProfilerCache } from "../../src/profiler/core/ProfilerCache";

import type { PhaseType } from "../../src/types";

describe("ProfilerCache", () => {
  describe("getPhaseCache", () => {
    it("should work for mount phase", () => {
      const cache = new ProfilerCache();
      const mountRenders: readonly PhaseType[] = ["mount"];
      const compute = vi.fn(() => mountRenders);

      const result = cache.getPhaseCache("mount", compute);

      // Result is pooled frozen array (may differ from input reference)
      expect(result).toStrictEqual(["mount"]);
      expect(Object.isFrozen(result)).toBe(true);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should work for update phase", () => {
      const cache = new ProfilerCache();
      const updateRenders: readonly PhaseType[] = ["update", "update"];
      const compute = vi.fn(() => updateRenders);

      const result = cache.getPhaseCache("update", compute);

      // Result is pooled frozen array (may differ from input reference)
      expect(result).toStrictEqual(["update", "update"]);
      expect(Object.isFrozen(result)).toBe(true);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it("should work for nested-update phase", () => {
      const cache = new ProfilerCache();
      const nestedRenders: readonly PhaseType[] = ["nested-update"];
      const compute = vi.fn(() => nestedRenders);

      const result = cache.getPhaseCache("nested-update", compute);

      // Result is pooled frozen array (may differ from input reference)
      expect(result).toStrictEqual(["nested-update"]);
      expect(Object.isFrozen(result)).toBe(true);
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

      cache.invalidate("mount");
      cache.getPhaseCache("mount", compute);

      expect(compute).toHaveBeenCalledTimes(2);
    });
  });

  // getHasMounted removed in v1.7.0 - now uses immutable flag in ProfilerData

  describe("invalidate", () => {
    it("should clear phase cache for invalidated phase", () => {
      const cache = new ProfilerCache();
      const phaseCompute = vi.fn(() => ["mount"] as const);

      // Populate phase cache
      cache.getPhaseCache("mount", phaseCompute);

      expect(phaseCompute).toHaveBeenCalledTimes(1);

      // Invalidate and verify recomputation
      cache.invalidate("mount");

      cache.getPhaseCache("mount", phaseCompute);

      expect(phaseCompute).toHaveBeenCalledTimes(2);
    });
  });

  describe("clear", () => {
    it("should fully reset state", () => {
      const cache = new ProfilerCache();
      const phaseCompute = vi.fn(() => ["update"] as const);

      // Populate phase cache
      cache.getPhaseCache("update", phaseCompute);

      expect(phaseCompute).toHaveBeenCalledTimes(1);

      // Clear and verify recomputation
      cache.clear();

      cache.getPhaseCache("update", phaseCompute);

      expect(phaseCompute).toHaveBeenCalledTimes(2);
    });
  });

  describe("lazy evaluation", () => {
    it("should not call compute function until cache is accessed", () => {
      const cache = new ProfilerCache();
      const compute = vi.fn(() => ["mount"] as const);

      // Create cache but don't access it
      expect(compute).not.toHaveBeenCalled();

      // Access cache
      cache.getPhaseCache("mount", compute);

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
