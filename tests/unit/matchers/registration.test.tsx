import { describe, it, expect } from "vitest";

describe("Custom Matchers", () => {
  describe("Matcher Registration", () => {
    it("should register all custom matchers on expect object", () => {
      // This test ensures that expect.extend() was called and all matchers are registered
      const expectedMatchers = [
        "toHaveRendered",
        "toHaveRenderedTimes",
        "toHaveMountedOnce",
        "toHaveNeverMounted",
        "toHaveOnlyMounted",
        "toHaveOnlyUpdated",
        "toEventuallyRenderTimes",
        "toEventuallyRenderAtLeast",
        "toEventuallyReachPhase",
      ];

      // Verify each matcher exists on the expect object (runtime check)
      expectedMatchers.forEach((matcherName) => {
        expect(expect).toHaveProperty(matcherName);
        expect((expect as any)[matcherName]).toBeDefined();
      });
    });
  });
});
