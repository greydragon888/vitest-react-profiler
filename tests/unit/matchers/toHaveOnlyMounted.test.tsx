import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
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
      }).toThrowError(
        /Expected a profiled component created with withProfiler/,
      );
    });

    it("should fail when component never rendered", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveOnlyMounted();
      }).toThrowError(
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
      }).toThrowError(
        /Expected component to have only mounts, but it also updated/,
      );
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
      }).toThrowError(
        /Expected component to have only mounts, but it only updated/,
      );

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
      }).toThrowError(/Expected component not to have only mounts, but it did/);
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
      }).toThrowError(
        /Expected component to have only mounts, but it also updated/,
      );
    });

    it("should distinguish 'only updated' vs 'also updated' error messages", () => {
      // This test verifies the AND logic in: if (!hasMounts && hasUpdates)
      // Mutant changes to: if (!hasMounts || hasUpdates)

      // Case 1: hasMounts=true, hasUpdates=true
      // Correct message: "but it also updated"
      // Mutant message: "but it only updated" (WRONG!)
      const Component1 = ({ n }: { n: number }) => <div>{n}</div>;
      const TestProfiledComponent1 = withProfiler(Component1, "BothPhases");

      const { rerender } = render(<TestProfiledComponent1 n={1} />);

      rerender(<TestProfiledComponent1 n={2} />);

      // hasMounts=true, hasUpdates=true
      // With AND: (!hasMounts && hasUpdates) = false → won't enter this branch
      // With OR: (!hasMounts || hasUpdates) = true → enters and returns wrong message

      // First verify it throws
      expect(() => {
        expect(TestProfiledComponent1).toHaveOnlyMounted();
      }).toThrowError();

      // Capture error message
      let message1 = "";

      try {
        expect(TestProfiledComponent1).toHaveOnlyMounted();
      } catch (error) {
        message1 = (error as Error).message;
      }

      // Check message outside try/catch (avoids lint warning)
      expect(message1).toContain("but it also updated");
      expect(message1).not.toMatch(/but it only updated/);

      // Case 2: hasMounts=false, hasUpdates=true
      // This is the "only updated" case
      const Component2 = () => <div>test</div>;
      const TestProfiledComponent2 = withProfiler(Component2, "OnlyUpdated");

      // Mock to return only update phases (no mount)
      vi.spyOn(TestProfiledComponent2, "getRenderHistory").mockReturnValue([
        "update",
        "update",
      ]);

      // First verify it throws
      expect(() => {
        expect(TestProfiledComponent2).toHaveOnlyMounted();
      }).toThrowError();

      // Capture error message
      let message2 = "";

      try {
        expect(TestProfiledComponent2).toHaveOnlyMounted();
      } catch (error) {
        message2 = (error as Error).message;
      }

      // Check message outside try/catch (avoids lint warning)
      expect(message2).toContain("but it only updated");
      expect(message2).not.toMatch(/but it also updated/);

      vi.restoreAllMocks();
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
});
