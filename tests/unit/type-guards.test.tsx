import { describe, it, expect } from "vitest";

import { isProfiledComponent } from "@/matchers/type-guards";
import { withProfiler } from "@/profiler/components/withProfiler";

describe("Type Guards", () => {
  describe("isProfiledComponent", () => {
    it("should return true for valid ProfiledComponent", () => {
      const Component = () => <div>Test</div>;
      const ProfiledComponent = withProfiler(Component);

      expect(isProfiledComponent(ProfiledComponent)).toBe(true);
    });

    it("should return false for null", () => {
      // This test specifically kills the mutant that changes:
      // received !== null && -> true &&
      // By testing null explicitly, we ensure this check is necessary
      expect(isProfiledComponent(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isProfiledComponent(undefined)).toBe(false);
    });

    it("should return false for primitive values", () => {
      expect(isProfiledComponent(42)).toBe(false);
      expect(isProfiledComponent("string")).toBe(false);
      expect(isProfiledComponent(true)).toBe(false);
      expect(isProfiledComponent(Symbol("test"))).toBe(false);
    });

    it("should return false for plain objects", () => {
      expect(isProfiledComponent({})).toBe(false);
      expect(isProfiledComponent({ getRenderCount: 1 })).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isProfiledComponent([])).toBe(false);
      expect(isProfiledComponent(["mount", "update"])).toBe(false);
    });

    it("should return false for functions without required methods", () => {
      const regularFunction = () => {};

      expect(isProfiledComponent(regularFunction)).toBe(false);
    });

    it("should return false for functions with only some required methods", () => {
      const partialFunction = () => {};

      // Add only some of the required methods
      (
        partialFunction as unknown as { getRenderCount: () => number }
      ).getRenderCount = () => 1;

      expect(isProfiledComponent(partialFunction)).toBe(false);
    });

    it("should return false for objects with all methods but not callable", () => {
      const obj = {
        getRenderCount: () => 1,
        getRenderHistory: () => [],
        getLastRender: () => null,
      };

      expect(isProfiledComponent(obj)).toBe(false);
    });

    it("should return true for mock ProfiledComponent-like function", () => {
      const mockComponent = (() => {}) as unknown as {
        getRenderCount: () => number;
        getRenderHistory: () => readonly string[];
        getLastRender: () => string | null;
      };

      mockComponent.getRenderCount = () => 1;
      mockComponent.getRenderHistory = () => ["mount"];
      mockComponent.getLastRender = () => "mount";

      expect(isProfiledComponent(mockComponent)).toBe(true);
    });

    it("should handle edge case: function with methods as strings (typeof check)", () => {
      // This ensures the typeof received === "function" check works
      const notAFunction = {
        getRenderCount: "not a function",
        getRenderHistory: "not a function",
        getLastRender: "not a function",
      };

      expect(isProfiledComponent(notAFunction)).toBe(false);
    });
  });
});
