import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
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
