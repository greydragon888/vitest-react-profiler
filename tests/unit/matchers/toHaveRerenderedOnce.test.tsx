import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("toHaveRerenderedOnce", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  it("should pass when exactly one rerender after snapshot", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    expect(() => {
      expect(ProfiledComponent).toHaveRerenderedOnce();
    }).not.toThrowError();
  });

  it("should fail when no rerenders after snapshot", () => {
    render(<ProfiledComponent />);
    ProfiledComponent.snapshot();

    expect(() => {
      expect(ProfiledComponent).toHaveRerenderedOnce();
    }).toThrowError(
      /Expected component to rerender once after snapshot, but it did not rerender/,
    );
  });

  it("should fail when multiple rerenders after snapshot", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    expect(() => {
      expect(ProfiledComponent).toHaveRerenderedOnce();
    }).toThrowError(
      /Expected component to rerender once after snapshot, but it rerendered 3 times/,
    );
  });

  it("should fail with non-profiled component", () => {
    const regularComponent = () => <div />;

    expect(() => {
      expect(regularComponent).toHaveRerenderedOnce();
    }).toThrowError(/Expected a profiled component created with withProfiler/);
  });

  it("should provide correct message for .not when passed", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    expect(() => {
      expect(ProfiledComponent).not.toHaveRerenderedOnce();
    }).toThrowError(
      /Expected component not to rerender after snapshot, but it rerendered once/,
    );
  });

  it("should work with snapshot before any renders", () => {
    ProfiledComponent.snapshot();
    render(<ProfiledComponent />);

    expect(() => {
      expect(ProfiledComponent).toHaveRerenderedOnce();
    }).not.toThrowError();
  });

  it("should work with multiple snapshots", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    // First snapshot: 2 rerenders
    expect(() => {
      expect(ProfiledComponent).toHaveRerenderedOnce();
    }).toThrowError();

    // New snapshot resets count
    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    expect(() => {
      expect(ProfiledComponent).toHaveRerenderedOnce();
    }).not.toThrowError();
  });
});
