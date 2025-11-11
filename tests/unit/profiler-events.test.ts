import { describe, expect, it, vi, expectTypeOf } from "vitest";

import { ProfilerEvents } from "@/profiler/core/ProfilerEvents";

import type { RenderEventInfo } from "@/profiler/core/ProfilerEvents";

describe("ProfilerEvents", () => {
  describe("subscribe()", () => {
    it("should add listener", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);

      expect(events.hasListeners()).toBe(true);
    });

    // eslint-disable-next-line vitest/expect-expect
    it("should return unsubscribe function", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      const unsubscribe = events.subscribe(listener);

      expectTypeOf(unsubscribe).toBeFunction();
    });
  });

  describe("emit()", () => {
    it("should call all listeners", () => {
      const events = new ProfilerEvents();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      events.subscribe(listener1);
      events.subscribe(listener2);
      events.subscribe(listener3);

      const eventInfo: RenderEventInfo = {
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      };

      events.emit(eventInfo);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("should pass correct data to listener", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);

      const eventInfo: RenderEventInfo = {
        count: 3,
        phase: "update",
        history: Object.freeze(["mount", "update", "update"]),
      };

      events.emit(eventInfo);

      expect(listener).toHaveBeenCalledWith({
        count: 3,
        phase: "update",
        history: ["mount", "update", "update"],
      });
    });

    it("should call listeners in order of subscription", () => {
      const events = new ProfilerEvents();
      const callOrder: number[] = [];

      const listener1 = vi.fn(() => callOrder.push(1));
      const listener2 = vi.fn(() => callOrder.push(2));
      const listener3 = vi.fn(() => callOrder.push(3));

      events.subscribe(listener1);
      events.subscribe(listener2);
      events.subscribe(listener3);

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      expect(callOrder).toStrictEqual([1, 2, 3]);
    });

    it("should not call any listeners if none are subscribed", () => {
      const events = new ProfilerEvents();

      // Should not throw
      expect(() => {
        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });
      }).not.toThrow();
    });
  });

  describe("unsubscribe()", () => {
    it("should remove listener", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      const unsubscribe = events.subscribe(listener);

      unsubscribe();

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should not call listener after unsubscribe", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      const unsubscribe = events.subscribe(listener);

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      events.emit({
        count: 2,
        phase: "update",
        history: Object.freeze(["mount", "update"]),
      });

      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should be safe to call multiple times", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      const unsubscribe = events.subscribe(listener);

      unsubscribe();
      unsubscribe(); // Second call
      unsubscribe(); // Third call

      // Should not throw
      expect(events.hasListeners()).toBe(false);

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should only remove specific listener", () => {
      const events = new ProfilerEvents();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      const unsubscribe1 = events.subscribe(listener1);

      events.subscribe(listener2);
      events.subscribe(listener3);

      unsubscribe1();

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });
  });

  describe("clear()", () => {
    it("should remove all listeners", () => {
      const events = new ProfilerEvents();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      events.subscribe(listener1);
      events.subscribe(listener2);
      events.subscribe(listener3);

      events.clear();

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
      expect(listener3).not.toHaveBeenCalled();
    });

    it("should update hasListeners() to false", () => {
      const events = new ProfilerEvents();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      events.subscribe(listener1);
      events.subscribe(listener2);

      expect(events.hasListeners()).toBe(true);

      events.clear();

      expect(events.hasListeners()).toBe(false);
    });

    it("should be safe to call when no listeners", () => {
      const events = new ProfilerEvents();

      expect(() => {
        events.clear();
      }).not.toThrow();

      expect(events.hasListeners()).toBe(false);
    });

    it("should be safe to call multiple times", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);
      events.clear();
      events.clear(); // Second call
      events.clear(); // Third call

      expect(events.hasListeners()).toBe(false);
    });
  });

  describe("hasListeners()", () => {
    it("should return false when no listeners", () => {
      const events = new ProfilerEvents();

      expect(events.hasListeners()).toBe(false);
    });

    it("should return true when listeners exist", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);

      expect(events.hasListeners()).toBe(true);
    });

    it("should return false after all listeners unsubscribe", () => {
      const events = new ProfilerEvents();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = events.subscribe(listener1);
      const unsubscribe2 = events.subscribe(listener2);

      expect(events.hasListeners()).toBe(true);

      unsubscribe1();

      expect(events.hasListeners()).toBe(true); // Still has listener2

      unsubscribe2();

      expect(events.hasListeners()).toBe(false); // Now empty
    });

    it("should return false after clear()", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);

      expect(events.hasListeners()).toBe(true);

      events.clear();

      expect(events.hasListeners()).toBe(false);
    });
  });

  describe("multiple subscriptions", () => {
    it("should handle same listener subscribed multiple times", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);
      events.subscribe(listener); // Same listener again

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      // Set only stores unique values, so listener called once
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should handle many listeners", () => {
      const events = new ProfilerEvents();
      const listeners = Array.from({ length: 100 }, () => vi.fn());

      listeners.forEach((listener) => events.subscribe(listener));

      events.emit({
        count: 1,
        phase: "mount",
        history: Object.freeze(["mount"]),
      });

      listeners.forEach((listener) => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle listener that throws error", () => {
      const events = new ProfilerEvents();
      const errorListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const normalListener = vi.fn();

      events.subscribe(errorListener);
      events.subscribe(normalListener);

      // emit() doesn't catch errors, so this will throw
      expect(() => {
        events.emit({
          count: 1,
          phase: "mount",
          history: Object.freeze(["mount"]),
        });
      }).toThrow("Listener error");

      // First listener was called (and threw)
      expect(errorListener).toHaveBeenCalledTimes(1);
      // Second listener was NOT called (error stopped iteration)
      expect(normalListener).not.toHaveBeenCalled();
    });

    it("should handle frozen history correctly", () => {
      const events = new ProfilerEvents();
      const listener = vi.fn();

      events.subscribe(listener);

      const history = Object.freeze(["mount", "update"] as const);

      events.emit({
        count: 2,
        phase: "update",
        history,
      });

      const receivedInfo = listener.mock.calls[0]![0];

      expect(receivedInfo.history).toBe(history); // Same reference
      expect(Object.isFrozen(receivedInfo.history)).toBe(true);
    });
  });
});
