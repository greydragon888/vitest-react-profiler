import { describe, it, expect } from "vitest";

import { ProfilerData } from "../../src/profiler/core/ProfilerData";
import { ProfilerStorage } from "../../src/profiler/core/ProfilerStorage";

import type { ComponentType } from "react";

describe("ProfilerStorage", () => {
  // Helper function to create a dummy component
  const createComponent = (name: string): ComponentType<any> => {
    const Component = () => null;

    Component.displayName = name;

    return Component;
  };

  describe("constructor", () => {
    it("should initialize with empty storage", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      expect(storage.has(Component)).toBe(false);
      expect(storage.get(Component)).toBeUndefined();
    });
  });

  describe("get", () => {
    it("should return undefined for non-existent component", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      expect(storage.get(Component)).toBeUndefined();
    });

    it("should return data for existing component", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const data = new ProfilerData();

      storage.set(Component, data);

      expect(storage.get(Component)).toBe(data);
    });

    it("should return same data instance on multiple calls", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const data = new ProfilerData();

      storage.set(Component, data);

      const result1 = storage.get(Component);
      const result2 = storage.get(Component);
      const result3 = storage.get(Component);

      expect(result1).toBe(data);
      expect(result2).toBe(data);
      expect(result3).toBe(data);
      expect(result1).toBe(result2);
    });

    it("should isolate data between different components", () => {
      const storage = new ProfilerStorage();
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");
      const data1 = new ProfilerData();
      const data2 = new ProfilerData();

      storage.set(Component1, data1);
      storage.set(Component2, data2);

      expect(storage.get(Component1)).toBe(data1);
      expect(storage.get(Component2)).toBe(data2);
      expect(storage.get(Component1)).not.toBe(data2);
    });
  });

  describe("set", () => {
    it("should store data for component", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const data = new ProfilerData();

      storage.set(Component, data);

      expect(storage.get(Component)).toBe(data);
      expect(storage.has(Component)).toBe(true);
    });

    it("should overwrite existing data", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const data1 = new ProfilerData();
      const data2 = new ProfilerData();

      storage.set(Component, data1);

      expect(storage.get(Component)).toBe(data1);

      storage.set(Component, data2);

      expect(storage.get(Component)).toBe(data2);
      expect(storage.get(Component)).not.toBe(data1);
    });

    it("should handle multiple components independently", () => {
      const storage = new ProfilerStorage();
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");
      const Component3 = createComponent("Component3");

      const data1 = new ProfilerData();
      const data2 = new ProfilerData();
      const data3 = new ProfilerData();

      storage.set(Component1, data1);
      storage.set(Component2, data2);
      storage.set(Component3, data3);

      expect(storage.get(Component1)).toBe(data1);
      expect(storage.get(Component2)).toBe(data2);
      expect(storage.get(Component3)).toBe(data3);
    });
  });

  describe("has", () => {
    it("should return false for non-existent component", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      expect(storage.has(Component)).toBe(false);
    });

    it("should return true for existing component", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const data = new ProfilerData();

      storage.set(Component, data);

      expect(storage.has(Component)).toBe(true);
    });

    it("should not affect data retrieval", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const data = new ProfilerData();

      storage.set(Component, data);

      expect(storage.has(Component)).toBe(true);
      expect(storage.get(Component)).toBe(data);
      expect(storage.has(Component)).toBe(true);
    });

    it("should handle multiple components", () => {
      const storage = new ProfilerStorage();
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");
      const Component3 = createComponent("Component3");

      expect(storage.has(Component1)).toBe(false);
      expect(storage.has(Component2)).toBe(false);
      expect(storage.has(Component3)).toBe(false);

      storage.set(Component1, new ProfilerData());

      expect(storage.has(Component1)).toBe(true);
      expect(storage.has(Component2)).toBe(false);

      storage.set(Component2, new ProfilerData());

      expect(storage.has(Component1)).toBe(true);
      expect(storage.has(Component2)).toBe(true);
      expect(storage.has(Component3)).toBe(false);
    });
  });

  describe("getOrCreate", () => {
    it("should create new data if not exists", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      expect(storage.has(Component)).toBe(false);

      const data = storage.getOrCreate(Component);

      expect(data).toBeInstanceOf(ProfilerData);
      expect(storage.has(Component)).toBe(true);
      expect(storage.get(Component)).toBe(data);
    });

    it("should return existing data if exists", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");
      const existingData = new ProfilerData();

      storage.set(Component, existingData);

      const data = storage.getOrCreate(Component);

      expect(data).toBe(existingData);
      expect(storage.get(Component)).toBe(existingData);
    });

    it("should return same instance on multiple calls", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      const data1 = storage.getOrCreate(Component);
      const data2 = storage.getOrCreate(Component);
      const data3 = storage.getOrCreate(Component);

      expect(data1).toBe(data2);
      expect(data2).toBe(data3);
      expect(data1).toBeInstanceOf(ProfilerData);
    });

    it("should guarantee data always exists after call", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      const data = storage.getOrCreate(Component);

      expect(data).toBeDefined();
      expect(data).not.toBeNull();
      expect(storage.has(Component)).toBe(true);
    });

    it("should handle multiple components independently", () => {
      const storage = new ProfilerStorage();
      const Component1 = createComponent("Component1");
      const Component2 = createComponent("Component2");

      const data1 = storage.getOrCreate(Component1);
      const data2 = storage.getOrCreate(Component2);

      expect(data1).not.toBe(data2);
      expect(data1).toBeInstanceOf(ProfilerData);
      expect(data2).toBeInstanceOf(ProfilerData);
    });

    it("should preserve existing data modifications", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      const data1 = storage.getOrCreate(Component);

      data1.addRender("mount");

      const data2 = storage.getOrCreate(Component);

      expect(data2.getRenderCount()).toBe(1);
      expect(data1).toBe(data2);
    });
  });

  describe("WeakMap behavior", () => {
    it("should use WeakMap for automatic garbage collection (conceptual test)", () => {
      const storage = new ProfilerStorage();

      // Create and store data for a component
      const Component = createComponent("TestComponent");
      const data = storage.getOrCreate(Component);

      data.addRender("mount");

      expect(storage.has(Component)).toBe(true);
      expect(storage.get(Component)).toBe(data);

      // Note: We can't actually test GC behavior in unit tests,
      // but we can verify the storage uses WeakMap semantics
      // (i.e., it doesn't prevent GC of components)
    });

    it("should allow same component reference to retrieve same data", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      storage.getOrCreate(Component).addRender("mount");

      // Using the same component reference should get the same data
      expect(storage.get(Component)?.getRenderCount()).toBe(1);
    });

    it("should treat different component instances as different keys", () => {
      const storage = new ProfilerStorage();

      // Create two "identical" components (but different instances)
      const Component1 = createComponent("TestComponent");
      const Component2 = createComponent("TestComponent");

      storage.getOrCreate(Component1).addRender("mount");
      storage.getOrCreate(Component2).addRender("update");

      // Different instances should have different data
      expect(storage.get(Component1)?.getRenderCount()).toBe(1);
      expect(storage.get(Component2)?.getRenderCount()).toBe(1);
      expect(storage.get(Component1)?.getLastRender()).toBe("mount");
      expect(storage.get(Component2)?.getLastRender()).toBe("update");
    });
  });

  describe("type safety", () => {
    it("should work with components of different prop types", () => {
      const storage = new ProfilerStorage();

      // Component with props
      const ComponentWithProps: ComponentType<{
        name: string;
        age: number;
      }> = () => null;
      // Component without props
      const ComponentNoProps: ComponentType = () => null;

      const data1 = storage.getOrCreate(ComponentWithProps);
      const data2 = storage.getOrCreate(ComponentNoProps);

      expect(data1).toBeInstanceOf(ProfilerData);
      expect(data2).toBeInstanceOf(ProfilerData);
      expect(data1).not.toBe(data2);
    });
  });

  describe("integration with ProfilerData", () => {
    it("should properly store and retrieve ProfilerData state", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      const data = storage.getOrCreate(Component);

      // Add some renders
      data.addRender("mount");
      data.addRender("update");
      data.addRender("update");

      // Retrieve and verify
      const retrievedData = storage.get(Component);

      expect(retrievedData?.getRenderCount()).toBe(3);
      expect(retrievedData?.hasMounted()).toBe(true);
      expect(retrievedData?.getRendersByPhase("update")).toHaveLength(2);
    });

    it("should allow clearing data through ProfilerData", () => {
      const storage = new ProfilerStorage();
      const Component = createComponent("TestComponent");

      const data = storage.getOrCreate(Component);

      data.addRender("mount");

      expect(data.getRenderCount()).toBe(1);

      data.clear();

      expect(data.getRenderCount()).toBe(0);

      // Data still exists in storage, just cleared
      expect(storage.has(Component)).toBe(true);
      expect(storage.get(Component)).toBe(data);
    });
  });
});
