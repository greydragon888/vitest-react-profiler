import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
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
});
