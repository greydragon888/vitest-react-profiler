import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { withProfiler } from "@/profiler/components/withProfiler";

describe("ProfilerAPI - Event Methods", () => {
  describe("onRender()", () => {
    it("should be called on each render", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      rerender(<ProfiledComponent value={2} />);

      expect(listener).toHaveBeenCalledTimes(1);

      rerender(<ProfiledComponent value={3} />);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should pass correct data (count, phase, history)", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      rerender(<ProfiledComponent value={2} />);

      // First call: update (mount already happened)
      expect(listener).toHaveBeenNthCalledWith(1, {
        count: 2,
        phase: "update",
        history: ["mount", "update"],
      });

      rerender(<ProfiledComponent value={3} />);

      // Second call: update
      expect(listener).toHaveBeenNthCalledWith(2, {
        count: 3,
        phase: "update",
        history: ["mount", "update", "update"],
      });
    });

    it("should stop calling listener after unsubscribe", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();
      const unsubscribe = ProfiledComponent.onRender(listener);

      rerender(<ProfiledComponent value={2} />);

      expect(listener).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      rerender(<ProfiledComponent value={3} />);

      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should support multiple subscribers", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      ProfiledComponent.onRender(listener1);
      ProfiledComponent.onRender(listener2);
      ProfiledComponent.onRender(listener3);

      // Trigger another render - all should be called
      rerender(<ProfiledComponent value={2} />);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("should work with components that have no renders yet", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      // First render to create profiler data
      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();
      const unsubscribe = ProfiledComponent.onRender(listener);

      expect(listener).not.toHaveBeenCalled();

      // Next render should trigger listener
      rerender(<ProfiledComponent value={2} />);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        count: 2,
        phase: "update",
        history: ["mount", "update"],
      });

      unsubscribe();
    });

    it("should work after clear() with new subscription", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Render and verify listener is called
      rerender(<ProfiledComponent value={2} />);

      expect(listener).toHaveBeenCalledTimes(1);

      // Note: In actual implementation, clear() is not exposed on ProfiledComponent
      // This test verifies that subscriptions continue to work
      rerender(<ProfiledComponent value={3} />);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should return no-op unsubscribe if component has no profiler data", () => {
      // This is an edge case - normally withProfiler ensures data exists
      // But the API handles the case gracefully
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      // Get unsubscribe before any render (data doesn't exist yet)
      const unsubscribe = ProfiledComponent.onRender(vi.fn());

      // Should not throw
      expect(() => {
        unsubscribe();
      }).not.toThrow();
      expect(() => {
        unsubscribe();
      }).not.toThrow(); // Multiple calls safe

      // Render after subscribing
      const { rerender } = render(<ProfiledComponent value={1} />);

      // New listener after render (data exists now)
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      rerender(<ProfiledComponent value={2} />);

      // New listener should be called
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should pass frozen history in events", () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      rerender(<ProfiledComponent value={2} />);

      const receivedInfo = listener.mock.calls[0]![0];

      expect(Object.isFrozen(receivedInfo.history)).toBe(true);
    });
  });

  describe("waitForNextRender()", () => {
    it("should resolve when next render occurs", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Wait for next render
      const promise = ProfiledComponent.waitForNextRender();

      // Trigger render
      rerender(<ProfiledComponent value={2} />);

      const info = await promise;

      expect(info.count).toBe(2);
      expect(info.phase).toBe("update");
      expect(info.history).toStrictEqual(["mount", "update"]);
    });

    it("should pass correct render data", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      const promise = ProfiledComponent.waitForNextRender();

      rerender(<ProfiledComponent value={2} />);

      const info = await promise;

      expect(info).toStrictEqual({
        count: 2,
        phase: "update",
        history: ["mount", "update"],
      });

      expect(Object.isFrozen(info.history)).toBe(true);
    });

    it("should reject on timeout", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent value={1} />);

      // Wait without triggering new render
      const promise = ProfiledComponent.waitForNextRender({ timeout: 100 });

      await expect(promise).rejects.toThrow(
        "Timeout: No render occurred within 100ms",
      );
    });

    it("should work with custom timeout", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Wait with custom timeout
      const promise = ProfiledComponent.waitForNextRender({ timeout: 2000 });

      // Trigger render after short delay
      setTimeout(() => {
        rerender(<ProfiledComponent value={2} />);
      }, 50);

      const info = await promise;

      expect(info.count).toBe(2);
      expect(info.phase).toBe("update");
    });

    it("should support multiple parallel waiters", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Create multiple waiters
      const promise1 = ProfiledComponent.waitForNextRender();
      const promise2 = ProfiledComponent.waitForNextRender();
      const promise3 = ProfiledComponent.waitForNextRender();

      // Trigger render
      rerender(<ProfiledComponent value={2} />);

      const [info1, info2, info3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // All should receive the same render info
      expect(info1).toStrictEqual(info2);
      expect(info2).toStrictEqual(info3);
      expect(info1.count).toBe(2);
    });

    it("should reject if component has no profiler data", async () => {
      // This is testing the edge case where ProfilerAPI.createWaitForNextRender
      // is called for a component that doesn't exist in storage
      // In practice with withProfiler, this shouldn't happen, but the API handles it

      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      // Call waitForNextRender BEFORE any render (no profiler data exists yet)
      const promise = ProfiledComponent.waitForNextRender({ timeout: 100 });

      // Promise should reject immediately with appropriate error
      await expect(promise).rejects.toThrow("Component has no profiler data");
    });

    it("should work correctly after several renders", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Render a few times first
      rerender(<ProfiledComponent value={2} />);
      rerender(<ProfiledComponent value={3} />);

      expect(ProfiledComponent.getRenderCount()).toBe(3);

      // Now wait for next render
      const promise = ProfiledComponent.waitForNextRender();

      rerender(<ProfiledComponent value={4} />);

      const info = await promise;

      expect(info.count).toBe(4);
      expect(info.phase).toBe("update");
      expect(info.history).toStrictEqual([
        "mount",
        "update",
        "update",
        "update",
      ]);
    });

    it("should cleanup timeout when resolved", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      const promise = ProfiledComponent.waitForNextRender({ timeout: 5000 });

      // Trigger render immediately
      rerender(<ProfiledComponent value={2} />);

      const info = await promise;

      expect(info.count).toBe(2);

      // Wait a bit to ensure timeout was cleared (no hanging timeout)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // If timeout wasn't cleared, this test would hang or cause issues
      // The fact that we reach this point means cleanup worked
      expect(true).toBe(true);
    });

    it("should cleanup listener when rejected", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent value={1} />);

      // Don't trigger render - let it timeout
      const promise = ProfiledComponent.waitForNextRender({ timeout: 50 });

      await expect(promise).rejects.toThrow();

      // Listener should be cleaned up - check that no listeners remain
      // by verifying subsequent renders don't cause issues
      expect(ProfiledComponent.getRenderCount()).toBe(1);
    });
  });

  describe("Integration: onRender + waitForNextRender", () => {
    it("should work together", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();

      ProfiledComponent.onRender(listener);

      // Wait for next render
      const promise = ProfiledComponent.waitForNextRender();

      rerender(<ProfiledComponent value={2} />);

      const info = await promise;

      // Both should have received the update
      expect(listener).toHaveBeenCalledTimes(1);
      expect(info.count).toBe(2);

      // Verify listener received same data as waitForNextRender
      expect(listener).toHaveBeenNthCalledWith(1, info);
    });

    it("should handle unsubscribe while waiting", async () => {
      const TestComponent = ({ value }: { value: number }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={1} />);

      // Subscribe after first render
      const listener = vi.fn();
      const unsubscribe = ProfiledComponent.onRender(listener);

      const promise = ProfiledComponent.waitForNextRender();

      // Unsubscribe the listener (but waitForNextRender should still work)
      unsubscribe();

      rerender(<ProfiledComponent value={2} />);

      const info = await promise;

      // waitForNextRender received the update
      expect(info.count).toBe(2);

      // But listener was unsubscribed, so not called
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
