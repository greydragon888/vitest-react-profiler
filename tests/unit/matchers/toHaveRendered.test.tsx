import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

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
});
