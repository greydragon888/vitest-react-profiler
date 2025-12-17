import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  describe("toHaveOnlyUpdated", () => {
    it("should fail when component mounted (typical scenario)", () => {
      render(<ProfiledComponent />);

      // In normal usage, component will mount first
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrowError(/Expected component to have only updates/);
    });

    it("should fail with updates and mount", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Component has mount + updates, so toHaveOnlyUpdated should fail
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrowError(/Expected component to have only updates/);
    });

    it("should fail when mount occurred", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrowError(
        /Expected component to have only updates, but it only mounted/,
      );
    });

    it("should fail when both mount and update occurred", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrowError(
        /Expected component to have only updates, but it also mounted/,
      );
    });

    it("should fail when no renders occurred", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyUpdated();
      }).toThrowError(
        /Expected component to have only updates, but it never rendered/,
      );
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveOnlyUpdated();
      }).toThrowError(
        /Expected a profiled component created with withProfiler/,
      );
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
      }).toThrowError(
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
      }).toThrowError(
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
      }).toThrowError(
        /Expected component not to have only updates, but it did/,
      );

      // Also verify it's NOT the "only mounted" message (which mutants would produce)
      expect(() => {
        expect(TestProfiledComponent).toHaveOnlyUpdated();
      }).not.toThrowError(/only mounted/);

      // Restore the mock
      vi.restoreAllMocks();
    });
  });
});
