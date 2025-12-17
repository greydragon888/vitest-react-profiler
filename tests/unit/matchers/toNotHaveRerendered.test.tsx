import { render } from "@testing-library/react";
import { describe, beforeEach, it, expect } from "vitest";

import { withProfiler } from "../../../src";

const TestComponent = () => <div>test</div>;

describe("toNotHaveRerendered", () => {
  let ProfiledComponent: ReturnType<typeof withProfiler>;

  beforeEach(() => {
    ProfiledComponent = withProfiler(TestComponent, "TestComponent");
  });

  it("should pass when no rerenders after snapshot", () => {
    render(<ProfiledComponent />);
    ProfiledComponent.snapshot();

    expect(() => {
      expect(ProfiledComponent).toNotHaveRerendered();
    }).not.toThrowError();
  });

  it("should fail when one rerender after snapshot", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    let errorMessage = "";

    try {
      expect(ProfiledComponent).toNotHaveRerendered();
    } catch (error) {
      errorMessage = (error as Error).message;
    }

    // Verify singular "time" not plural "times"
    expect(errorMessage).toContain("rerendered 1 time");
    expect(errorMessage).not.toContain("1 times");
  });

  it("should fail when multiple rerenders after snapshot", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);
    rerender(<ProfiledComponent />);

    expect(() => {
      expect(ProfiledComponent).toNotHaveRerendered();
    }).toThrowError(
      /Expected component not to rerender after snapshot, but it rerendered 2 times/,
    );
  });

  it("should fail with non-profiled component", () => {
    const regularComponent = () => <div />;

    expect(() => {
      expect(regularComponent).toNotHaveRerendered();
    }).toThrowError(/Expected a profiled component created with withProfiler/);
  });

  it("should provide correct message for .not when passed", () => {
    render(<ProfiledComponent />);
    ProfiledComponent.snapshot();

    expect(() => {
      expect(ProfiledComponent).not.toNotHaveRerendered();
    }).toThrowError(
      /Expected component to rerender after snapshot, but it did not/,
    );
  });

  it("should pass with snapshot at beginning (no initial renders)", () => {
    ProfiledComponent.snapshot();

    expect(() => {
      expect(ProfiledComponent).toNotHaveRerendered();
    }).not.toThrowError();
  });

  it("should work with multiple snapshots", () => {
    const { rerender } = render(<ProfiledComponent />);

    ProfiledComponent.snapshot();
    rerender(<ProfiledComponent />);

    // After first snapshot: 1 rerender, should fail
    expect(() => {
      expect(ProfiledComponent).toNotHaveRerendered();
    }).toThrowError();

    // New snapshot resets count
    ProfiledComponent.snapshot();

    expect(() => {
      expect(ProfiledComponent).toNotHaveRerendered();
    }).not.toThrowError();
  });
});
