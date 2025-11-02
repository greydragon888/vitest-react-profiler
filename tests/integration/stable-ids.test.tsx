import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

describe("Stable Instance IDs", () => {
  describe("Single component instance", () => {
    it("should maintain stable ID across multiple re-renders", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div data-testid="value">{value}</div>
      );

      const ProfiledTest = withProfiler(TestComponent, "TestComponent");

      const { rerender } = render(<ProfiledTest value={1} />);

      expect(ProfiledTest.getRenderCount()).toBe(1);

      // Simulate many re-renders
      for (let i = 2; i <= 20; i++) {
        rerender(<ProfiledTest value={i} />);
      }

      // Should have exactly 20 renders (1 mount + 19 updates)
      expect(ProfiledTest.getRenderCount()).toBe(20);

      // All renders should be properly tracked
      const history = ProfiledTest.getRenderHistory();

      expect(history).toHaveLength(20);
      expect(history[0]).toBe("mount");

      // All subsequent renders should be updates
      for (let i = 1; i < 20; i++) {
        expect(history[i]).toBe("update");
      }
    });

    it("should handle parent-driven re-renders correctly", () => {
      const ChildComponent: FC<{ value: string; count: number }> = ({
        value,
        count,
      }) => (
        <div>
          <span data-testid="value">{value}</span>
          <span data-testid="count">{count}</span>
        </div>
      );

      const ProfiledChild = withProfiler(ChildComponent, "ChildComponent");

      const { rerender } = render(<ProfiledChild value="initial" count={0} />);

      expect(ProfiledChild.getRenderCount()).toBe(1);

      // Parent triggers re-renders by changing props
      rerender(<ProfiledChild value="updated" count={1} />);

      expect(ProfiledChild.getRenderCount()).toBe(2);

      rerender(<ProfiledChild value="updated-again" count={2} />);

      expect(ProfiledChild.getRenderCount()).toBe(3);

      rerender(<ProfiledChild value="final" count={3} />);

      expect(ProfiledChild.getRenderCount()).toBe(4);

      // All renders tracked correctly
      const history = ProfiledChild.getRenderHistory();

      expect(history).toHaveLength(4);
      expect(history[0]).toBe("mount");
      expect(history[1]).toBe("update");
      expect(history[2]).toBe("update");
      expect(history[3]).toBe("update");
    });
  });

  describe("Multiple component instances", () => {
    it("should assign unique IDs to different React component instances", () => {
      const Component: FC<{ id: string }> = ({ id }) => <div>{id}</div>;
      const ProfiledComponent = withProfiler(Component, "Component");

      // Render multiple instances simultaneously
      render(
        <div>
          <ProfiledComponent key="instance-1" id="first" />
          <ProfiledComponent key="instance-2" id="second" />
          <ProfiledComponent key="instance-3" id="third" />
        </div>,
      );

      // All 3 instances should have rendered
      expect(ProfiledComponent.getRenderCount()).toBe(3);

      const history = ProfiledComponent.getRenderHistory();

      expect(history).toHaveLength(3);

      // All should be mount phase
      expect(history.every((r) => r === "mount")).toBe(true);
    });

    it("should handle sequential rendering of instances", () => {
      const Component: FC<{ value: string }> = ({ value }) => (
        <span>{value}</span>
      );
      const ProfiledComponent = withProfiler(Component, "Sequential");

      // Render first instance
      const { unmount: unmount1 } = render(<ProfiledComponent value="1" />);

      expect(ProfiledComponent.getRenderCount()).toBe(1);

      // Render second instance (while first still mounted)
      const { unmount: unmount2 } = render(<ProfiledComponent value="2" />);

      expect(ProfiledComponent.getRenderCount()).toBe(2);

      // Unmount first
      unmount1();

      expect(ProfiledComponent.getRenderCount()).toBe(2); // Count persists

      // Render third instance
      const { unmount: unmount3 } = render(<ProfiledComponent value="3" />);

      expect(ProfiledComponent.getRenderCount()).toBe(3);

      // Unmount all
      unmount2();
      unmount3();

      expect(ProfiledComponent.getRenderCount()).toBe(3); // Count persists after all unmount
    });
  });

  describe("Complex re-render scenarios", () => {
    it("should handle rapid consecutive re-renders", () => {
      const FastComponent: FC<{ tick: number }> = ({ tick }) => (
        <div>{tick}</div>
      );
      const ProfiledFast = withProfiler(FastComponent, "FastComponent");

      const { rerender } = render(<ProfiledFast tick={0} />);

      // Simulate rapid updates (like animation frame)
      for (let i = 1; i <= 100; i++) {
        rerender(<ProfiledFast tick={i} />);
      }

      expect(ProfiledFast.getRenderCount()).toBe(101);

      const history = ProfiledFast.getRenderHistory();

      expect(history).toHaveLength(101);
      expect(history[0]).toBe("mount");

      // All others should be updates
      for (let i = 1; i <= 100; i++) {
        expect(history[i]).toBe("update");
      }
    });

    it("should correctly track renders after unmount and remount", () => {
      const Component: FC<{ value: string }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(Component, "UnmountRemount");

      // First mount
      const { rerender, unmount } = render(
        <ProfiledComponent value="initial" />,
      );

      expect(ProfiledComponent.getRenderCount()).toBe(1);

      // Re-render
      rerender(<ProfiledComponent value="updated" />);

      expect(ProfiledComponent.getRenderCount()).toBe(2);

      // Unmount
      unmount();

      expect(ProfiledComponent.getRenderCount()).toBe(2);

      // Remount (new instance)
      const { rerender: rerender2 } = render(
        <ProfiledComponent value="remounted" />,
      );

      expect(ProfiledComponent.getRenderCount()).toBe(3);

      // Re-render again
      rerender2(<ProfiledComponent value="updated-again" />);

      expect(ProfiledComponent.getRenderCount()).toBe(4);

      const history = ProfiledComponent.getRenderHistory();

      expect(history).toHaveLength(4);

      // Check phases: mount, update, mount, update
      expect(history[0]).toBe("mount");
      expect(history[1]).toBe("update");
      expect(history[2]).toBe("mount");
      expect(history[3]).toBe("update");
    });
  });
});
