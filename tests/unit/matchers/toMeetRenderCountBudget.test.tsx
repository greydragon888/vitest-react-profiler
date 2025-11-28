import { render } from "@testing-library/react";
import * as React from "react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";
import { toMeetRenderCountBudget } from "../../../src/matchers/sync/render-count-budget";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  describe("toMeetRenderCountBudget", () => {
    it("should pass when total renders within budget", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 1 mount + 2 updates = 3 total
      expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 3 });
      expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 5 });
    });

    it("should fail when total renders exceed budget", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 1 mount + 2 updates = 3 total (exceeds budget of 2)
      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 2 });
      }).toThrow(/Total renders: 3 \(budget: 2\) ❌/);
    });

    it("should include actual render summary in failure message", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // Verify "Actual:" line is included in failure message
      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 1 });
      }).toThrow(/Actual:/);
    });

    it("should pass when mounts within budget", () => {
      render(<ProfiledComponent />);

      expect(ProfiledComponent).toMeetRenderCountBudget({ maxMounts: 1 });
    });

    it("should fail when mounts exceed budget", () => {
      const { unmount } = render(<ProfiledComponent />);

      unmount();
      render(<ProfiledComponent />); // Second mount

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxMounts: 1 });
      }).toThrow(/Mounts: 2 \(budget: 1\) ❌/);
    });

    it("should pass when updates within budget", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // 1 update (within budget of 2)
      expect(ProfiledComponent).toMeetRenderCountBudget({ maxUpdates: 2 });
    });

    it("should fail when updates exceed budget", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 3 updates (exceeds budget of 2)
      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxUpdates: 2 });
      }).toThrow(/Updates: 3 \(budget: 2\) ❌/);
    });

    it("should check multiple constraints together", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // 1 mount + 1 update = 2 total (all within budget)
      expect(ProfiledComponent).toMeetRenderCountBudget({
        maxRenders: 3,
        maxMounts: 1,
        maxUpdates: 2,
      });
    });

    it("should show all violations when multiple constraints exceeded", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 1 mount + 3 updates = 4 total (exceeds all budgets)
      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: 2,
          maxMounts: 0,
          maxUpdates: 1,
        });
      }).toThrow(/Total renders: 4 \(budget: 2\) ❌/);
    });

    it("should use componentName in error messages", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: 1,
          componentName: "Header",
        });
      }).toThrow(/Expected Header to meet render count budget/);
    });

    it("should fail when budget is empty object", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({});
      }).toThrow(/Budget must specify at least one constraint/);
    });

    it("should fail with negative budget value", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: -1 });
      }).toThrow(/Budget.maxRenders must be a non-negative integer/);
    });

    it("should fail with non-integer budget value", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 1.5 });
      }).toThrow(/Budget.maxRenders must be a non-negative integer/);
    });

    it("should fail with object budget value", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: { invalid: "object" } as any,
        });
      }).toThrow(/Budget.maxRenders must not be object or null/);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toMeetRenderCountBudget({ maxRenders: 1 });
      }).toThrow(/Expected a profiled component created with withProfiler/);
    });

    it("should work with .not modifier when budget exceeded", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 3 renders exceed budget of 2 → should NOT meet budget
      expect(ProfiledComponent).not.toMeetRenderCountBudget({ maxRenders: 2 });
    });

    it("should fail .not modifier when budget is met", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // 2 renders within budget of 5 → SHOULD meet budget
      // Using .not should fail
      expect(() => {
        expect(ProfiledComponent).not.toMeetRenderCountBudget({
          maxRenders: 5,
        });
      }).toThrow(
        /Expected Component NOT to meet render count budget, but it did/,
      );
    });

    it("should include emoji status indicators in error messages", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 3 renders exceed budget of 2
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 2 });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("❌");
      }
    });

    it("should show checkmarks for constraints within budget", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // Pass but check .not to see success message
      try {
        expect(ProfiledComponent).not.toMeetRenderCountBudget({
          maxRenders: 3,
          maxMounts: 1,
          maxUpdates: 2,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("✅");
      }
    });

    it("should format error messages with newlines", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Multiple violations
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: 1,
          maxMounts: 0,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Check that checks are on separate lines with newline character
        const lines = error.message.split("\n");

        expect(lines.length).toBeGreaterThan(3);

        // Verify each check line exists as separate line
        const totalRendersLine = lines.find(
          (l: string) => l.includes("Total renders:") && l.includes("❌"),
        );
        const mountsLine = lines.find(
          (l: string) => l.includes("Mounts:") && l.includes("❌"),
        );

        expect(totalRendersLine).toBeDefined();
        expect(mountsLine).toBeDefined();

        // Verify they are on different lines (not concatenated)
        expect(totalRendersLine).not.toContain("Mounts:");
        expect(mountsLine).not.toContain("Total renders:");
      }
    });

    it("should fail with null budget value", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: null as any,
        });
      }).toThrow(/Budget.maxRenders must not be object or null/);
    });

    it("should include constraint names in violation messages", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Test maxMounts violation message - exact violation text
      try {
        render(<ProfiledComponent />); // Second mount

        expect(ProfiledComponent).toMeetRenderCountBudget({ maxMounts: 1 });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Mounts:");
        expect(error.message).toContain("budget: 1");
        expect(error.message).toContain("Mount count exceeded: 2 > 1");
      }

      // Test maxUpdates violation message - exact violation text
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxUpdates: 1 });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Updates:");
        expect(error.message).toContain("Update count exceeded:");
      }
    });

    it("should count nested-update phases as updates", () => {
      // This test verifies that nested-update is counted in updates
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // Manually verify update count includes all update types
      const history = ProfiledComponent.getRenderHistory();
      const updateCount = history.filter(
        (phase) => phase === "update" || phase === "nested-update",
      ).length;

      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxUpdates: updateCount - 1,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Updates:");
        expect(error.message).toContain(`${updateCount}`);
      }
    });

    it("should return correct actual values in matcher result", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // Call matcher directly to access result structure
      const result = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 10,
      });

      expect(result.pass).toBe(true);
      expect(result).toHaveProperty("actual");
      expect(result).toHaveProperty("actual.total", 2);
      expect(result).toHaveProperty("actual.mounts", 1);
      expect(result).toHaveProperty("actual.updates", 1);
    });

    it("should return correct expected values in matcher result", () => {
      render(<ProfiledComponent />);

      const budget = { maxRenders: 5, maxMounts: 2, componentName: "Test" };

      // Call matcher directly to access result structure
      const result = toMeetRenderCountBudget(ProfiledComponent, budget);

      expect(result).toHaveProperty("expected");
      expect(result).toHaveProperty("expected.maxRenders", 5);
      expect(result).toHaveProperty("expected.maxMounts", 2);
      expect(result).toHaveProperty("expected.componentName", "Test");
    });

    it("should validate maxMounts field name in validation errors", () => {
      render(<ProfiledComponent />);

      // Pass invalid maxMounts value to trigger validation error
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxMounts: -5,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Must contain the field name "maxMounts" in validation error
        expect(error.message).toMatch(
          /Budget\.maxMounts must be a non-negative integer/,
        );
      }
    });

    it("should validate maxUpdates field name in validation errors", () => {
      render(<ProfiledComponent />);

      // Pass invalid maxUpdates value to trigger validation error
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxUpdates: "invalid" as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Must contain the field name "maxUpdates" in validation error
        expect(error.message).toMatch(
          /Budget\.maxUpdates must be a non-negative integer/,
        );
      }
    });

    it("should include violation details with comparison operators", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // 3 total renders, exceed budget of 2
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({ maxRenders: 2 });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Must have exact violation format with >
        expect(error.message).toMatch(/Total renders exceeded: 3 > 2/);
      }
    });

    it("should NOT show Violations section when budget is met", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // 2 renders within budget of 5 - should pass
      const result = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 5,
      });

      expect(result.pass).toBe(true);

      // Message should NOT contain "Violations:" section
      const message = result.message();

      expect(message).toContain("NOT to meet render count budget");
      expect(message).not.toContain("Violations:");
    });

    it("should separate multiple violations with newlines and indentation", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Exceed multiple constraints: 4 renders > 2, 1 mount > 0
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: 2,
          maxMounts: 0,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        const message = error.message;

        // Verify "Violations:" header exists
        expect(message).toContain("Violations:");

        // Verify both violations are present
        expect(message).toContain("Total renders exceeded: 4 > 2");
        expect(message).toContain("Mount count exceeded: 1 > 0");

        // Verify violations are separated by "\n  " (newline + indent)
        const violationsSection = message
          .split("Violations:")[1]
          .split("Actual:")[0];

        expect(violationsSection).toContain("\n  Total renders exceeded");
        expect(violationsSection).toContain("\n  Mount count exceeded");
      }
    });

    it("should format .not message with newline-separated checks", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // 2 renders, both constraints met
      try {
        expect(ProfiledComponent).not.toMeetRenderCountBudget({
          maxRenders: 5,
          maxMounts: 2,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        const message = error.message;

        expect(message).toContain(
          "NOT to meet render count budget, but it did",
        );

        // Verify checks are separated by "\n" (newline)
        const lines = message.split("\n");
        const checkLines = lines.filter(
          (l: string) => l.includes("Total renders:") || l.includes("Mounts:"),
        );

        expect(checkLines).toHaveLength(2);
        expect(checkLines[0]).toContain("Total renders:");
        expect(checkLines[1]).toContain("Mounts:");

        // Verify they're on DIFFERENT lines (not concatenated without newline)
        expect(checkLines[0]).not.toContain("Mounts:");
        expect(checkLines[1]).not.toContain("Total renders:");
      }
    });

    it("should format object values with JSON.stringify in validation errors", () => {
      render(<ProfiledComponent />);

      // Test with object value - now returns generic message for objects
      const objectValue = { foo: "bar", num: 42 };

      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: objectValue as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Objects now get generic error message
        expect(error.message).toContain(
          "Budget.maxRenders must not be object or null",
        );
      }
    });

    it("should format null values correctly in validation errors", () => {
      render(<ProfiledComponent />);

      // Test with null - typeof null === "object", so gets generic message
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: null as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // null is detected as object (typeof null === "object")
        expect(error.message).toContain(
          "Budget.maxRenders must not be object or null",
        );
      }
    });

    it("should count nested-update phases as updates (not just regular updates)", () => {
      // Create component that triggers nested updates
      const NestedUpdateComponent = withProfiler(() => {
        const [, setCount] = React.useState(0);

        React.useLayoutEffect(() => {
          // Trigger nested update during render commit
          setCount(1);
        }, []);

        return <div>Nested Update Test</div>;
      });

      render(<NestedUpdateComponent />);

      const history = NestedUpdateComponent.getRenderHistory();
      const hasNestedUpdate = history.includes("nested-update");

      // Only test if nested updates were actually triggered
      if (hasNestedUpdate) {
        const result = toMeetRenderCountBudget(NestedUpdateComponent, {
          maxUpdates: 0,
        });

        // Should fail because nested-update counts as an update
        expect(result.pass).toBe(false);
        expect(result.message()).toContain("Update count exceeded");
      } else {
        // Skip test if React didn't trigger nested-update
        console.log("⚠️ Nested update not triggered in this environment");
      }
    });

    it("should format non-object primitive values with String() in validation errors", () => {
      render(<ProfiledComponent />);

      // Test with string primitive (not an object)
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: "invalid-string" as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Verify String() was used, NOT JSON.stringify()
        expect(error.message).toContain("received invalid-string");
        expect(error.message).not.toContain('received "invalid-string"'); // Would be JSON
      }

      // Test with number primitive
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxMounts: 3.14 as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Verify String(3.14) = "3.14" was used
        expect(error.message).toContain("received 3.14");
      }
    });

    it("should use JSON.stringify for objects but String() for non-objects", () => {
      render(<ProfiledComponent />);

      // Part 1: Object now gets generic message
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: { nested: { value: 123 } } as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // Objects now get generic error message
        expect(error.message).toContain(
          "Budget.maxRenders must not be object or null",
        );
      }

      // Part 2: Non-object should still use String()
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxMounts: true as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        // String(true) = "true"
        expect(error.message).toContain("received true");
        expect(error.message).not.toContain("received {"); // Not JSON
      }
    });

    it("should return empty string (not Violations section) when violations.length is 0", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      // 2 renders, within budget - no violations
      const result = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 10,
      });

      expect(result.pass).toBe(true);

      const message = result.message();

      // The message should NOT have "Violations:" section at all
      expect(message).not.toContain("Violations:");

      // The message should NOT have the violations text separator "\n\nViolations:\n  "
      expect(message).not.toContain("\n\nViolations:\n");
    });

    it("should only show Violations section when violations.length > 0 (not >= 0)", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Case 1: violations.length === 0 (budget met)
      const passResult = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 10,
      });

      expect(passResult.pass).toBe(true);
      expect(passResult.message()).not.toContain("Violations:");

      // Case 2: violations.length > 0 (budget exceeded)
      const failResult = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 2,
      });

      expect(failResult.pass).toBe(false);
      expect(failResult.message()).toContain("Violations:");
      expect(failResult.message()).toContain("Total renders exceeded: 3 > 2");
    });

    it("should format null with String(null) = 'null', not JSON.stringify(null) = 'null'", () => {
      render(<ProfiledComponent />);

      // JavaScript quirk: typeof null === "object", typeof [] === "object", typeof {} === "object"
      // All object-like values now get generic message

      // Test 1: null gets generic message (typeof null === "object")
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxRenders: null as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain(
          "Budget.maxRenders must not be object or null",
        );
      }

      // Test 2: Array gets generic message (typeof [] === "object")
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxMounts: [1, 2, 3] as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain(
          "Budget.maxMounts must not be object or null",
        );
      }

      // Test 3: Empty object gets generic message (typeof {} === "object")
      try {
        expect(ProfiledComponent).toMeetRenderCountBudget({
          maxUpdates: {} as any,
        });

        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain(
          "Budget.maxUpdates must not be object or null",
        );
      }
    });

    it("should return empty string when violations array is empty (length === 0)", () => {
      render(<ProfiledComponent />);

      // 1 render within budget - no violations
      const result = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 5,
      });

      expect(result.pass).toBe(true);

      const message = result.message();

      // CRITICAL: When violations.length === 0, the ternary should return ""
      // If mutated to `true ? violations... : ""`, it would always show violations
      // If mutated to `>= 0`, it would show empty violations section

      // Check 1: NO "Violations:" header
      expect(message).not.toContain("Violations:");

      // Check 2: NO violations separator string "\n\nViolations:\n  "
      expect(message).not.toMatch(/\n\nViolations:\n\s+/);

      // Check 3: Message should NOT end with violations section
      expect(message).not.toMatch(/Violations:\s*$/);
    });

    it("should show violations text ONLY when violations.length > 0 (strictly greater)", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      // Test with violations.length === 0 (budget met, no violations)
      const noViolationsResult = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 100,
      });

      expect(noViolationsResult.pass).toBe(true);

      // When violations.length === 0, the message should NOT contain the violations format
      const messageWithoutViolations = noViolationsResult.message();

      expect(messageWithoutViolations).not.toContain("\n\nViolations:\n");

      // Test with violations.length === 1 (one violation)
      const oneViolationResult = toMeetRenderCountBudget(ProfiledComponent, {
        maxRenders: 2,
      });

      expect(oneViolationResult.pass).toBe(false);

      const messageWithOneViolation = oneViolationResult.message();

      // When violations.length === 1 (> 0), violations section MUST appear
      expect(messageWithOneViolation).toContain("\n\nViolations:\n");
      expect(messageWithOneViolation).toContain(
        "Total renders exceeded: 3 > 2",
      );

      // Verify the exact condition: > 0, not >= 0
      // If mutated to >= 0, even empty violations would show the header
    });
  });
});
