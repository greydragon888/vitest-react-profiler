import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";

import { withProfiler } from "../../src"; // Import to register matchers

// Simple test component
const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  describe("toHaveRendered", () => {
    it("should pass when component has rendered", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveRendered();
      }).not.toThrow();
    });

    it("should fail when component has not rendered", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveRendered();
      }).toThrow(/Expected component to render at least once/);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveRendered();
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should provide correct failure message for rendered component", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).not.toHaveRendered();
      }).toThrow(/Expected component not to render, but it rendered 1 time/);
    });
  });

  describe("toHaveRenderedTimes", () => {
    it("should pass with exact render count", () => {
      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveRenderedTimes(1);

      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveRenderedTimes(3);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveRenderedTimes(1);
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should fail with incorrect render count", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedTimes(2);
      }).toThrow(
        /Expected component to render 2 time\(s\), but it rendered 1 time/,
      );
    });

    it("should validate expected parameter", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveRenderedTimes(-1);
      }).toThrow(/Expected render count must be a non-negative integer/);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedTimes(1.5);
      }).toThrow(/Expected render count must be a non-negative integer/);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedTimes("invalid" as any);
      }).toThrow(/Expected render count must be a non-negative integer/);
    });

    it("should work with 0 renders", () => {
      expect(ProfiledComponent).toHaveRenderedTimes(0);
    });
  });

  describe("toHaveRenderedWithin", () => {
    it("should pass when render is fast enough", () => {
      render(<ProfiledComponent />);

      // Should render in less than 1 second (very generous)
      expect(ProfiledComponent).toHaveRenderedWithin(1000);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveRenderedWithin(100);
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should fail when no renders occurred", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveRenderedWithin(100);
      }).toThrow(/Component has not rendered yet/);
    });

    it("should validate duration parameter", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedWithin(0);
      }).toThrow(/Expected duration must be a positive number/);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedWithin(-10);
      }).toThrow(/Expected duration must be a positive number/);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedWithin("fast" as any);
      }).toThrow(/Expected duration must be a positive number/);
    });

    it("should provide helpful error messages", () => {
      render(<ProfiledComponent />);

      // Force a failure by setting impossible threshold
      expect(() => {
        expect(ProfiledComponent).toHaveRenderedWithin(0.0001);
      }).toThrow(
        /Expected render to take at most 0\.0001ms.*but it took \d+\.\d+ms/,
      );
    });

    it("should provide correct negative message when render is fast", () => {
      render(<ProfiledComponent />);

      // Use a very high threshold that will definitely pass
      const highThreshold = 10_000; // 10 seconds - definitely faster than this

      // First verify it passes
      expect(ProfiledComponent).toHaveRenderedWithin(highThreshold);

      // Test the negative case - should use the "more than" message
      expect(() => {
        expect(ProfiledComponent).not.toHaveRenderedWithin(highThreshold);
      }).toThrow(
        /Expected render to take more than 10000ms, but it took \d+\.\d+ms/,
      );
    });

    it("should format duration with 2 decimal places in error messages", () => {
      render(<ProfiledComponent />);

      // Test positive case formatting - using impossible threshold
      expect(() => {
        expect(ProfiledComponent).toHaveRenderedWithin(0.0001);
      }).toThrow(new RegExp(String.raw`but it took \d+\.\d{2}ms`));

      // Test negative case formatting - using very high threshold
      expect(() => {
        expect(ProfiledComponent).not.toHaveRenderedWithin(10_000);
      }).toThrow(new RegExp(String.raw`but it took \d+\.\d{2}ms`));
    });

    it("should handle edge case durations correctly", () => {
      render(<ProfiledComponent />);

      const lastRender = ProfiledComponent.getLastRender();
      const actualDuration = lastRender?.actualDuration ?? 0;

      // Test with exact duration (edge case where duration equals threshold)
      // This should pass the positive assertion
      expect(ProfiledComponent).toHaveRenderedWithin(actualDuration);

      // And fail the negative assertion with the "more than" message
      expect(() => {
        expect(ProfiledComponent).not.toHaveRenderedWithin(actualDuration);
      }).toThrow(
        new RegExp(
          `Expected render to take more than ${actualDuration}ms, but it took ${actualDuration.toFixed(2)}ms`,
        ),
      );
    });
  });

  describe("toHaveMountedOnce", () => {
    it("should pass when mounted exactly once", () => {
      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveMountedOnce();
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveMountedOnce();
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should fail when not mounted", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveMountedOnce();
      }).toThrow(/Expected component to mount once, but it never mounted/);
    });

    it("should fail when mounted multiple times", () => {
      render(<ProfiledComponent key="1" />);
      render(<ProfiledComponent key="2" />);

      expect(() => {
        expect(ProfiledComponent).toHaveMountedOnce();
      }).toThrow(/Expected component to mount once, but it mounted 2 times/);
    });

    it("should provide correct negative message when mounted once", () => {
      render(<ProfiledComponent />);

      // First verify it passes
      expect(ProfiledComponent).toHaveMountedOnce();

      // Test the negative case
      expect(() => {
        expect(ProfiledComponent).not.toHaveMountedOnce();
      }).toThrow(/Expected component not to mount, but it mounted once/);
    });

    it("should only count mount phases", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Despite 3 renders, only 1 mount
      expect(ProfiledComponent).toHaveMountedOnce();
    });
  });

  describe("toHaveNeverMounted", () => {
    it("should pass when never mounted", () => {
      expect(ProfiledComponent).toHaveNeverMounted();
    });

    it("should fail when mounted", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveNeverMounted();
      }).toThrow(/Expected component never to mount, but it mounted/);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveNeverMounted();
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should provide correct negative message when never mounted", () => {
      // Component has never mounted
      expect(ProfiledComponent).toHaveNeverMounted();

      // Test the negative case
      expect(() => {
        expect(ProfiledComponent).not.toHaveNeverMounted();
      }).toThrow(/Expected component to mount, but it never did/);
    });

    it("should pass when component never rendered", () => {
      // Component was not rendered in this test, so it should never have mounted
      expect(ProfiledComponent).toHaveNeverMounted();
    });
  });

  describe("toHaveOnlyUpdated", () => {
    it("should fail when component mounted (typical scenario)", () => {
      render(<ProfiledComponent />);

      // In normal usage, component will mount first
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(/Expected component to have only updates/);
    });

    it("should fail with updates and mount", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Component has mount + updates, so toHaveOnlyUpdated should fail
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(/Expected component to have only updates/);
    });

    it("should fail when mount occurred", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(
        /Expected component to have only updates, but it only mounted/,
      );
    });

    it("should fail when both mount and update occurred", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(
        /Expected component to have only updates, but it also mounted/,
      );
    });

    it("should fail when no renders occurred", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(
        /Expected component to have only updates, but it never rendered/,
      );
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveOnlyUpdated();
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });
  });

  describe("toHaveAverageRenderTime", () => {
    it("should pass when average is below threshold", () => {
      render(<ProfiledComponent />);

      // Very generous threshold
      expect(ProfiledComponent).toHaveAverageRenderTime(1000);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveAverageRenderTime(10);
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should provide correct negative message when average is below threshold", () => {
      render(<ProfiledComponent />);

      // Use a very high threshold that will definitely pass
      const highThreshold = 10_000;

      // First verify it passes
      expect(ProfiledComponent).toHaveAverageRenderTime(highThreshold);

      // Now test the negative case
      expect(() => {
        expect(ProfiledComponent).not.toHaveAverageRenderTime(highThreshold);
      }).toThrow(
        /Expected average render time to be more than \d+ms, but it was \d+\.\d+ms/,
      );
    });

    it("should fail when no renders occurred", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveAverageRenderTime(10);
      }).toThrow(/Component has not rendered yet, cannot calculate average/);
    });

    it("should validate average parameter", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveAverageRenderTime(0);
      }).toThrow(/Expected average duration must be a positive number/);

      expect(() => {
        expect(ProfiledComponent).toHaveAverageRenderTime(-5);
      }).toThrow(/Expected average duration must be a positive number/);
    });

    it("should calculate average correctly", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      const avg = ProfiledComponent.getAverageRenderTime();

      // Should pass with exact average
      expect(ProfiledComponent).toHaveAverageRenderTime(avg + 0.1);

      // Should fail with lower threshold - using a safe value that's always testable
      expect(() => {
        expect(ProfiledComponent).toHaveAverageRenderTime(0.000_01);
      }).toThrow(/Expected average render time to be at most/);
    });
  });

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
          expect(regularComponent).toHaveRenderedWithin(100);
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
        () => {
          expect(regularComponent).toHaveAverageRenderTime(10);
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
      }).toThrow(/Expected component to render 5 time/);

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
        expect(ProfiledTestComponent).toHaveRenderedWithin(10_000);
      }).not.toThrow(/Expected a profiled component created with withProfiler/);

      expect(() => {
        expect(ProfiledTestComponent).toHaveMountedOnce();
      }).not.toThrow(/Expected a profiled component created with withProfiler/);
    });
  });

  describe("Automatic Cleanup", () => {
    it("should track components for cleanup", () => {
      const Profiled1 = withProfiler(TestComponent, "Test1");
      const Profiled2 = withProfiler(() => <div>test2</div>, "Test2");

      render(<Profiled1 />);
      render(<Profiled2 />);

      expect(Profiled1).toHaveRenderedTimes(1);
      expect(Profiled2).toHaveRenderedTimes(1);

      // Cleanup happens automatically via afterEach
      // This test verifies the components were tracked
    });

    it("should handle invalid input types gracefully", () => {
      const invalidInputs = [null, undefined, 42, "string", {}, [], true];

      invalidInputs.forEach((input) => {
        expect(() => {
          expect(input).toHaveRendered();
        }).toThrow(/Expected a profiled component created with withProfiler/);
      });
    });
  });

  describe("Error Messages", () => {
    it("should provide helpful messages for common mistakes", () => {
      // Using non-profiled component
      const RegularComponent = () => <div />;

      expect(() => {
        expect(RegularComponent).toHaveRenderedTimes(1);
      }).toThrow(/withProfiler.*function/);
    });

    it("should include actual vs expected in failure messages", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveRenderedTimes(5);
      }).toThrow(
        /Expected component to render 5 time\(s\), but it rendered 1 time\(s\)/,
      );
    });
  });

  describe("Integration with .not", () => {
    it("should work with negation", () => {
      // Not rendered
      expect(ProfiledComponent).not.toHaveRendered();

      render(<ProfiledComponent />);

      // Now it has rendered
      expect(() => {
        expect(ProfiledComponent).not.toHaveRendered();
      }).toThrow();

      // Wrong count
      expect(ProfiledComponent).not.toHaveRenderedTimes(2);
      expect(ProfiledComponent).not.toHaveRenderedTimes(0);
    });

    it("should provide correct messages for negated assertions", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).not.toHaveRenderedTimes(1);
      }).toThrow(/Expected component not to render 1 time/);
    });
  });
});
