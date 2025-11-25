import { describe, expect, it, vi, expectTypeOf } from "vitest";

import {
  createMockCache,
  createMockEvents,
  createNoOpCache,
  createSpyCache,
  createSpyEvents,
} from "./mocks";

/**
 * Tests for mock utilities
 *
 * These tests verify that helper functions for creating mocks work correctly.
 */
describe("Mock utilities", () => {
  describe("createMockCache()", () => {
    it("should create a mock cache with all methods as Vitest mocks", () => {
      const mockCache = createMockCache();

      const { getPhaseCache, invalidate, clear } = mockCache;

      expect(vi.isMockFunction(getPhaseCache)).toBe(true);
      expect(vi.isMockFunction(invalidate)).toBe(true);
      expect(vi.isMockFunction(clear)).toBe(true);
    });

    it("should call compute function in getPhaseCache", () => {
      const mockCache = createMockCache();
      const compute = vi.fn(() => ["mount"] as const);

      const result = mockCache.getPhaseCache("mount", compute);

      expect(compute).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(["mount"]);
    });

    it("should allow spying on method calls", () => {
      const mockCache = createMockCache();

      mockCache.invalidate("mount");
      mockCache.invalidate("update");

      const { invalidate } = mockCache;

      expect(invalidate).toHaveBeenCalledTimes(2);
      expect(invalidate).toHaveBeenNthCalledWith(1, "mount");
      expect(invalidate).toHaveBeenNthCalledWith(2, "update");
    });
  });

  describe("createSpyCache()", () => {
    it("should expose spy methods for testing", () => {
      const spyCache = createSpyCache();
      const { _getPhaseCacheSpy, _invalidateSpy, _clearSpy } = spyCache;

      expect(vi.isMockFunction(_getPhaseCacheSpy)).toBe(true);
      expect(vi.isMockFunction(_invalidateSpy)).toBe(true);
      expect(vi.isMockFunction(_clearSpy)).toBe(true);
    });

    it("should actually cache phase cache (same object returned)", () => {
      const spyCache = createSpyCache();
      const compute = vi.fn(() => ["mount"] as const);

      // First call - cache miss
      const result1 = spyCache.getPhaseCache("mount", compute);

      expect(compute).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = spyCache.getPhaseCache("mount", compute);

      expect(compute).toHaveBeenCalledTimes(1); // Not called again!

      expect(result1).toBe(result2); // Same object
    });

    it("should invalidate only specific phase cache", () => {
      const spyCache = createSpyCache();
      const mountCompute = vi.fn(() => ["mount"] as const);
      const updateCompute = vi.fn(() => ["update"] as const);

      // Cache both phases
      spyCache.getPhaseCache("mount", mountCompute);
      spyCache.getPhaseCache("update", updateCompute);

      expect(mountCompute).toHaveBeenCalledTimes(1);
      expect(updateCompute).toHaveBeenCalledTimes(1);

      // Invalidate only mount
      spyCache.invalidate("mount");

      // Mount should recompute, update should use cache
      spyCache.getPhaseCache("mount", mountCompute);
      spyCache.getPhaseCache("update", updateCompute);

      expect(mountCompute).toHaveBeenCalledTimes(2); // Recomputed
      expect(updateCompute).toHaveBeenCalledTimes(1); // Still cached
    });

    it("should clear all caches", () => {
      const spyCache = createSpyCache();
      const compute1 = vi.fn(() => ["mount"] as const);
      const compute2 = vi.fn(() => ["update"] as const);

      spyCache.getPhaseCache("mount", compute1);
      spyCache.getPhaseCache("update", compute2);

      // Clear all
      spyCache.clear();

      // Both should recompute
      spyCache.getPhaseCache("mount", compute1);
      spyCache.getPhaseCache("update", compute2);

      expect(compute1).toHaveBeenCalledTimes(2);
      expect(compute2).toHaveBeenCalledTimes(2);
    });

    it("should allow spying on method calls", () => {
      const spyCache = createSpyCache();

      spyCache.invalidate("mount");

      const { _invalidateSpy } = spyCache;

      expect(_invalidateSpy).toHaveBeenCalledTimes(1);
      expect(_invalidateSpy).toHaveBeenCalledWith("mount");
    });
  });

  describe("createNoOpCache()", () => {
    it("should never cache phase cache (always recomputes)", () => {
      const noOpCache = createNoOpCache();
      const compute = vi.fn(() => ["mount"] as const);

      const result1 = noOpCache.getPhaseCache("mount", compute);
      const result2 = noOpCache.getPhaseCache("mount", compute);

      // Both calls compute
      expect(compute).toHaveBeenCalledTimes(2);

      // Different objects
      expect(result1).not.toBe(result2);
      // Same content
      expect(result1).toStrictEqual(result2);
    });

    it("should have no-op invalidate and clear", () => {
      const noOpCache = createNoOpCache();

      // Should not throw
      expect(() => {
        noOpCache.invalidate("mount");
      }).not.toThrow();
      expect(() => {
        noOpCache.clear();
      }).not.toThrow();
    });
  });

  describe("createMockEvents()", () => {
    it("should create mock events with all methods as Vitest mocks", () => {
      const mockEvents = createMockEvents();

      const { subscribe, emit, clear, hasListeners } = mockEvents;

      expect(vi.isMockFunction(subscribe)).toBe(true);
      expect(vi.isMockFunction(emit)).toBe(true);
      expect(vi.isMockFunction(clear)).toBe(true);
      expect(vi.isMockFunction(hasListeners)).toBe(true);
    });

    it("should default to hasListeners = false", () => {
      const mockEvents = createMockEvents();

      expect(mockEvents.hasListeners()).toBe(false);
    });

    it("should accept hasListeners option", () => {
      const mockEvents = createMockEvents({ hasListeners: true });

      expect(mockEvents.hasListeners()).toBe(true);
    });

    it("should return no-op unsubscribe function", () => {
      const mockEvents = createMockEvents();
      const listener = vi.fn();

      const unsubscribe = mockEvents.subscribe(listener);

      // Should be a function
      expectTypeOf(unsubscribe).toBeFunction();

      // Should not throw
      expect(() => {
        unsubscribe();
      }).not.toThrow();
    });

    it("should allow spying on emit calls", () => {
      const mockEvents = createMockEvents();

      mockEvents.emit({
        count: 1,
        phase: "mount",
        get history() {
          return Object.freeze(["mount"] as const);
        },
      });

      const { emit } = mockEvents;

      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          phase: "mount",
        }),
      );
    });
  });

  describe("createSpyEvents()", () => {
    it("should expose spy methods for testing", () => {
      const spyEvents = createSpyEvents();
      const { _subscribeSpy, _emitSpy, _clearSpy, _hasListenersSpy } =
        spyEvents;

      expect(vi.isMockFunction(_subscribeSpy)).toBe(true);
      expect(vi.isMockFunction(_emitSpy)).toBe(true);
      expect(vi.isMockFunction(_clearSpy)).toBe(true);
      expect(vi.isMockFunction(_hasListenersSpy)).toBe(true);
    });

    it("should actually call listeners on emit", () => {
      const spyEvents = createSpyEvents();
      const listener = vi.fn();

      spyEvents.subscribe(listener);

      const info = {
        count: 1,
        phase: "mount" as const,
        get history() {
          return Object.freeze(["mount"] as const);
        },
      };

      spyEvents.emit(info);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(info);
    });

    it("should return working unsubscribe function", () => {
      const spyEvents = createSpyEvents();
      const listener = vi.fn();

      const unsubscribe = spyEvents.subscribe(listener);

      // Emit before unsubscribe
      spyEvents.emit({
        count: 1,
        phase: "mount",
        get history() {
          return Object.freeze(["mount"] as const);
        },
      });

      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Emit after unsubscribe
      spyEvents.emit({
        count: 2,
        phase: "update",
        get history() {
          return Object.freeze(["mount", "update"] as const);
        },
      });

      // Listener not called again
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should report hasListeners correctly", () => {
      const spyEvents = createSpyEvents();

      expect(spyEvents.hasListeners()).toBe(false);

      const unsubscribe = spyEvents.subscribe(() => {});

      expect(spyEvents.hasListeners()).toBe(true);

      unsubscribe();

      expect(spyEvents.hasListeners()).toBe(false);
    });

    it("should clear all listeners", () => {
      const spyEvents = createSpyEvents();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      spyEvents.subscribe(listener1);
      spyEvents.subscribe(listener2);

      expect(spyEvents.hasListeners()).toBe(true);

      spyEvents.clear();

      expect(spyEvents.hasListeners()).toBe(false);

      // Emit after clear
      spyEvents.emit({
        count: 1,
        phase: "mount",
        get history() {
          return Object.freeze(["mount"] as const);
        },
      });

      // Listeners not called
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it("should allow spying on subscribe calls", () => {
      const spyEvents = createSpyEvents();
      const listener = vi.fn();

      spyEvents.subscribe(listener);

      const { _subscribeSpy } = spyEvents;

      expect(_subscribeSpy).toHaveBeenCalledTimes(1);
      expect(_subscribeSpy).toHaveBeenCalledWith(listener);
    });

    it("should call multiple listeners in order", () => {
      const spyEvents = createSpyEvents();
      const callOrder: number[] = [];

      const listener1 = vi.fn(() => callOrder.push(1));
      const listener2 = vi.fn(() => callOrder.push(2));
      const listener3 = vi.fn(() => callOrder.push(3));

      spyEvents.subscribe(listener1);
      spyEvents.subscribe(listener2);
      spyEvents.subscribe(listener3);

      spyEvents.emit({
        count: 1,
        phase: "mount",
        get history() {
          return Object.freeze(["mount"] as const);
        },
      });

      expect(callOrder).toStrictEqual([1, 2, 3]);
    });
  });
});
