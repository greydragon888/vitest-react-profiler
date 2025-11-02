import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, expectTypeOf } from "vitest";

import { createOnRenderCallback } from "@/profiler/components/createOnRenderCallback.ts";
import { ProfiledComponentWrapper } from "@/profiler/components/ProfiledComponent.tsx";
import { ProfilerStorage } from "@/profiler/core/ProfilerStorage.ts";

import type { ComponentType } from "react";

describe("ProfiledComponent", () => {
  let storage: ProfilerStorage;

  beforeEach(() => {
    storage = new ProfilerStorage();
  });

  // Helper to create a test component
  const createTestComponent = (
    name: string,
    renderText?: string,
  ): ComponentType<{ text?: string }> => {
    const Component = ({ text }: { text?: string }) => (
      <div>{text ?? renderText ?? `${name} rendered`}</div>
    );

    Component.displayName = name;

    return Component;
  };

  describe("ProfiledComponentWrapper", () => {
    it("should render the wrapped component", () => {
      const TestComponent = createTestComponent("TestComponent", "Hello World");
      const onRender = vi.fn();

      render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{}}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("should pass props to wrapped component", () => {
      const TestComponent = createTestComponent("TestComponent");
      const onRender = vi.fn();

      render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Custom Text" }}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      expect(screen.getByText("Custom Text")).toBeInTheDocument();
    });

    it("should generate unique ID for component instance", () => {
      const TestComponent = createTestComponent("TestComponent");
      const onRender = vi.fn();

      render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{}}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      // onRender is called with the generated ID
      expect(onRender).toHaveBeenCalled();

      const firstCallId = onRender.mock.calls[0]?.[0];

      expect(firstCallId).toMatch(/^TestComponent-\d+$/);
    });

    it("should generate different IDs for different instances", () => {
      const TestComponent = createTestComponent("TestComponent");
      const onRender1 = vi.fn();
      const onRender2 = vi.fn();

      render(
        <div>
          <ProfiledComponentWrapper
            Component={TestComponent}
            componentProps={{ text: "Instance 1" }}
            componentName="TestComponent"
            onRender={onRender1}
          />
          <ProfiledComponentWrapper
            Component={TestComponent}
            componentProps={{ text: "Instance 2" }}
            componentName="TestComponent"
            onRender={onRender2}
          />
        </div>,
      );

      expect(screen.getByText("Instance 1")).toBeInTheDocument();
      expect(screen.getByText("Instance 2")).toBeInTheDocument();

      const id1 = onRender1.mock.calls[0]?.[0];
      const id2 = onRender2.mock.calls[0]?.[0];

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^TestComponent-\d+$/);
      expect(id2).toMatch(/^TestComponent-\d+$/);
    });

    it("should maintain stable ID across re-renders", () => {
      const TestComponent = createTestComponent("TestComponent");
      const onRender = vi.fn();

      const { rerender } = render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Initial" }}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      const initialId = onRender.mock.calls[0]?.[0];

      // Re-render with different props
      rerender(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Updated" }}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      // ID should remain the same
      const updatedId = onRender.mock.calls.at(-1)?.[0];

      expect(updatedId).toBe(initialId);
    });

    it("should call onRender callback on mount", () => {
      const TestComponent = createTestComponent("TestComponent");
      const onRender = vi.fn();

      render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{}}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      expect(onRender).toHaveBeenCalled();

      // First render should be mount phase
      const phase = onRender.mock.calls[0]?.[1];

      expect(phase).toBe("mount");
    });

    it("should call onRender callback on updates", () => {
      const TestComponent = createTestComponent("TestComponent");
      const onRender = vi.fn();

      const { rerender } = render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Initial" }}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      const initialCallCount = onRender.mock.calls.length;

      // Trigger re-render
      rerender(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Updated" }}
          componentName="TestComponent"
          onRender={onRender}
        />,
      );

      // Should be called again
      expect(onRender.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe("createOnRenderCallback", () => {
    // eslint-disable-next-line vitest/expect-expect -- expectTypeOf is a valid assertion
    it("should create a callback function", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      expectTypeOf(callback).toBeFunction();
    });

    it("should add render to storage when called", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      // Simulate React Profiler calling the callback
      callback("TestComponent-1", "mount", 10, 5, 100, 110);

      const data = storage.get(Component);

      expect(data).toBeDefined();
      expect(data?.getRenderCount()).toBe(1);
    });

    it("should record mount phase", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      callback("TestComponent-1", "mount", 10, 5, 100, 110);

      const data = storage.get(Component);
      const lastRender = data?.getLastRender();

      expect(lastRender).toBe("mount");
    });

    it("should record update phase", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      callback("TestComponent-1", "update", 5, 5, 200, 205);

      const data = storage.get(Component);
      const lastRender = data?.getLastRender();

      expect(lastRender).toBe("update");
    });

    it("should record nested-update phase", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      callback("TestComponent-1", "nested-update", 3, 3, 300, 303);

      const data = storage.get(Component);
      const lastRender = data?.getLastRender();

      expect(lastRender).toBe("nested-update");
    });

    it("should record multiple renders", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      callback("TestComponent-1", "mount", 10, 5, 100, 110);
      callback("TestComponent-1", "update", 5, 5, 200, 205);
      callback("TestComponent-1", "update", 5, 5, 300, 305);

      const data = storage.get(Component);

      expect(data?.getRenderCount()).toBe(3);

      const history = data?.getHistory();

      expect(history?.[0]).toBe("mount");
      expect(history?.[1]).toBe("update");
      expect(history?.[2]).toBe("update");
    });

    it("should create data if not exists", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      expect(storage.has(Component)).toBe(false);

      callback("TestComponent-1", "mount", 10, 5, 100, 110);

      expect(storage.has(Component)).toBe(true);
    });

    it("should use existing data if exists", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      // Pre-create data
      const data = storage.getOrCreate(Component);

      data.addRender("mount");

      expect(data.getRenderCount()).toBe(1);

      // Callback should add to existing data
      callback("TestComponent-1", "update", 5, 5, 200, 205);

      expect(data.getRenderCount()).toBe(2);
      expect(storage.get(Component)).toBe(data);
    });

    it("should ignore unused profiler parameters", () => {
      const Component = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(Component, storage);

      // Call with all parameters
      callback("ignored-id", "mount", 999, 888, 777, 666);

      const data = storage.get(Component);
      const lastRender = data?.getLastRender();

      // Should only use phase, not the other parameters
      expect(lastRender).toBe("mount");
    });

    it("should create separate callbacks for different components", () => {
      const Component1 = createTestComponent("Component1");
      const Component2 = createTestComponent("Component2");

      const callback1 = createOnRenderCallback(Component1, storage);
      const callback2 = createOnRenderCallback(Component2, storage);

      callback1("Component1-1", "mount", 10, 5, 100, 110);
      callback2("Component2-1", "mount", 10, 5, 100, 110);

      const data1 = storage.get(Component1);
      const data2 = storage.get(Component2);

      expect(data1?.getRenderCount()).toBe(1);
      expect(data2?.getRenderCount()).toBe(1);
      expect(data1).not.toBe(data2);
    });
  });

  describe("integration", () => {
    it("should integrate ProfiledComponentWrapper with createOnRenderCallback", () => {
      const TestComponent = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(TestComponent, storage);

      render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Integration Test" }}
          componentName="TestComponent"
          onRender={callback}
        />,
      );

      expect(screen.getByText("Integration Test")).toBeInTheDocument();

      const data = storage.get(TestComponent);

      expect(data?.getRenderCount()).toBeGreaterThan(0);
      expect(data?.hasMounted()).toBe(true);
    });

    it("should track renders through ProfiledComponentWrapper", () => {
      const TestComponent = createTestComponent("TestComponent");
      const callback = createOnRenderCallback(TestComponent, storage);

      const { rerender } = render(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Initial" }}
          componentName="TestComponent"
          onRender={callback}
        />,
      );

      const data = storage.get(TestComponent);
      const initialCount = data?.getRenderCount() ?? 0;

      // Trigger update
      rerender(
        <ProfiledComponentWrapper
          Component={TestComponent}
          componentProps={{ text: "Updated" }}
          componentName="TestComponent"
          onRender={callback}
        />,
      );

      const updatedCount = data?.getRenderCount() ?? 0;

      expect(updatedCount).toBeGreaterThan(initialCount);
    });

    it("should maintain separate data for different component types", () => {
      const Component1 = createTestComponent("Component1");
      const Component2 = createTestComponent("Component2");

      const callback1 = createOnRenderCallback(Component1, storage);
      const callback2 = createOnRenderCallback(Component2, storage);

      render(
        <div>
          <ProfiledComponentWrapper
            Component={Component1}
            componentProps={{ text: "Component 1" }}
            componentName="Component1"
            onRender={callback1}
          />
          <ProfiledComponentWrapper
            Component={Component2}
            componentProps={{ text: "Component 2" }}
            componentName="Component2"
            onRender={callback2}
          />
        </div>,
      );

      const data1 = storage.get(Component1);
      const data2 = storage.get(Component2);

      expect(data1?.getRenderCount()).toBeGreaterThan(0);
      expect(data2?.getRenderCount()).toBeGreaterThan(0);
      expect(data1).not.toBe(data2);
    });
  });
});
