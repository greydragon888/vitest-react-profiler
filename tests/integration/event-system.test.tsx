/**
 * Event System - Integration Tests
 *
 * Comprehensive end-to-end testing of the event-based architecture (v1.6.0).
 * Tests cover real-world usage scenarios, performance requirements, and error handling.
 *
 * @since v1.6.0
 */

import { render } from "@testing-library/react";
import { StrictMode, useState, useEffect } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";
import {
  waitForRenders,
  waitForPhase,
  waitForMinimumRenders,
} from "@/utils/async";

import type { FC } from "react";

describe("Event System - Integration Tests", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("End-to-end flows", () => {
    it("onRender + manual rerender", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Manual rerenders
      rerender(<ProfiledComponent value={2} />);
      rerender(<ProfiledComponent value={3} />);
      rerender(<ProfiledComponent value={4} />);

      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener).toHaveBeenNthCalledWith(1, {
        count: 2,
        phase: "update",
        history: ["mount", "update"],
      });
      expect(listener).toHaveBeenNthCalledWith(3, {
        count: 4,
        phase: "update",
        history: ["mount", "update", "update", "update"],
      });
    });

    it("waitForNextRender + async state updates", async () => {
      const TestComponent: FC = () => {
        const [count, setCount] = useState(0);

        useEffect(() => {
          const timer = setTimeout(() => {
            setCount(1);
          }, 50);

          return () => {
            clearTimeout(timer);
          };
        }, []);

        return <div>{count}</div>;
      };

      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      expect(ProfiledComponent.getRenderCount()).toBe(1);

      // Wait for async state update
      const info = await ProfiledComponent.waitForNextRender({
        timeout: 200,
      });

      expect(info.count).toBe(2);
      expect(info.phase).toBe("update");
      expect(ProfiledComponent.getRenderCount()).toBe(2);
    });

    it("Multiple components with separate event systems", () => {
      const ComponentA: FC<{ value: number }> = ({ value }) => (
        <div>A: {value}</div>
      );
      const ComponentB: FC<{ value: number }> = ({ value }) => (
        <div>B: {value}</div>
      );

      const ProfiledA = withProfiler(ComponentA);
      const ProfiledB = withProfiler(ComponentB);

      const { rerender: rerenderA } = render(<ProfiledA value={1} />);
      const { rerender: rerenderB } = render(<ProfiledB value={1} />);

      // Separate listeners for each component
      const listenerA = vi.fn();
      const listenerB = vi.fn();

      ProfiledA.onRender(listenerA);
      ProfiledB.onRender(listenerB);

      // Rerender only A
      rerenderA(<ProfiledA value={2} />);

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).not.toHaveBeenCalled();

      // Rerender only B
      rerenderB(<ProfiledB value={2} />);

      expect(listenerA).toHaveBeenCalledTimes(1);
      expect(listenerB).toHaveBeenCalledTimes(1);

      // Each component maintains independent state
      expect(ProfiledA.getRenderCount()).toBe(2);
      expect(ProfiledB.getRenderCount()).toBe(2);
    });

    it("Events + matchers integration", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Setup event listener
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Use async matcher
      const matcherPromise = expect(ProfiledComponent).toEventuallyRenderTimes(
        5,
        { timeout: 500 },
      );

      // Trigger renders
      rerender(<ProfiledComponent value={2} />);
      rerender(<ProfiledComponent value={3} />);
      rerender(<ProfiledComponent value={4} />);
      rerender(<ProfiledComponent value={5} />);

      // Wait for matcher to resolve
      await matcherPromise;

      // Event listener should have captured all renders (except initial mount)
      expect(listener).toHaveBeenCalledTimes(4);

      // Sync matcher should work with current state
      expect(ProfiledComponent).toHaveRenderedTimes(5);

      // Event data should match current state
      const lastCall = listener.mock.calls.at(-1)![0];

      expect(lastCall.count).toBe(5);
      expect(lastCall.phase).toBe("update");
    });

    it("Events + utilities integration", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Setup event listener
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Use waitForRenders utility
      const utilityPromise = waitForRenders(ProfiledComponent, 5, {
        timeout: 500,
      });

      // Trigger renders
      rerender(<ProfiledComponent value={2} />);
      rerender(<ProfiledComponent value={3} />);
      rerender(<ProfiledComponent value={4} />);
      rerender(<ProfiledComponent value={5} />);

      // Wait for utility to resolve
      await utilityPromise;

      // Event listener should have captured all renders
      expect(listener).toHaveBeenCalledTimes(4);

      // Test waitForPhase utility
      const phasePromise = waitForPhase(ProfiledComponent, "update", {
        timeout: 100,
      });

      // Resolve immediately (already has update phase)
      await phasePromise;

      expect(ProfiledComponent.getRenderHistory()).toContain("update");

      // Test waitForMinimumRenders utility
      await waitForMinimumRenders(ProfiledComponent, 3, { timeout: 100 });

      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Complex scenarios", () => {
    it("Nested components with events", () => {
      const Child: FC<{ value: number }> = ({ value }) => (
        <div>Child: {value}</div>
      );
      const Parent: FC<{ value: number }> = ({ value }) => (
        <div>
          Parent: {value}
          <ProfiledChild value={value * 2} />
        </div>
      );

      const ProfiledParent = withProfiler(Parent);
      const ProfiledChild = withProfiler(Child);

      const { rerender } = render(<ProfiledParent value={1} />);

      // Setup separate listeners
      const parentListener = vi.fn();
      const childListener = vi.fn();

      ProfiledParent.onRender(parentListener);
      ProfiledChild.onRender(childListener);

      // Rerender parent (triggers both)
      rerender(<ProfiledParent value={2} />);

      // Both listeners should be called
      expect(parentListener).toHaveBeenCalledTimes(1);
      expect(childListener).toHaveBeenCalledTimes(1);

      // Verify independent event data
      expect(parentListener).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2,
          phase: "update",
        }),
      );

      expect(childListener).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2,
          phase: "update",
        }),
      );

      // Each component maintains independent counts
      expect(ProfiledParent.getRenderCount()).toBe(2);
      expect(ProfiledChild.getRenderCount()).toBe(2);
    });

    it("Events during StrictMode double-render", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      render(
        <StrictMode>
          <ProfiledComponent value={1} />
        </StrictMode>,
      );

      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // StrictMode may cause double rendering in development
      const initialCount = ProfiledComponent.getRenderCount();

      expect(initialCount).toBeGreaterThanOrEqual(1);

      // Even with double-render, event system should work correctly
      expect(listener).not.toHaveBeenCalled(); // Subscribed after initial render
    });

    it("Events with fast sequential renders (100+ renders)", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Trigger 150 fast sequential renders
      for (let i = 1; i <= 150; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      // All renders should be captured
      expect(listener).toHaveBeenCalledTimes(150);
      expect(ProfiledComponent.getRenderCount()).toBe(151); // 1 mount + 150 updates

      // Verify last event has correct data
      const lastCall = listener.mock.calls[149]![0];

      expect(lastCall.count).toBe(151);
      expect(lastCall.phase).toBe("update");
      expect(lastCall.history).toHaveLength(151);
    });

    it("Memory leaks - cleanup listeners", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Create multiple listeners
      const listeners = Array.from({ length: 10 }, () => vi.fn());
      const unsubscribes = listeners.map((listener) =>
        ProfiledComponent.onRender(listener),
      );

      // Trigger render
      rerender(<ProfiledComponent value={2} />);

      // All listeners called
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1);
      });

      // Unsubscribe all
      unsubscribes.forEach((unsub) => {
        unsub();
      });

      // Trigger another render
      rerender(<ProfiledComponent value={3} />);

      // No listeners should be called (cleanup successful)
      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1); // Still 1, not 2
      });
    });

    it("Race conditions - parallel subscriptions and renders", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Create multiple parallel waiters
      const promises = [
        ProfiledComponent.waitForNextRender(),
        ProfiledComponent.waitForNextRender(),
        ProfiledComponent.waitForNextRender(),
      ];

      // Also add regular listener
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Trigger single render
      rerender(<ProfiledComponent value={2} />);

      // All promises should resolve with same data
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);

      results.forEach((info) => {
        expect(info.count).toBe(2);
        expect(info.phase).toBe("update");
      });

      // Regular listener also called once
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling", () => {
    it("waitForNextRender timeout", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent value={1} />);

      // Wait without triggering render
      const promise = ProfiledComponent.waitForNextRender({ timeout: 100 });

      await expect(promise).rejects.toThrowError(
        "Timeout: No render occurred within 100ms",
      );

      // Component should still be usable after timeout
      expect(ProfiledComponent.getRenderCount()).toBe(1);
    });

    it("Unsubscribe after component unmount", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender, unmount } = render(<ProfiledComponent value={1} />);

      const listener = vi.fn();
      const unsubscribe = ProfiledComponent.onRender(listener);

      // Trigger render
      rerender(<ProfiledComponent value={2} />);

      expect(listener).toHaveBeenCalledTimes(1);

      // Unmount component
      unmount();

      // Unsubscribe should be safe after unmount
      expect(() => {
        unsubscribe();
      }).not.toThrowError();

      // Can call multiple times safely
      expect(() => {
        unsubscribe();
        unsubscribe();
      }).not.toThrowError();
    });

    it("onRender with error in listener", () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      const goodListener1 = vi.fn();
      const errorListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const goodListener2 = vi.fn();

      // Subscribe all listeners
      ProfiledComponent.onRender(goodListener1);
      ProfiledComponent.onRender(errorListener);
      ProfiledComponent.onRender(goodListener2);

      // Trigger render
      // Note: Error in listener will throw, but we need to catch it
      expect(() => {
        rerender(<ProfiledComponent value={2} />);
      }).toThrowError("Listener error");

      // First listener should have been called before error
      expect(goodListener1).toHaveBeenCalledTimes(1);

      // Error listener was called and threw
      expect(errorListener).toHaveBeenCalledTimes(1);

      // Second listener may or may not be called depending on implementation
      // Current implementation: error propagates immediately, so goodListener2 is NOT called
      // This is expected behavior - errors in listeners should be handled by the caller

      // Component should still be in valid state
      expect(ProfiledComponent.getRenderCount()).toBe(2);

      // Can unsubscribe error listener and continue
      const unsubscribe = ProfiledComponent.onRender(errorListener);

      unsubscribe();

      // Now renders should work without errors
      expect(() => {
        rerender(<ProfiledComponent value={3} />);
      }).not.toThrowError();

      expect(goodListener1).toHaveBeenCalledTimes(2);
    });
  });
});
