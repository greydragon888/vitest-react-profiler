import { describe, it, expect, beforeEach, expectTypeOf } from "vitest";

import { ProfilerAPI } from "@/profiler/api/ProfilerAPI.ts";
import { ProfilerStorage } from "@/profiler/core/ProfilerStorage.ts";

import type { PhaseType } from "@/types.ts";
import type { ComponentType } from "react";

describe("ProfilerAPI", () => {
  let storage: ProfilerStorage;
  let api: ProfilerAPI;

  // Helper function to create a dummy component
  const createComponent = (name: string): ComponentType<any> => {
    const Component = () => null;

    Component.displayName = name;

    return Component;
  };

  beforeEach(() => {
    storage = new ProfilerStorage();
    api = new ProfilerAPI(storage);
  });

  describe("constructor", () => {
    it("should initialize with storage", () => {
      const api = new ProfilerAPI(storage);

      expect(api).toBeInstanceOf(ProfilerAPI);
    });
  });

  describe("createGetRenderCount", () => {
    it("should return 0 when no data exists", () => {
      const Component = createComponent("TestComponent");
      const getRenderCount = api.createGetRenderCount(Component);

      expect(getRenderCount()).toBe(0);
    });

    it("should return correct count when data exists", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("mount");
      data.addRender("update");
      data.addRender("update");

      const getRenderCount = api.createGetRenderCount(Component);

      expect(getRenderCount()).toBe(3);
    });

    it("should update when new renders are added", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const getRenderCount = api.createGetRenderCount(Component);

      expect(getRenderCount()).toBe(0);

      data.addRender("mount");

      expect(getRenderCount()).toBe(1);

      data.addRender("update");

      expect(getRenderCount()).toBe(2);
    });

    it("should create separate closures for different components", () => {
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");

      storage.getOrCreate(Component1).addRender("mount");
      storage.getOrCreate(Component2).addRender("mount");
      storage.getOrCreate(Component2).addRender("update");

      const getRenderCount1 = api.createGetRenderCount(Component1);
      const getRenderCount2 = api.createGetRenderCount(Component2);

      expect(getRenderCount1()).toBe(1);
      expect(getRenderCount2()).toBe(2);
    });
  });

  describe("createGetRenderHistory", () => {
    it("should return empty array when no data exists", () => {
      const Component = createComponent("TestComponent");
      const getRenderHistory = api.createGetRenderHistory(Component);

      expect(getRenderHistory()).toStrictEqual([]);
    });

    it("should return render history when data exists", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const render1: PhaseType = "mount";
      const render2: PhaseType = "update";

      data.addRender(render1);
      data.addRender(render2);

      const getRenderHistory = api.createGetRenderHistory(Component);
      const history = getRenderHistory();

      expect(history).toStrictEqual([render1, render2]);
    });

    it("should return immutable array", () => {
      const Component = createComponent("TestComponent");

      storage.getOrCreate(Component).addRender("mount");

      const getRenderHistory = api.createGetRenderHistory(Component);
      const history = getRenderHistory();

      expect(Object.isFrozen(history)).toBe(true);
    });

    it("should return updated history after new renders", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const getRenderHistory = api.createGetRenderHistory(Component);

      expect(getRenderHistory()).toHaveLength(0);

      data.addRender("mount");

      expect(getRenderHistory()).toHaveLength(1);

      data.addRender("update");

      expect(getRenderHistory()).toHaveLength(2);
    });
  });

  describe("createGetLastRender", () => {
    it("should return undefined when no data exists", () => {
      const Component = createComponent("TestComponent");
      const getLastRender = api.createGetLastRender(Component);

      expect(getLastRender()).toBeUndefined();
    });

    it("should return undefined when history is empty", () => {
      const Component = createComponent("TestComponent");

      storage.getOrCreate(Component); // Create data but don't add renders

      const getLastRender = api.createGetLastRender(Component);

      expect(getLastRender()).toBeUndefined();
    });

    it("should return last render when data exists", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const render1: PhaseType = "mount";
      const render2: PhaseType = "update";
      const render3: PhaseType = "update";

      data.addRender(render1);
      data.addRender(render2);
      data.addRender(render3);

      const getLastRender = api.createGetLastRender(Component);

      expect(getLastRender()).toStrictEqual(render3);
    });

    it("should update when new renders are added", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const getLastRender = api.createGetLastRender(Component);

      const render1: PhaseType = "mount";

      data.addRender(render1);

      expect(getLastRender()).toStrictEqual(render1);

      const render2: PhaseType = "update";

      data.addRender(render2);

      expect(getLastRender()).toStrictEqual(render2);
    });
  });

  describe("createGetRenderAt", () => {
    it("should return undefined when no data exists", () => {
      const Component = createComponent("TestComponent");
      const getRenderAt = api.createGetRenderAt(Component);

      expect(getRenderAt(0)).toBeUndefined();
      expect(getRenderAt(5)).toBeUndefined();
    });

    it("should return undefined when index is out of range", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("mount");

      const getRenderAt = api.createGetRenderAt(Component);

      expect(getRenderAt(1)).toBeUndefined();
      expect(getRenderAt(10)).toBeUndefined();
      expect(getRenderAt(-1)).toBeUndefined();
    });

    it("should return render at specific index", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const render0: PhaseType = "mount";
      const render1: PhaseType = "update";
      const render2: PhaseType = "update";

      data.addRender(render0);
      data.addRender(render1);
      data.addRender(render2);

      const getRenderAt = api.createGetRenderAt(Component);

      expect(getRenderAt(0)).toStrictEqual(render0);
      expect(getRenderAt(1)).toStrictEqual(render1);
      expect(getRenderAt(2)).toStrictEqual(render2);
    });
  });

  describe("createGetRendersByPhase", () => {
    it("should return empty array when no data exists", () => {
      const Component = createComponent("TestComponent");
      const getRendersByPhase = api.createGetRendersByPhase(Component);

      expect(getRendersByPhase("mount")).toStrictEqual([]);
      expect(getRendersByPhase("update")).toStrictEqual([]);
      expect(getRendersByPhase("nested-update")).toStrictEqual([]);
    });

    it("should return empty array when no renders match phase", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("update");

      const getRendersByPhase = api.createGetRendersByPhase(Component);

      expect(getRendersByPhase("mount")).toStrictEqual([]);
    });

    it("should filter renders by mount phase", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const mount1: PhaseType = "mount";
      const update1: PhaseType = "update";
      const mount2: PhaseType = "mount";

      data.addRender(mount1);
      data.addRender(update1);
      data.addRender(mount2);

      const getRendersByPhase = api.createGetRendersByPhase(Component);

      expect(getRendersByPhase("mount")).toStrictEqual([mount1, mount2]);
    });

    it("should filter renders by update phase", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const mount: PhaseType = "mount";
      const update1: PhaseType = "update";
      const update2: PhaseType = "update";

      data.addRender(mount);
      data.addRender(update1);
      data.addRender(update2);

      const getRendersByPhase = api.createGetRendersByPhase(Component);

      expect(getRendersByPhase("update")).toStrictEqual([update1, update2]);
    });

    it("should filter renders by nested-update phase", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const mount: PhaseType = "mount";
      const nested: PhaseType = "nested-update";

      data.addRender(mount);
      data.addRender(nested);

      const getRendersByPhase = api.createGetRendersByPhase(Component);

      expect(getRendersByPhase("nested-update")).toStrictEqual([nested]);
    });

    it("should return frozen array", () => {
      const Component = createComponent("TestComponent");

      storage.getOrCreate(Component).addRender("mount");

      const getRendersByPhase = api.createGetRendersByPhase(Component);
      const mountRenders = getRendersByPhase("mount");

      expect(Object.isFrozen(mountRenders)).toBe(true);
    });
  });

  describe("createHasMounted", () => {
    it("should return false when no data exists", () => {
      const Component = createComponent("TestComponent");
      const hasMounted = api.createHasMounted(Component);

      expect(hasMounted()).toBe(false);
    });

    it("should return false when no mount renders", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("update");
      data.addRender("nested-update");

      const hasMounted = api.createHasMounted(Component);

      expect(hasMounted()).toBe(false);
    });

    it("should return true when mount render exists", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("mount");

      const hasMounted = api.createHasMounted(Component);

      expect(hasMounted()).toBe(true);
    });

    it("should return true even with other phase renders", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("update");
      data.addRender("mount");
      data.addRender("update");

      const hasMounted = api.createHasMounted(Component);

      expect(hasMounted()).toBe(true);
    });

    it("should update when mount render is added", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const hasMounted = api.createHasMounted(Component);

      expect(hasMounted()).toBe(false);

      data.addRender("update");

      expect(hasMounted()).toBe(false);

      data.addRender("mount");

      expect(hasMounted()).toBe(true);
    });
  });

  describe("createAllMethods", () => {
    it("should create all 6 API methods", () => {
      const Component = createComponent("TestComponent");
      const methods = api.createAllMethods(Component);

      expect(methods).toHaveProperty("getRenderCount");
      expect(methods).toHaveProperty("getRenderHistory");
      expect(methods).toHaveProperty("getLastRender");
      expect(methods).toHaveProperty("getRenderAt");
      expect(methods).toHaveProperty("getRendersByPhase");
      expect(methods).toHaveProperty("hasMounted");

      expectTypeOf(methods.getRenderCount).toBeFunction();
      expectTypeOf(methods.getRenderHistory).toBeFunction();
      expectTypeOf(methods.getLastRender).toBeFunction();
      expectTypeOf(methods.getRenderAt).toBeFunction();
      expectTypeOf(methods.getRendersByPhase).toBeFunction();
      expectTypeOf(methods.hasMounted).toBeFunction();
    });

    it("should create working methods with default values", () => {
      const Component = createComponent("TestComponent");
      const methods = api.createAllMethods(Component);

      expect(methods.getRenderCount()).toBe(0);
      expect(methods.getRenderHistory()).toStrictEqual([]);
      expect(methods.getLastRender()).toBeUndefined();
      expect(methods.getRenderAt(0)).toBeUndefined();
      expect(methods.getRendersByPhase("mount")).toStrictEqual([]);
      expect(methods.hasMounted()).toBe(false);
    });

    it("should create working methods with data", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const render1: PhaseType = "mount";
      const render2: PhaseType = "update";
      const render3: PhaseType = "update";

      data.addRender(render1);
      data.addRender(render2);
      data.addRender(render3);

      const methods = api.createAllMethods(Component);

      expect(methods.getRenderCount()).toBe(3);
      expect(methods.getRenderHistory()).toStrictEqual([
        render1,
        render2,
        render3,
      ]);
      expect(methods.getLastRender()).toStrictEqual(render3);
      expect(methods.getRenderAt(0)).toStrictEqual(render1);
      expect(methods.getRenderAt(1)).toStrictEqual(render2);
      expect(methods.getRenderAt(2)).toStrictEqual(render3);
      expect(methods.getRendersByPhase("mount")).toStrictEqual([render1]);
      expect(methods.getRendersByPhase("update")).toStrictEqual([
        render2,
        render3,
      ]);
      expect(methods.hasMounted()).toBe(true);
    });

    it("should create methods that update with new data", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const methods = api.createAllMethods(Component);

      expect(methods.getRenderCount()).toBe(0);
      expect(methods.hasMounted()).toBe(false);

      data.addRender("mount");

      expect(methods.getRenderCount()).toBe(1);
      expect(methods.hasMounted()).toBe(true);
      expect(methods.getLastRender()).toStrictEqual("mount");
    });

    it("should create isolated methods for different components", () => {
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");

      storage.getOrCreate(Component1).addRender("mount");
      storage.getOrCreate(Component2).addRender("update");
      storage.getOrCreate(Component2).addRender("update");

      const methods1 = api.createAllMethods(Component1);
      const methods2 = api.createAllMethods(Component2);

      expect(methods1.getRenderCount()).toBe(1);
      expect(methods1.hasMounted()).toBe(true);
      expect(methods1.getRendersByPhase("mount")).toHaveLength(1);

      expect(methods2.getRenderCount()).toBe(2);
      expect(methods2.hasMounted()).toBe(false);
      expect(methods2.getRendersByPhase("update")).toHaveLength(2);
    });
  });

  describe("closure behavior", () => {
    it("should capture component reference in closure", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      const getRenderCount1 = api.createGetRenderCount(Component);

      data.addRender("mount");
      const getRenderCount2 = api.createGetRenderCount(Component);

      // Both closures should reference the same component and get same result
      expect(getRenderCount1()).toBe(1);
      expect(getRenderCount2()).toBe(1);

      data.addRender("update");

      expect(getRenderCount1()).toBe(2);
      expect(getRenderCount2()).toBe(2);
    });

    it("should maintain separate closures per component", () => {
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");

      const getRenderCount1 = api.createGetRenderCount(Component1);
      const getRenderCount2 = api.createGetRenderCount(Component2);

      storage.getOrCreate(Component1).addRender("mount");
      storage.getOrCreate(Component2).addRender("mount");
      storage.getOrCreate(Component2).addRender("update");

      expect(getRenderCount1()).toBe(1);
      expect(getRenderCount2()).toBe(2);
    });
  });

  describe("integration with ProfilerData", () => {
    it("should properly delegate to ProfilerData methods", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const methods = api.createAllMethods(Component);

      // Add renders
      data.addRender("mount");
      data.addRender("update");

      // Verify delegation
      expect(methods.getRenderCount()).toBe(data.getRenderCount());
      expect(methods.getRenderHistory()).toStrictEqual(data.getHistory());
      expect(methods.getLastRender()).toStrictEqual(data.getLastRender());
      expect(methods.getRenderAt(0)).toStrictEqual(data.getRenderAt(0));
      expect(methods.getRendersByPhase("mount")).toStrictEqual(
        data.getRendersByPhase("mount"),
      );
      expect(methods.hasMounted()).toBe(data.hasMounted());
    });

    it("should handle clear operation", () => {
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);
      const methods = api.createAllMethods(Component);

      data.addRender("mount");

      expect(methods.getRenderCount()).toBe(1);

      data.clear();

      expect(methods.getRenderCount()).toBe(0);
      expect(methods.getRenderHistory()).toStrictEqual([]);
      expect(methods.getLastRender()).toBeUndefined();
      expect(methods.hasMounted()).toBe(false);
    });
  });
});
