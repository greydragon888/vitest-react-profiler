import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("Custom Matchers", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  describe("toHaveNeverMounted", () => {
    it("should pass when never mounted", () => {
      expect(ProfiledComponent).toHaveNeverMounted();
    });

    it("should fail when mounted", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveNeverMounted();
      }).toThrowError(/Expected component never to mount, but it mounted/);
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveNeverMounted();
      }).toThrowError(
        /Expected a profiled component created with withProfiler/,
      );
    });

    it("should provide correct negative message when never mounted", () => {
      // Component has never mounted
      expect(ProfiledComponent).toHaveNeverMounted();

      // Test the negative case
      expect(() => {
        expect(ProfiledComponent).not.toHaveNeverMounted();
      }).toThrowError(/Expected component to mount, but it never did/);
    });

    it("should pass when component never rendered", () => {
      // Component was not rendered in this test, so it should never have mounted
      expect(ProfiledComponent).toHaveNeverMounted();
    });
  });
});
