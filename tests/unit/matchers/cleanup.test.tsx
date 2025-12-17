import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
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
        }).toThrowError(
          /Expected a profiled component created with withProfiler/,
        );
      });
    });
  });
});
