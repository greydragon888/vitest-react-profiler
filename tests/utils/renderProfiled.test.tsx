import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderProfiled } from "../../src";

import type { FC, ReactNode } from "react";

describe("renderProfiled", () => {
  describe("basic rendering", () => {
    it("should render component and provide profiled component", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>Value: {value}</div>
      );

      const { component } = renderProfiled(TestComponent, { value: 42 });

      // Component should be rendered
      expect(screen.getByText("Value: 42")).toBeInTheDocument();

      // Should have profiling API
      expect(component.getRenderCount).toBeDefined();
      expect(component.getRenderHistory).toBeDefined();
      expect(component.getLastRender).toBeDefined();

      // Should have rendered once
      expect(component).toHaveRenderedTimes(1);
    });

    it("should return all RTL utilities", () => {
      const TestComponent: FC = () => <div>Test</div>;

      const result = renderProfiled(TestComponent, {});

      // Should have standard RTL utilities
      expect(result.container).toBeDefined();
      expect(result.baseElement).toBeDefined();
      expect(result.debug).toBeDefined();
      expect(result.rerender).toBeDefined();
      expect(result.unmount).toBeDefined();
      expect(result.asFragment).toBeDefined();
    });
  });

  describe("rerender functionality", () => {
    it("should rerender with updated props using enhanced rerender", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>Value: {value}</div>
      );

      const { component, rerender } = renderProfiled(TestComponent, {
        value: 1,
      });

      expect(screen.getByText("Value: 1")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(1);

      // Rerender with partial props (should merge with original)
      rerender({ value: 2 });

      expect(screen.getByText("Value: 2")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(2);
    });

    it("should handle multiple props in rerender", () => {
      const TestComponent: FC<{ value: number; name: string }> = ({
        value,
        name,
      }) => (
        <div>
          {name}: {value}
        </div>
      );

      const { component, rerender } = renderProfiled(TestComponent, {
        value: 1,
        name: "Count",
      });

      expect(screen.getByText("Count: 1")).toBeInTheDocument();

      // Update only value
      rerender({ value: 2 });

      expect(screen.getByText("Count: 2")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(2);

      // Update only name
      rerender({ name: "Total" });

      expect(screen.getByText("Total: 2")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(3);

      // Update both
      rerender({ value: 3, name: "Final" });

      expect(screen.getByText("Final: 3")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(4);
    });

    it("should track render phases correctly", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );

      const { component, rerender } = renderProfiled(TestComponent, {
        value: 1,
      });

      // First render should be mount
      expect(component.hasMounted()).toBe(true);
      expect(component.getRendersByPhase("mount")).toHaveLength(1);

      // Subsequent rerenders should be updates
      rerender({ value: 2 });
      rerender({ value: 3 });

      expect(component.getRendersByPhase("update")).toHaveLength(2);
      expect(component).toHaveRenderedTimes(3);
    });
  });

  describe("displayName option", () => {
    it("should use custom displayName when provided", () => {
      const TestComponent: FC = () => <div>Test</div>;

      const { component } = renderProfiled(
        TestComponent,
        {},
        {
          displayName: "CustomName",
        },
      );

      expect(component.displayName).toBe("withProfiler(CustomName)");
    });

    it("should use component name when displayName not provided", () => {
      const MyComponent: FC = () => <div>Test</div>;

      const { component } = renderProfiled(MyComponent, {});

      expect(component.displayName).toBe("withProfiler(MyComponent)");
    });
  });

  describe("renderOptions support", () => {
    it("should pass renderOptions to RTL render", () => {
      const TestComponent: FC = () => <div>Test</div>;

      const Wrapper: FC<{ children: ReactNode }> = ({ children }) => (
        <div data-testid="wrapper">{children}</div>
      );

      const { component } = renderProfiled(
        TestComponent,
        {},
        {
          renderOptions: { wrapper: Wrapper },
        },
      );

      // Wrapper should be rendered
      expect(screen.getByTestId("wrapper")).toBeInTheDocument();

      // Component should still be profiled
      expect(component).toHaveRenderedTimes(1);
    });

    it("should support container option", () => {
      const TestComponent: FC = () => <div data-testid="custom-test">Test</div>;

      const customContainer = document.createElement("div");

      customContainer.id = "custom-root";
      document.body.append(customContainer);

      const { component } = renderProfiled(
        TestComponent,
        {},
        {
          renderOptions: { container: customContainer },
        },
      );

      // Component should be rendered in the custom container
      expect(
        customContainer.querySelector('[data-testid="custom-test"]'),
      ).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(1);

      // Cleanup
      customContainer.remove();
    });
  });

  describe("RTL integration", () => {
    it("should work with screen queries", () => {
      const TestComponent: FC<{ text: string }> = ({ text }) => (
        <div role="heading">{text}</div>
      );

      const { component } = renderProfiled(TestComponent, { text: "Hello" });

      // Standard RTL queries should work
      expect(screen.getByRole("heading")).toHaveTextContent("Hello");
      expect(screen.getByText("Hello")).toBeInTheDocument();

      // Profiling should work
      expect(component).toHaveRenderedTimes(1);
    });

    it("should work with unmount", () => {
      const TestComponent: FC = () => <div>Test</div>;

      const { component, unmount } = renderProfiled(TestComponent, {});

      expect(component).toHaveRenderedTimes(1);
      expect(screen.getByText("Test")).toBeInTheDocument();

      // Unmount should work
      unmount();

      expect(screen.queryByText("Test")).not.toBeInTheDocument();
    });

    it("should work with asFragment", () => {
      const TestComponent: FC = () => <div>Test Content</div>;

      const { component, asFragment } = renderProfiled(TestComponent, {});

      const fragment = asFragment();

      expect(fragment.textContent).toContain("Test Content");
      expect(component).toHaveRenderedTimes(1);
    });

    it("should work with debug", () => {
      const TestComponent: FC = () => <div>Debug Test</div>;

      const { component, debug } = renderProfiled(TestComponent, {});

      // debug should not throw
      expect(() => {
        debug();
      }).not.toThrowError();
      expect(component).toHaveRenderedTimes(1);
    });
  });

  describe("comparison with manual approach", () => {
    it("should be equivalent to manual withProfiler + render", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );

      // Using renderProfiled
      const { component: profiled1, rerender: rerender1 } = renderProfiled(
        TestComponent,
        { value: 1 },
      );

      rerender1({ value: 2 });

      // Manual approach (for comparison)
      // const ProfiledComponent = withProfiler(TestComponent);
      // const { rerender } = render(<ProfiledComponent value={1} />);
      // rerender(<ProfiledComponent value={2} />);

      // Results should be the same
      expect(profiled1).toHaveRenderedTimes(2);
      expect(profiled1.getRendersByPhase("mount")).toHaveLength(1);
      expect(profiled1.getRendersByPhase("update")).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle component with no props", () => {
      const TestComponent: FC = () => <div>No Props</div>;

      const { component } = renderProfiled(TestComponent, {});

      expect(screen.getByText("No Props")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(1);
    });

    it("should handle component with optional props", () => {
      const TestComponent: FC<{ value?: number }> = ({ value = 0 }) => (
        <div>Value: {value}</div>
      );

      const { component, rerender } = renderProfiled(TestComponent, {});

      expect(screen.getByText("Value: 0")).toBeInTheDocument();

      rerender({ value: 42 });

      expect(screen.getByText("Value: 42")).toBeInTheDocument();
      expect(component).toHaveRenderedTimes(2);
    });

    it("should handle rerender with empty partial props", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );

      const { component, rerender } = renderProfiled(TestComponent, {
        value: 1,
      });

      // Rerender with no changes
      rerender({});

      // Should still trigger a render
      expect(component).toHaveRenderedTimes(2);
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });
});
