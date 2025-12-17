import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { withProfiler } from "../../src";
import { Counter } from "../fixtures/Counter";

describe("Snapshot API Integration", () => {
  const ProfiledCounter = withProfiler(Counter, "Counter");

  describe("snapshot() and getRendersSinceSnapshot()", () => {
    it("should return 0 immediately after snapshot", () => {
      render(<ProfiledCounter />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      ProfiledCounter.snapshot();

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(0);
    });

    it("should count renders after snapshot", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      rerender(<ProfiledCounter initialCount={10} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
    });

    it("should work with state changes", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      const button = screen.getByText("Increment");

      fireEvent.click(button);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      fireEvent.click(button);
      fireEvent.click(button);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(3);
    });

    it("should allow multiple snapshots to reset baseline", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);
      rerender(<ProfiledCounter initialCount={10} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);

      // Take new snapshot - resets to 0
      ProfiledCounter.snapshot();

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(0);

      rerender(<ProfiledCounter initialCount={15} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);
    });
  });

  describe("toHaveRerenderedOnce matcher", () => {
    it("should pass for single rerender after snapshot", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveRerenderedOnce();
    });

    it("should fail for multiple rerenders", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);
      rerender(<ProfiledCounter initialCount={10} />);

      expect(() => {
        expect(ProfiledCounter).toHaveRerenderedOnce();
      }).toThrowError(/rerendered 2 times/);
    });

    it("should work with state-triggered rerenders", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRerenderedOnce();
    });
  });

  describe("toNotHaveRerendered matcher", () => {
    it("should pass when no rerenders after snapshot", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      expect(ProfiledCounter).toNotHaveRerendered();
    });

    it("should fail when rerender occurs", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      expect(() => {
        expect(ProfiledCounter).toNotHaveRerendered();
      }).toThrowError(/rerendered 1 time/);
    });
  });

  describe("toHaveLastRenderedWithPhase matcher", () => {
    it("should detect mount phase", () => {
      render(<ProfiledCounter />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");
    });

    it("should detect update phase", () => {
      const { rerender } = render(<ProfiledCounter />);

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });

    it("should update after each render", () => {
      const { rerender } = render(<ProfiledCounter />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });
  });

  describe("Real-world optimization testing", () => {
    it("should track renders through state updates", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      // Click multiple times
      fireEvent.click(screen.getByText("Increment"));
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
      expect(ProfiledCounter).not.toHaveRerenderedOnce();
    });

    it("should verify single render per action", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRerenderedOnce();
    });
  });

  describe("Workflow: testing optimization patterns", () => {
    it("should test snapshot-based optimization workflow", () => {
      // Test typical workflow: snapshot -> action -> verify no unintended renders
      render(<ProfiledCounter />);

      // Record baseline
      ProfiledCounter.snapshot();

      // Verify no renders happened without action
      expect(ProfiledCounter).toNotHaveRerendered();

      // Trigger single render
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRerenderedOnce();
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });

    it("should support iterative optimization testing", () => {
      const { rerender } = render(<ProfiledCounter />);

      // Initial state
      expect(ProfiledCounter.getRenderCount()).toBe(1);

      // First iteration: check prop change causes rerender
      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveRerenderedOnce();

      // Second iteration: multiple prop changes
      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={10} />);
      rerender(<ProfiledCounter initialCount={15} />);
      rerender(<ProfiledCounter initialCount={20} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(3);
    });
  });
});
