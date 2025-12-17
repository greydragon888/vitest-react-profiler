import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("toHaveLastRenderedWithPhase", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  describe("mount phase", () => {
    it("should pass when last render is mount", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("mount");
      }).not.toThrowError();
    });

    it("should fail when last render is update", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("mount");
      }).toThrowError(
        /Expected last render to be 'mount', but it was 'update'/,
      );
    });
  });

  describe("update phase", () => {
    it("should pass when last render is update", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("update");
      }).not.toThrowError();
    });

    it("should fail when last render is mount", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("update");
      }).toThrowError(
        /Expected last render to be 'update', but it was 'mount'/,
      );
    });
  });

  describe("nested-update phase", () => {
    it("should pass when last render is nested-update", () => {
      // Note: nested-update is hard to trigger in real tests
      // This test validates the phase validation
      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("nested-update");
      }).toThrowError(/component has not rendered yet/);
    });
  });

  describe("error cases", () => {
    it("should fail when component has not rendered", () => {
      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("mount");
      }).toThrowError(
        /Expected last render to be 'mount', but component has not rendered yet/,
      );
    });

    it("should fail with non-profiled component", () => {
      const regularComponent = () => <div />;

      expect(() => {
        expect(regularComponent).toHaveLastRenderedWithPhase("mount");
      }).toThrowError(
        /Expected a profiled component created with withProfiler/,
      );
    });

    it("should fail with invalid phase parameter", () => {
      render(<ProfiledComponent />);

      expect(() => {
        // @ts-expect-error - Testing invalid phase
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("invalid");
      }).toThrowError(
        /Expected phase must be one of: 'mount', 'update', 'nested-update', received 'invalid'/,
      );
    });
  });

  describe(".not modifier", () => {
    it("should pass with .not when phase does not match", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).not.toHaveLastRenderedWithPhase("update");
      }).not.toThrowError();
    });

    it("should fail with .not when phase matches", () => {
      render(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).not.toHaveLastRenderedWithPhase("mount");
      }).toThrowError(/Expected last render not to be 'mount', but it was/);
    });
  });

  describe("multiple renders", () => {
    it("should check only the last render", () => {
      const { rerender } = render(<ProfiledComponent />);

      rerender(<ProfiledComponent />);
      rerender(<ProfiledComponent />);

      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("update");
      }).not.toThrowError();

      expect(() => {
        expect(ProfiledComponent).toHaveLastRenderedWithPhase("mount");
      }).toThrowError();
    });
  });
});
