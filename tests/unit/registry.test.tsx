/**
 * Unit tests for ComponentRegistry
 *
 * Tests the registry's core functionality:
 * 1. clearAll() clears render data between tests
 * 2. Components from describe() blocks are reusable
 * 3. Memory leak prevention via WeakSet
 *
 * @see src/registry.ts
 * @see docs/architecture-improvements.ru.md - Section 1
 */

import { render } from "@testing-library/react";
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";
import { clearRegistry, registry } from "@/registry";

describe("ComponentRegistry", () => {
  beforeEach(() => {
    registry.clearAll();
  });

  describe("clearAll() clears render data", () => {
    it("should clear render history from all components", () => {
      // Create component
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      // Render multiple times
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Component has 3 renders
      expect(ProfiledComponent.getRenderCount()).toBe(3);
      expect(ProfiledComponent.getRenderHistory()).toHaveLength(3);

      // clearAll() clears data
      registry.clearAll();

      // ✅ Render data is cleared (MAIN MEMORY SAVINGS!)
      expect(ProfiledComponent.getRenderCount()).toBe(0);
      expect(ProfiledComponent.getRenderHistory()).toStrictEqual([]);
    });

    it("should clear data from multiple components", () => {
      const Component1 = withProfiler(() =>
        React.createElement("div", null, "1"),
      );
      const Component2 = withProfiler(() =>
        React.createElement("div", null, "2"),
      );
      const Component3 = withProfiler(() =>
        React.createElement("div", null, "3"),
      );

      // Render all components
      render(
        <>
          <Component1 />
          <Component2 />
          <Component3 />
        </>,
      );

      // All have 1 render
      expect(Component1.getRenderCount()).toBe(1);
      expect(Component2.getRenderCount()).toBe(1);
      expect(Component3.getRenderCount()).toBe(1);

      // clearAll() clears all
      registry.clearAll();

      // ✅ All cleared
      expect(Component1.getRenderCount()).toBe(0);
      expect(Component2.getRenderCount()).toBe(0);
      expect(Component3.getRenderCount()).toBe(0);
    });

    it("render data does NOT accumulate across tests", () => {
      const TestComponent = () => React.createElement("div", null);
      const ProfiledComponent = withProfiler(TestComponent);

      // Simulate multiple test runs
      for (let i = 0; i < 10; i++) {
        // Render component
        const { rerender } = render(<ProfiledComponent />);

        rerender(<ProfiledComponent />);
        rerender(<ProfiledComponent />);

        // Should have 3 renders
        expect(ProfiledComponent.getRenderCount()).toBe(3);

        // clearAll() between "tests"
        registry.clearAll();

        // After clear, back to 0
        expect(ProfiledComponent.getRenderCount()).toBe(0);
      }

      // ✅ No accumulation of render data
      expect(ProfiledComponent.getRenderCount()).toBe(0);
    });
  });

  describe("Main memory savings: render data is cleared", () => {
    it("prevents accumulation of render data across 1000 tests", () => {
      const TestComponent = () => React.createElement("div", null);
      const ProfiledComponent = withProfiler(TestComponent);

      // Simulate 1000 test runs
      for (let i = 0; i < 1000; i++) {
        // Each test renders component multiple times
        const { rerender } = render(<ProfiledComponent />);

        rerender(<ProfiledComponent />);
        rerender(<ProfiledComponent />);

        // Before fix: Would accumulate 3000+ renders
        // After fix: Only 3 renders max
        expect(ProfiledComponent.getRenderCount()).toBeLessThanOrEqual(3);

        // clearAll() between tests
        registry.clearAll();
      }

      // ✅ After 1000 tests, no render data accumulated
      expect(ProfiledComponent.getRenderCount()).toBe(0);
    });

    it("render history memory is freed", () => {
      const TestComponent = () => React.createElement("div", null);
      const ProfiledComponent = withProfiler(TestComponent);

      // Render 1000 times
      const { rerender } = render(<ProfiledComponent />);

      for (let i = 0; i < 999; i++) {
        rerender(<ProfiledComponent />);
      }

      // Would accumulate ~100KB of render data
      expect(ProfiledComponent.getRenderHistory()).toHaveLength(1000);

      // clearAll() frees memory
      registry.clearAll();

      // ✅ Memory freed (main improvement!)
      expect(ProfiledComponent.getRenderHistory()).toStrictEqual([]);
    });
  });

  describe("Components from describe() blocks are reusable", () => {
    // Component created at describe() level
    const ReusableComponent = withProfiler(() =>
      React.createElement("div", null, "Reusable"),
    );

    it("first test uses component", () => {
      render(<ReusableComponent />);

      expect(ReusableComponent.getRenderCount()).toBe(1);
    });

    it("second test reuses component after clearAll()", () => {
      // clearAll() was called by afterEach
      // But component is still registered
      expect(ReusableComponent.getRenderCount()).toBe(0); // Data cleared

      render(<ReusableComponent />);

      expect(ReusableComponent.getRenderCount()).toBe(1);

      // ✅ Component works correctly after clearAll()
    });
  });

  describe("unregister() removes component from registry", () => {
    it("should exclude unregistered component from clearAll()", () => {
      let clearCount1 = 0;
      let clearCount2 = 0;

      const component1 = {
        clear: () => {
          clearCount1++;
        },
      };

      const component2 = {
        clear: () => {
          clearCount2++;
        },
      };

      // Register both components
      registry.register(component1);
      registry.register(component2);

      // Unregister component1
      registry.unregister(component1);

      // clearAll() should only clear component2
      registry.clearAll();

      // ✅ component1.clear() was NOT called (unregistered)
      expect(clearCount1).toBe(0);
      // ✅ component2.clear() was called (still registered)
      expect(clearCount2).toBe(1);
    });
  });

  describe("clearRegistry() for stress tests", () => {
    it("should clear render data and remove all component references", () => {
      const TestComponent = () => React.createElement("div", null, "Test");
      const ProfiledComponent = withProfiler(TestComponent);

      // Render multiple times
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Component has 3 renders
      expect(ProfiledComponent.getRenderCount()).toBe(3);

      // clearRegistry() clears data AND removes references
      clearRegistry();

      // ✅ Render data is cleared
      expect(ProfiledComponent.getRenderCount()).toBe(0);
      expect(ProfiledComponent.getRenderHistory()).toStrictEqual([]);
    });

    it("should prevent memory accumulation in stress tests", () => {
      // Simulate stress test that creates many components
      const components: ReturnType<typeof withProfiler>[] = [];

      for (let i = 0; i < 100; i++) {
        const Component = withProfiler(() =>
          React.createElement("div", null, `Component ${i}`),
        );

        render(<Component />);
        components.push(Component);
      }

      // All components have 1 render
      expect(components[0]?.getRenderCount()).toBe(1);
      expect(components[99]?.getRenderCount()).toBe(1);

      // clearRegistry() removes all references for GC
      clearRegistry();

      // ✅ All render data cleared
      expect(components[0]?.getRenderCount()).toBe(0);
      expect(components[99]?.getRenderCount()).toBe(0);
    });

    it("should be used in afterAll() for stress tests", () => {
      // Simulate pattern from stress tests
      const TestComponent = withProfiler(() =>
        React.createElement("div", null, "Stress Test"),
      );

      // Simulate many test iterations
      for (let i = 0; i < 1000; i++) {
        render(<TestComponent />);
        registry.clearAll(); // Between each test
      }

      // After all tests, fully cleanup
      clearRegistry();

      // ✅ All references cleared for garbage collection
      expect(TestComponent.getRenderCount()).toBe(0);
    });

    it("difference from clearAll: removes strong references", () => {
      let clearCount = 0;

      const component = {
        clear: () => {
          clearCount++;
        },
      };

      // Register component
      registry.register(component);

      // clearAll() clears data but keeps reference
      registry.clearAll();

      expect(clearCount).toBe(1);

      // Calling clearAll() again still calls clear()
      registry.clearAll();

      expect(clearCount).toBe(2); // Called again!

      // Reset clearCount
      clearCount = 0;

      // clearRegistry() removes references
      clearRegistry();

      expect(clearCount).toBe(1); // Called once

      // After clearRegistry(), clearAll() does nothing (no references)
      registry.clearAll();

      expect(clearCount).toBe(1); // NOT called again!
    });
  });
});
