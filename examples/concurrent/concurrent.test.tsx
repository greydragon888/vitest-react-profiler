import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { withProfiler } from "../../src";
import { DeferredExample } from "./components/DeferredExample";
import { TransitionExample } from "./components/TransitionExample";

describe("React 18+ Concurrent Features Examples", () => {
  describe("useTransition Example", () => {
    it("should track renders during search transitions", async () => {
      const ProfiledComponent = withProfiler(TransitionExample);

      render(<ProfiledComponent />);

      // Initial mount
      expect(ProfiledComponent).toHaveMountedOnce();
      expect(ProfiledComponent).toHaveRenderedTimes(1);

      // Type in search
      const input = screen.getByTestId("search-input");

      fireEvent.change(input, { target: { value: "app" } });

      // Wait for transition to complete
      await waitFor(() => {
        expect(screen.getByTestId("status")).toHaveTextContent("Ready");
      });

      // Verify renders were tracked
      // React may batch: input update + results update
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);

      // Verify results are shown
      expect(screen.getByTestId("results")).toBeInTheDocument();
    });

    it("should handle rapid typing with transitions", async () => {
      const ProfiledComponent = withProfiler(TransitionExample);

      render(<ProfiledComponent />);

      const input = screen.getByTestId("search-input");

      // Type rapidly
      fireEvent.change(input, { target: { value: "a" } });
      fireEvent.change(input, { target: { value: "ap" } });
      fireEvent.change(input, { target: { value: "app" } });

      // Wait for final transition
      await waitFor(() => {
        expect(screen.getByTestId("status")).toHaveTextContent("Ready");
      });

      // Multiple renders tracked (React may batch/interrupt)
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThan(1);

      // Final input value is correct
      expect(input).toHaveValue("app");
    });
  });

  describe("useDeferredValue Example", () => {
    it("should track renders with deferred list updates", async () => {
      const ProfiledComponent = withProfiler(DeferredExample);

      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveMountedOnce();

      // Type in filter
      const input = screen.getByTestId("filter-input");

      fireEvent.change(input, { target: { value: "test" } });

      // Wait for deferred value to update
      await waitFor(() => {
        expect(screen.getByTestId("deferred-value")).toHaveTextContent(
          "test",
        );
      });

      // Renders tracked: mount + input update + deferred update
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);
    });

    it("should show difference between immediate and deferred values", async () => {
      const ProfiledComponent = withProfiler(DeferredExample);

      render(<ProfiledComponent />);

      const input = screen.getByTestId("filter-input");

      // Change input
      fireEvent.change(input, { target: { value: "hello" } });

      // Immediate value updates instantly
      expect(screen.getByTestId("immediate-value")).toHaveTextContent(
        "hello",
      );

      // Deferred value updates later
      await waitFor(() => {
        expect(screen.getByTestId("deferred-value")).toHaveTextContent(
          "hello",
        );
      });

      // Profiler tracked all renders
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThan(1);
    });
  });

  describe("Profiler API consistency with Concurrent Features", () => {
    it("provides same API for concurrent components", () => {
      const ProfiledTransition = withProfiler(TransitionExample);
      const ProfiledDeferred = withProfiler(DeferredExample);

      // Same API regardless of concurrent features usage
      expect(typeof ProfiledTransition.getRenderCount).toBe("function");
      expect(typeof ProfiledTransition.getRenderHistory).toBe("function");
      expect(typeof ProfiledTransition.hasMounted).toBe("function");

      expect(typeof ProfiledDeferred.getRenderCount).toBe("function");
      expect(typeof ProfiledDeferred.getRenderHistory).toBe("function");
      expect(typeof ProfiledDeferred.hasMounted).toBe("function");
    });

    it("tracks render history correctly during transitions", async () => {
      const ProfiledComponent = withProfiler(TransitionExample);

      render(<ProfiledComponent />);

      const initialHistory = ProfiledComponent.getRenderHistory();
      expect(initialHistory).toStrictEqual(["mount"]);

      // Trigger transition
      const input = screen.getByTestId("search-input");

      fireEvent.change(input, { target: { value: "test" } });

      await waitFor(() => {
        expect(screen.getByTestId("status")).toHaveTextContent("Ready");
      });

      // History should start with mount, followed by updates
      const finalHistory = ProfiledComponent.getRenderHistory();
      expect(finalHistory[0]).toBe("mount");

      // All subsequent renders are updates or nested-updates
      const updates = finalHistory.slice(1);

      for (const phase of updates) {
        expect(["update", "nested-update"]).toContain(phase);
      }

      // History is frozen (immutable)
      expect(Object.isFrozen(finalHistory)).toBe(true);
    });
  });
});
