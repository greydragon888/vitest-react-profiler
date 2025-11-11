/**
 * Integration tests for ProfilerAPI cache metrics tracking
 *
 * These tests verify that ProfilerAPI properly records cache hits and misses
 * for the closure cache optimization. This is critical for monitoring
 * performance and verifying the caching strategy works as intended.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { ProfilerAPI } from "@/profiler/api/ProfilerAPI";
import { cacheMetrics } from "@/profiler/core/CacheMetrics";
import { ProfilerData } from "@/profiler/core/ProfilerData";
import { ProfilerStorage } from "@/profiler/core/ProfilerStorage";

import type { AnyComponentType } from "@/types";

describe("ProfilerAPI - Cache Metrics Integration", () => {
  beforeEach(() => {
    cacheMetrics.reset();
  });

  describe("Closure Cache Miss Tracking", () => {
    it("should record cache miss on first getRenderCount access", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const getRenderCount = api.createGetRenderCount(Component);

      // First call = cache miss
      getRenderCount();

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(0);
    });

    it("should record cache miss on first getLastRender access", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const getLastRender = api.createGetLastRender(Component);

      getLastRender();

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(0);
    });

    it("should record cache miss on first getRenderAt access", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const getRenderAt = api.createGetRenderAt(Component);

      getRenderAt(0);

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(0);
    });

    it("should record cache miss on first getRendersByPhase access", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const getRendersByPhase = api.createGetRendersByPhase(Component);

      getRendersByPhase("mount");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(0);
    });

    it("should record cache miss on first hasMounted access", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const hasMounted = api.createHasMounted(Component);

      hasMounted();

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(0);
    });
  });

  describe("Closure Cache Hit Tracking", () => {
    it("should record cache hit on subsequent getRenderCount accesses", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      // Set up some data
      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const getRenderCount = api.createGetRenderCount(Component);

      cacheMetrics.reset();

      // First call = miss
      getRenderCount();

      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(1);
      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(0);

      // Second call = hit
      getRenderCount();

      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(1);
      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(1);

      // Third call = another hit
      getRenderCount();

      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(2);
      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(1);
    });

    it("should record cache hit on subsequent getLastRender accesses", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const getLastRender = api.createGetLastRender(Component);

      cacheMetrics.reset();

      // First call = miss
      getLastRender();

      // Second call = hit
      getLastRender();

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(1);
      expect(metrics.closureCache.misses).toBe(1);
    });

    it("should record cache hit on subsequent getRenderAt accesses", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const getRenderAt = api.createGetRenderAt(Component);

      cacheMetrics.reset();

      // First call = miss
      getRenderAt(0);

      // Second call = hit
      getRenderAt(0);

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(1);
      expect(metrics.closureCache.misses).toBe(1);
    });

    it("should record cache hit on subsequent getRendersByPhase accesses", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const getRendersByPhase = api.createGetRendersByPhase(Component);

      cacheMetrics.reset();

      // First call = miss
      getRendersByPhase("mount");

      // Second call = hit
      getRendersByPhase("mount");

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(1);
      expect(metrics.closureCache.misses).toBe(1);
    });

    it("should record cache hit on subsequent hasMounted accesses", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const hasMounted = api.createHasMounted(Component);

      cacheMetrics.reset();

      // First call = miss
      hasMounted();

      // Second call = hit
      hasMounted();

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.hits).toBe(1);
      expect(metrics.closureCache.misses).toBe(1);
    });
  });

  describe("Closure Cache with Multiple Methods", () => {
    it("should record cache metrics independently for each method", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      data.addRender("update");
      storage.set(Component, data);

      const methods = api.createAllMethods(Component);

      cacheMetrics.reset();

      // Each method's first call = miss
      methods.getRenderCount(); // miss 1
      methods.getLastRender(); // miss 2
      methods.getRendersByPhase("mount"); // miss 3
      methods.hasMounted(); // miss 4

      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(4);
      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(0);

      // Each method's second call = hit
      methods.getRenderCount(); // hit 1
      methods.getLastRender(); // hit 2
      methods.getRendersByPhase("mount"); // hit 3
      methods.hasMounted(); // hit 4

      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(4);
      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(4);
    });

    it("should track cache metrics across multiple method invocations", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const methods = api.createAllMethods(Component);

      cacheMetrics.reset();

      // Multiple calls to different methods
      methods.getRenderCount(); // miss 1
      methods.getRenderCount(); // hit 1
      methods.getRenderCount(); // hit 2

      methods.getLastRender(); // miss 2
      methods.getLastRender(); // hit 3

      methods.hasMounted(); // miss 3
      methods.hasMounted(); // hit 4
      methods.hasMounted(); // hit 5

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(3);
      expect(metrics.closureCache.hits).toBe(5);
    });
  });

  describe("Closure Cache with No ProfilerData", () => {
    it("should still record miss even when no ProfilerData exists", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      // No data set for Component

      const getRenderCount = api.createGetRenderCount(Component);

      cacheMetrics.reset();

      // First call = miss (even though data doesn't exist)
      getRenderCount();

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(1);
      expect(metrics.closureCache.hits).toBe(0);

      // Second call = still miss (no data to cache)
      getRenderCount();

      expect(metrics.closureCache.misses).toBe(2);
      expect(metrics.closureCache.hits).toBe(0);
    });
  });

  describe("Realistic Integration Scenario", () => {
    it("should track realistic cache usage pattern", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      storage.set(Component, data);

      const methods = api.createAllMethods(Component);

      cacheMetrics.reset();

      // Initial render - all misses
      methods.getRenderCount(); // miss 1
      methods.hasMounted(); // miss 2

      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(2);

      // Simulate multiple reads during test - hits
      methods.getRenderCount(); // hit 1
      methods.getRenderCount(); // hit 2
      methods.hasMounted(); // hit 3

      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(3);

      // Add new render
      data.addRender("mount");

      // After mutation, cache is stale but closure cache still works
      methods.getRenderCount(); // hit 4
      methods.getLastRender(); // miss 3

      const metrics = cacheMetrics.getMetrics();

      expect(metrics.closureCache.misses).toBe(3);
      expect(metrics.closureCache.hits).toBe(4);
    });
  });

  describe("Async Methods Cache Tracking", () => {
    it("should track cache metrics for createGetRenderHistory (used in async utils)", () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      // createGetRenderHistory is used internally by async utils
      const getRenderHistory = api.createGetRenderHistory(Component);

      cacheMetrics.reset();

      // First call = miss
      getRenderHistory();

      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(1);
      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(0);

      // Second call = hit
      getRenderHistory();

      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(1);
      expect(cacheMetrics.getMetrics().closureCache.misses).toBe(1);

      // Third call = another hit
      getRenderHistory();

      expect(cacheMetrics.getMetrics().closureCache.hits).toBe(2);
    });

    it("should track cache metrics inside waitForNextRender", async () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      storage.set(Component, data);

      const waitForNextRender = api.createWaitForNextRender(Component);

      cacheMetrics.reset();

      // Start waiting for next render
      const waitPromise = waitForNextRender({ timeout: 100 });

      // Trigger render after short delay
      setTimeout(() => {
        data.addRender("mount");
      }, 20);

      await waitPromise;

      const metrics = cacheMetrics.getMetrics();

      // Should have recorded at least one cache miss on first call
      expect(metrics.closureCache.misses).toBe(1);
    });

    it("should track multiple cache accesses in waitForNextRender event handler", async () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      data.addRender("mount");
      storage.set(Component, data);

      const waitForNextRender = api.createWaitForNextRender(Component);

      cacheMetrics.reset();

      // Start waiting for next render
      const waitPromise = waitForNextRender({ timeout: 100 });

      // Trigger another render
      setTimeout(() => {
        data.addRender("update");
      }, 20);

      const result = await waitPromise;

      // Verify result contains expected data
      expect(result.phase).toBe("update");
      expect(result.count).toBe(2);

      const metrics = cacheMetrics.getMetrics();

      // The first call should record a miss
      expect(metrics.closureCache.misses).toBe(1);
    });

    it("should track cache hits on repeated waitForNextRender calls", async () => {
      const storage = new ProfilerStorage();
      const api = new ProfilerAPI(storage);
      const Component = (() => null) as AnyComponentType;

      const data = new ProfilerData();

      storage.set(Component, data);

      const waitForNextRender = api.createWaitForNextRender(Component);

      cacheMetrics.reset();

      // First waitForNextRender - should be a miss
      const wait1 = waitForNextRender({ timeout: 100 });

      setTimeout(() => {
        data.addRender("mount");
      }, 20);

      await wait1;

      const metricsAfterFirst = cacheMetrics.getMetrics();

      expect(metricsAfterFirst.closureCache.misses).toBe(1);
      expect(metricsAfterFirst.closureCache.hits).toBe(0);

      // Second waitForNextRender - should be a hit
      const wait2 = waitForNextRender({ timeout: 100 });

      setTimeout(() => {
        data.addRender("update");
      }, 20);

      await wait2;

      const metricsAfterSecond = cacheMetrics.getMetrics();

      // Should have one miss and one hit
      expect(metricsAfterSecond.closureCache.misses).toBe(1);
      expect(metricsAfterSecond.closureCache.hits).toBe(1);
    });
  });
});
