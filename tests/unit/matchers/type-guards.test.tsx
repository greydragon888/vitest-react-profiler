import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  describe("isProfiledComponent Validation", () => {
    it("should reject non-profiled components for all matchers", () => {
      const regularComponent = () => <div />;
      const errorPattern =
        /Expected a profiled component created with withProfiler/;

      // Test all matchers that check isProfiledComponent
      const matchersToTest = [
        () => {
          expect(regularComponent).toHaveRendered();
        },
        () => {
          expect(regularComponent).toHaveRenderedTimes(1);
        },
        () => {
          expect(regularComponent).toHaveMountedOnce();
        },
        () => {
          expect(regularComponent).toHaveNeverMounted();
        },
        () => {
          expect(regularComponent).toHaveOnlyUpdated();
        },
      ];

      matchersToTest.forEach((matcher) => {
        expect(matcher).toThrow(errorPattern);
      });
    });

    it("should provide specific error messages for different input types", () => {
      const testCases = [
        { input: null, type: "object" }, // typeof null === "object"
        { input: undefined, type: "undefined" },
        { input: 42, type: "number" },
        { input: "string", type: "string" },
        { input: true, type: "boolean" },
        { input: {}, type: "object" },
        { input: [], type: "object" },
        { input: () => undefined, type: "function" },
      ];

      testCases.forEach(({ input, type }) => {
        expect(() => {
          expect(input).toHaveRendered();
        }).toThrow(
          new RegExp(
            String.raw`Expected a profiled component created with withProfiler\(\), received ${type}`,
          ),
        );
      });
    });

    it("should explicitly reject null for all matchers", () => {
      // This test ensures that null check happens before type check
      // to kill the mutation that replaces "received !== null" with "true"
      const errorPattern =
        /Expected a profiled component created with withProfiler.*received object/;

      // Test all sync matchers
      expect(() => {
        expect(null).toHaveRendered();
      }).toThrow(errorPattern);

      expect(() => {
        expect(null).toHaveRenderedTimes(1);
      }).toThrow(errorPattern);

      expect(() => {
        expect(null).toHaveMountedOnce();
      }).toThrow(errorPattern);

      expect(() => {
        expect(null).toHaveNeverMounted();
      }).toThrow(errorPattern);

      expect(() => {
        expect(null).toHaveOnlyUpdated();
      }).toThrow(errorPattern);
    });

    it("should explicitly reject null for async matchers", async () => {
      // Test async matchers with null
      const errorPattern =
        /Expected a profiled component created with withProfiler.*received object/;

      await expect(expect(null).toEventuallyRenderTimes(1)).rejects.toThrow(
        errorPattern,
      );

      await expect(expect(null).toEventuallyRenderAtLeast(1)).rejects.toThrow(
        errorPattern,
      );

      await expect(
        expect(null).toEventuallyReachPhase("mount"),
      ).rejects.toThrow(errorPattern);
    });

    it("should accept profiled components for all matchers", () => {
      const ProfiledTestComponent = withProfiler(TestComponent, "Test");

      // These should not throw the isProfiledComponent error
      // (they may throw other errors, but not the validation error)

      // toHaveRendered - will throw "not rendered" but not validation error
      expect(() => {
        expect(ProfiledTestComponent).toHaveRendered();
      }).toThrow(/Expected component to render at least once/);

      expect(() => {
        expect(ProfiledTestComponent).toHaveRendered();
      }).not.toThrow(/Expected a profiled component created with withProfiler/);

      // toHaveRenderedTimes - will throw wrong count but not validation error
      expect(() => {
        expect(ProfiledTestComponent).toHaveRenderedTimes(5);
      }).toThrow(/Expected 5 renders, but got 0/);

      expect(() => {
        expect(ProfiledTestComponent).toHaveRenderedTimes(5);
      }).not.toThrow(/Expected a profiled component created with withProfiler/);

      // Render the component so other matchers can work
      render(<ProfiledTestComponent />);

      // These should all pass validation (may pass or fail the actual assertion)
      expect(() => {
        expect(ProfiledTestComponent).toHaveRendered();
      }).not.toThrow(/Expected a profiled component created with withProfiler/);

      expect(() => {
        expect(ProfiledTestComponent).toHaveMountedOnce();
      }).not.toThrow(/Expected a profiled component created with withProfiler/);
    });
  });
});
