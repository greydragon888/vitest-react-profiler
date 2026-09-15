import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
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
});
