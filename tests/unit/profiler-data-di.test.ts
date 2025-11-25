import { describe, expect, it, vi } from "vitest";

import { ProfilerData } from "@/profiler/core/ProfilerData";

import {
  createMockCache,
  createMockEvents,
  createNoOpCache,
} from "../helpers/mocks";

/**
 * Tests demonstrating Dependency Injection capabilities
 * introduced in v1.7.0
 *
 * These tests show how DI improves:
 * - Testability (easy mocking)
 * - Flexibility (custom implementations)
 * - Isolation (no global dependencies)
 */
describe("ProfilerData with Dependency Injection", () => {
  describe("Cache injection", () => {
    it("should use injected cache instead of creating its own", () => {
      const mockCache = createMockCache();

      const data = new ProfilerData(mockCache);

      data.addRender("mount");

      // Verify cache was used

      const { invalidate } = mockCache;

      expect(invalidate).toHaveBeenCalledWith("mount");
      expect(invalidate).toHaveBeenCalledTimes(1);
    });

    it("should call cache.getPhaseCache on getRendersByPhase()", () => {
      const mockCache = createMockCache();

      const data = new ProfilerData(mockCache);

      data.addRender("mount");
      data.addRender("update");

      data.getRendersByPhase("mount");

      const { getPhaseCache } = mockCache;

      expect(getPhaseCache).toHaveBeenCalledWith("mount", expect.any(Function));
    });

    it("should call cache.clear() on clear()", () => {
      const mockCache = createMockCache();

      const data = new ProfilerData(mockCache);

      data.clear();

      const { clear } = mockCache;

      expect(clear).toHaveBeenCalledTimes(1);
    });
  });

  describe("Events factory injection", () => {
    it("should use injected events factory", () => {
      let factoryCallCount = 0;

      const eventsFactory = vi.fn(() => {
        factoryCallCount++;

        return {
          subscribe: vi.fn(() => () => {}),
          emit: vi.fn(),
          clear: vi.fn(),
          hasListeners: vi.fn(() => false),
        };
      });

      const data = new ProfilerData(undefined, eventsFactory);

      // Events not created yet
      expect(factoryCallCount).toBe(0);
      expect(eventsFactory).not.toHaveBeenCalled();

      // Trigger events creation
      data.getEvents();

      // Factory was called
      expect(factoryCallCount).toBe(1);
      expect(eventsFactory).toHaveBeenCalledTimes(1);
    });

    it("should create events lazily only once", () => {
      const eventsFactory = vi.fn(() => ({
        subscribe: vi.fn(() => () => {}),
        emit: vi.fn(),
        clear: vi.fn(),
        hasListeners: vi.fn(() => false),
      }));

      const data = new ProfilerData(undefined, eventsFactory);

      // Call getEvents() multiple times
      data.getEvents();
      data.getEvents();
      data.getEvents();

      // Factory called only once (lazy initialization)
      expect(eventsFactory).toHaveBeenCalledTimes(1);
    });

    it("should not emit if no listeners", () => {
      const mockEvents = createMockEvents(); // Default: hasListeners = false

      const data = new ProfilerData(undefined, () => mockEvents);

      // Create events
      data.getEvents();

      // Add render
      data.addRender("mount");

      // emit() should NOT be called

      const { emit } = mockEvents;

      expect(emit).not.toHaveBeenCalled();
    });

    it("should emit if there are listeners", () => {
      const mockEvents = createMockEvents({ hasListeners: true });

      const data = new ProfilerData(undefined, () => mockEvents);

      // Create events
      data.getEvents();

      // Add render
      data.addRender("mount");

      // emit() should be called

      const { emit } = mockEvents;

      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1,
          phase: "mount",
        }),
      );
    });

    it("should call events.clear() on clear()", () => {
      const mockEvents = createMockEvents();

      const data = new ProfilerData(undefined, () => mockEvents);

      // Create events
      data.getEvents();

      // Clear data
      data.clear();

      // events.clear() should be called

      const { clear } = mockEvents;

      expect(clear).toHaveBeenCalledTimes(1);
    });
  });

  describe("Backward compatibility", () => {
    it("should work without any parameters (default behavior)", () => {
      // This is the existing usage - must continue to work
      const data = new ProfilerData();

      data.addRender("mount");
      data.addRender("update");

      expect(data.getRenderCount()).toBe(2);
      expect(data.getHistory()).toStrictEqual(["mount", "update"]);
    });

    it("should work with only cache parameter", () => {
      const mockCache = createMockCache();

      const data = new ProfilerData(mockCache);

      data.addRender("mount");

      expect(data.getRenderCount()).toBe(1);

      expect(mockCache.invalidate).toHaveBeenCalled();
    });

    it("should work with both cache and events factory", () => {
      const mockCache = createMockCache();
      const mockEvents = createMockEvents();

      const data = new ProfilerData(mockCache, () => mockEvents);

      data.addRender("mount");

      expect(mockCache.invalidate).toHaveBeenCalled();
      expect(data.getRenderCount()).toBe(1);
    });
  });

  describe("Custom implementations", () => {
    it("should allow custom cache that never caches (for debugging)", () => {
      const noOpCache = createNoOpCache();

      const data = new ProfilerData(noOpCache);

      data.addRender("mount");

      const history1 = data.getHistory();
      const history2 = data.getHistory();

      // Different objects (no caching)
      expect(history1).not.toBe(history2);

      // But same content
      expect(history1).toStrictEqual(history2);
    });
  });
});
