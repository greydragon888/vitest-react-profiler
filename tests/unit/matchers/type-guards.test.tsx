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
        expect(matcher).toThrowError(errorPattern);
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
        }).toThrowError(
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
      }).toThrowError(errorPattern);

      expect(() => {
        expect(null).toHaveRenderedTimes(1);
      }).toThrowError(errorPattern);

      expect(() => {
        expect(null).toHaveMountedOnce();
      }).toThrowError(errorPattern);

      expect(() => {
        expect(null).toHaveNeverMounted();
      }).toThrowError(errorPattern);

      expect(() => {
        expect(null).toHaveOnlyUpdated();
      }).toThrowError(errorPattern);
    });

    it("should explicitly reject null for async matchers", async () => {
      // Test async matchers with null
      const errorPattern =
        /Expected a profiled component created with withProfiler.*received object/;

      await expect(
        expect(null).toEventuallyRenderTimes(1),
      ).rejects.toThrowError(errorPattern);

      await expect(
        expect(null).toEventuallyRenderAtLeast(1),
      ).rejects.toThrowError(errorPattern);

      await expect(
        expect(null).toEventuallyReachPhase("mount"),
      ).rejects.toThrowError(errorPattern);
    });

    it("should accept profiled components for all matchers", () => {
      const ProfiledTestComponent = withProfiler(TestComponent, "Test");

      // These should not throw the isProfiledComponent error
      // (they may throw other errors, but not the validation error)

      // toHaveRendered - will throw "not rendered" but not validation error
      expect(() => {
        expect(ProfiledTestComponent).toHaveRendered();
      }).toThrowError(/Expected component to render at least once/);

      expect(() => {
        expect(ProfiledTestComponent).toHaveRendered();
      }).not.toThrowError(
        /Expected a profiled component created with withProfiler/,
      );

      // toHaveRenderedTimes - will throw wrong count but not validation error
      expect(() => {
        expect(ProfiledTestComponent).toHaveRenderedTimes(5);
      }).toThrowError(/Expected 5 renders, but got 0/);

      expect(() => {
        expect(ProfiledTestComponent).toHaveRenderedTimes(5);
      }).not.toThrowError(
        /Expected a profiled component created with withProfiler/,
      );

      // Render the component so other matchers can work
      render(<ProfiledTestComponent />);

      // These should all pass validation (may pass or fail the actual assertion)
      expect(() => {
        expect(ProfiledTestComponent).toHaveRendered();
      }).not.toThrowError(
        /Expected a profiled component created with withProfiler/,
      );

      expect(() => {
        expect(ProfiledTestComponent).toHaveMountedOnce();
      }).not.toThrowError(
        /Expected a profiled component created with withProfiler/,
      );
    });
  });
});
