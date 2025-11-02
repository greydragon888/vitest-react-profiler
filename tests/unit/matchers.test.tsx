import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

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
      }).toThrow(/Expected 2 renders, but got 1/);
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

  describe("toHaveOnlyMounted", () => {
    it("should pass when component only mounted", () => {
      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveOnlyMounted();
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveOnlyMounted();
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should fail when component never rendered", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyMounted();
      }).toThrow(
        /Expected component to have only mounts, but it never rendered/,
      );
    });

    it("should fail when component has updates", () => {
      const Component = ({ count }: { count: number }) => <div>{count}</div>;
      const TestProfiledComponent = withProfiler(Component, "UpdateTest");

      const { rerender } = render(<TestProfiledComponent count={1} />);

      rerender(<TestProfiledComponent count={2} />);

      expect(() => {
        expect(TestProfiledComponent).toHaveOnlyMounted();
      }).toThrow(/Expected component to have only mounts, but it also updated/);
    });

    it("should fail when component only updated (edge case)", () => {
      // This is a theoretical edge case where a component somehow has only updates
      // We can simulate this by mocking getRenderHistory
      const Component = () => <div>test</div>;
      const TestProfiledComponent = withProfiler(Component);

      // Mock the history to return only update phases (no mount)
      vi.spyOn(TestProfiledComponent, "getRenderHistory").mockReturnValue([
        "update",
        "update",
      ]);

      expect(() => {
        expect(TestProfiledComponent).toHaveOnlyMounted();
      }).toThrow(/Expected component to have only mounts, but it only updated/);

      // Restore the mock
      vi.restoreAllMocks();
    });

    it("should provide correct negative message when component only mounted", () => {
      render(<ProfiledComponent />);

      // First verify it passes
      expect(ProfiledComponent).toHaveOnlyMounted();

      // Test the negative case
      expect(() => {
        expect(ProfiledComponent).not.toHaveOnlyMounted();
      }).toThrow(/Expected component not to have only mounts, but it did/);
    });

    it("should only check for mount phases (ignore updates)", () => {
      // Verify that component with mount + updates fails
      const Component = ({ n }: { n: number }) => <div>{n}</div>;
      const TestProfiledComponent = withProfiler(Component, "MixedPhases");

      const { rerender } = render(<TestProfiledComponent n={1} />);

      rerender(<TestProfiledComponent n={2} />);
      rerender(<TestProfiledComponent n={3} />);

      // Despite 3 renders (1 mount + 2 updates), should fail because has updates
      expect(() => {
        expect(TestProfiledComponent).toHaveOnlyMounted();
      }).toThrow(/Expected component to have only mounts, but it also updated/);
    });

    it("should work with .not matcher when component updated", () => {
      const Component = ({ value }: { value: string }) => <div>{value}</div>;
      const TestProfiledComponent = withProfiler(Component, "NotTest");

      const { rerender } = render(<TestProfiledComponent value="a" />);

      rerender(<TestProfiledComponent value="b" />);

      // Component has both mount and update, so .not.toHaveOnlyMounted should pass
      expect(TestProfiledComponent).not.toHaveOnlyMounted();
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

    it("should verify phase-specific logic (not all phases count)", () => {
      // This test ensures that the matcher checks for specific "mount" and "update" phases
      // Not just any phase value
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      const history = ProfiledComponent.getRenderHistory();

      // Verify we have both mount and update phases
      const hasMountPhase = history.includes("mount");
      const hasUpdatePhase = history.includes("update");

      expect(hasMountPhase).toBe(true);
      expect(hasUpdatePhase).toBe(true);

      // The matcher should fail because hasMounts=true (even though hasUpdates=true too)
      // This tests the logic: pass = !hasMounts && hasUpdates
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(
        /Expected component to have only updates, but it also mounted/,
      );
    });

    it("should pass when component has only updates (without mount)", () => {
      // This is a theoretical edge case where a component somehow has only updates
      // We can simulate this by mocking getRenderHistory
      const Component = () => <div>test</div>;
      const TestProfiledComponent = withProfiler(Component);

      // Mock the history to return only update phases (no mount)
      vi.spyOn(TestProfiledComponent, "getRenderHistory").mockReturnValue([
        "update",
        "update",
      ]);

      // This should pass: !hasMounts (true) && hasUpdates (true)
      expect(TestProfiledComponent).toHaveOnlyUpdated();

      // Restore the mock
      vi.restoreAllMocks();
    });

    it("should correctly evaluate both conditions in pass logic", () => {
      // This tests that BOTH conditions are required:
      // - !hasMounts (no mount phase)
      // - hasUpdates (has update phase)

      // Case 1: has mount, no updates → should fail with "only mounted"
      render(<ProfiledComponent />);

      const history = ProfiledComponent.getRenderHistory();

      expect(history).toContain("mount");
      expect(history).not.toContain("update");

      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(
        /Expected component to have only updates, but it only mounted/,
      );
    });

    it("should handle edge case with nested-updates but no mount or update phases", () => {
      // This is an edge case where component has only nested-update phases
      // without mount or update phases. This should fail with the fallback message.
      // This test kills mutants on line 196 (ConditionalExpression and LogicalOperator)
      const Component = () => <div>test</div>;
      const TestProfiledComponent = withProfiler(Component);

      // Mock the history to return only nested-update phases
      vi.spyOn(TestProfiledComponent, "getRenderHistory").mockReturnValue([
        "nested-update",
        "nested-update",
      ]);

      // hasMounts = false, hasUpdates = false, history.length > 0
      // Should fail with fallback message, NOT "only mounted"
      // This exact check kills both mutants on line 196:
      // - ConditionalExpression: if (hasMounts && !hasUpdates) → if (true)
      // - LogicalOperator: hasMounts && !hasUpdates → hasMounts || !hasUpdates
      expect(() => {
        expect(TestProfiledComponent).toHaveOnlyUpdated();
      }).toThrow(/Expected component not to have only updates, but it did/);

      // Also verify it's NOT the "only mounted" message (which mutants would produce)
      expect(() => {
        expect(TestProfiledComponent).toHaveOnlyUpdated();
      }).not.toThrow(/only mounted/);

      // Restore the mock
      vi.restoreAllMocks();
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
      }).toThrow(/Expected 5 renders, but got 1/);
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
