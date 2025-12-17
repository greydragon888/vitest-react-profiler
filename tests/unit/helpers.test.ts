import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  cleanupAndResolve,
  cleanupAndResolveIfPhaseMatches,
  cleanupAndResolveStabilization,
} from "@/helpers";

describe("cleanupAndResolve", () => {
  let realTimeout: NodeJS.Timeout;

  beforeEach(() => {
    // Create a real timeout to test clearTimeout
    realTimeout = setTimeout(() => {}, 10_000);
  });

  afterEach(() => {
    // Cleanup: clear timeout if test didn't
    clearTimeout(realTimeout);
  });

  it("should call clearTimeout with the provided timeoutId", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { test: "data" };

    cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, value);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(realTimeout);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    clearTimeoutSpy.mockRestore();
  });

  it("should call unsubscribe callback", () => {
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { test: "data" };

    cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, value);

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalledWith();
  });

  it("should call resolve with the provided value", () => {
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { test: "data" };

    cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, value);

    expect(resolveMock).toHaveBeenCalledWith(value);
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });

  it("should perform all three operations (clearTimeout, unsubscribe, resolve)", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { pass: true, message: () => "test" };

    cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, value);

    // All three operations should be called
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(resolveMock).toHaveBeenCalledTimes(1);

    clearTimeoutSpy.mockRestore();
  });

  describe("Type safety and value passing", () => {
    it("should work with undefined value (Promise<void>)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, undefined);

      expect(resolveMock).toHaveBeenCalledWith(undefined);
    });

    it("should work with object values (matcher results)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const matcherResult = {
        pass: true,
        message: () => "Expected component to render",
        actual: 5,
        expected: 5,
      };

      cleanupAndResolve(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        matcherResult,
      );

      expect(resolveMock).toHaveBeenCalledWith(matcherResult);
    });

    it("should work with primitive values", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, 42);

      expect(resolveMock).toHaveBeenCalledWith(42);
    });

    it("should work with complex objects (RenderInfo)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const renderInfo = {
        phase: "update" as const,
        count: 3,
        timestamp: Date.now(),
      };

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, renderInfo);

      expect(resolveMock).toHaveBeenCalledWith(renderInfo);
    });
  });

  describe("Error handling and edge cases", () => {
    it("should not throw if unsubscribe throws an error", () => {
      const unsubscribeMock = vi.fn(() => {
        throw new Error("Unsubscribe failed");
      });
      const resolveMock = vi.fn();

      // Should throw because we don't handle errors
      expect(() => {
        cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, "value");
      }).toThrowError("Unsubscribe failed");

      // But clearTimeout should have been called before the error
      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });

    it("should handle no-op unsubscribe", () => {
      const unsubscribeMock = vi.fn(); // Does nothing
      const resolveMock = vi.fn();

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, null);

      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
      expect(resolveMock).toHaveBeenCalledWith(null);
    });
  });

  describe("Call order verification", () => {
    it("should call operations in the correct order: clearTimeout → unsubscribe → resolve", () => {
      const callOrder: string[] = [];
      const clearTimeoutSpy = vi
        .spyOn(globalThis, "clearTimeout")
        .mockImplementation(() => {
          callOrder.push("clearTimeout");
        });
      const unsubscribeMock = vi.fn(() => {
        callOrder.push("unsubscribe");
      });
      const resolveMock = vi.fn(() => {
        callOrder.push("resolve");
      });

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, "value");

      expect(callOrder).toStrictEqual([
        "clearTimeout",
        "unsubscribe",
        "resolve",
      ]);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("Real-world usage scenarios", () => {
    it("should work in async matcher context (toEventuallyReachPhase)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const matcherResult = {
        pass: true,
        message: () =>
          'Expected component not to eventually reach phase "update" within 1000ms, but it did',
      };

      cleanupAndResolve(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        matcherResult,
      );

      expect(resolveMock).toHaveBeenCalledWith(matcherResult);
      expect(matcherResult.message()).toContain("update");
    });

    it("should work in async utility context (waitForRenders)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, undefined);

      expect(resolveMock).toHaveBeenCalledWith(undefined);
    });

    it("should work in API context (waitForNextRender)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const renderInfo = {
        phase: "mount" as const,
        count: 1,
      };

      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, renderInfo);

      expect(resolveMock).toHaveBeenCalledWith(renderInfo);
    });
  });

  describe("Memory leak prevention", () => {
    it("should clear timeout to prevent memory leaks", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      // Simulate multiple async operations
      const timeout1 = setTimeout(() => {}, 5000);
      const timeout2 = setTimeout(() => {}, 5000);
      const timeout3 = setTimeout(() => {}, 5000);

      cleanupAndResolve(timeout1, unsubscribeMock, resolveMock, "result1");
      cleanupAndResolve(timeout2, unsubscribeMock, resolveMock, "result2");
      cleanupAndResolve(timeout3, unsubscribeMock, resolveMock, "result3");

      // All timeouts should be cleared
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout2);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout3);

      clearTimeoutSpy.mockRestore();
    });

    it("should unsubscribe to prevent memory leaks from event listeners", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      // Simulate multiple subscriptions
      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, "result1");
      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, "result2");
      cleanupAndResolve(realTimeout, unsubscribeMock, resolveMock, "result3");

      // All subscriptions should be cleaned up
      expect(unsubscribeMock).toHaveBeenCalledTimes(3);
    });
  });
});

describe("cleanupAndResolveIfPhaseMatches", () => {
  let realTimeout: NodeJS.Timeout;

  beforeEach(() => {
    realTimeout = setTimeout(() => {}, 10_000);
  });

  afterEach(() => {
    clearTimeout(realTimeout);
  });

  describe("When phases MATCH (should cleanup and resolve)", () => {
    it("should call all three operations when phases match", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const value = { test: "data" };

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        value,
        "update", // actual
        "update", // expected - MATCH!
      );

      expect(clearTimeoutSpy).toHaveBeenCalledWith(realTimeout);
      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
      expect(resolveMock).toHaveBeenCalledWith(value);

      clearTimeoutSpy.mockRestore();
    });

    it("should work with mount phase", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        undefined,
        "mount",
        "mount",
      );

      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
      expect(resolveMock).toHaveBeenCalledWith(undefined);
    });

    it("should work with nested-update phase", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        undefined,
        "nested-update",
        "nested-update",
      );

      expect(unsubscribeMock).toHaveBeenCalledTimes(1);
      expect(resolveMock).toHaveBeenCalledWith(undefined);
    });
  });

  describe("When phases DON'T MATCH (should NOT cleanup/resolve)", () => {
    it("should NOT call clearTimeout when phases don't match", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        undefined,
        "mount", // actual
        "update", // expected - DON'T match!
      );

      // Critical: should NOT have called anything
      expect(clearTimeoutSpy).not.toHaveBeenCalled();
      expect(unsubscribeMock).not.toHaveBeenCalled();
      expect(resolveMock).not.toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should NOT resolve when actual="mount", expected="update"', () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        { pass: false },
        "mount",
        "update",
      );

      expect(resolveMock).not.toHaveBeenCalled();
    });

    it('should NOT resolve when actual="update", expected="mount"', () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        { pass: false },
        "update",
        "mount",
      );

      expect(resolveMock).not.toHaveBeenCalled();
    });

    it('should NOT resolve when actual="update", expected="nested-update"', () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        { pass: false },
        "update",
        "nested-update",
      );

      expect(resolveMock).not.toHaveBeenCalled();
    });

    it('should NOT unsubscribe when actual="nested-update", expected="mount"', () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        undefined,
        "nested-update",
        "mount",
      );

      expect(unsubscribeMock).not.toHaveBeenCalled();
    });
  });

  describe("Call order verification when phases match", () => {
    it("should call operations in correct order: clearTimeout → unsubscribe → resolve", () => {
      const callOrder: string[] = [];
      const clearTimeoutSpy = vi
        .spyOn(globalThis, "clearTimeout")
        .mockImplementation(() => {
          callOrder.push("clearTimeout");
        });
      const unsubscribeMock = vi.fn(() => {
        callOrder.push("unsubscribe");
      });
      const resolveMock = vi.fn(() => {
        callOrder.push("resolve");
      });

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        "value",
        "update",
        "update",
      );

      expect(callOrder).toStrictEqual([
        "clearTimeout",
        "unsubscribe",
        "resolve",
      ]);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("Real-world usage scenarios", () => {
    it("should work in async phase matcher context", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const matcherResult = {
        pass: true,
        message: () => 'Component reached phase "update"',
      };

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        matcherResult,
        "update",
        "update",
      );

      expect(resolveMock).toHaveBeenCalledWith(matcherResult);
    });

    it("should NOT resolve if wrong phase in matcher context", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const matcherResult = {
        pass: true,
        message: () => "Should not be called",
      };

      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        matcherResult,
        "mount", // Got mount
        "update", // Expected update
      );

      // Should NOT resolve on wrong phase
      expect(resolveMock).not.toHaveBeenCalled();
    });
  });

  describe("Type safety", () => {
    it("should work with various value types", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      // undefined
      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        undefined,
        "mount",
        "mount",
      );

      // object
      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        { test: 123 },
        "update",
        "update",
      );

      // primitive
      cleanupAndResolveIfPhaseMatches(
        realTimeout,
        unsubscribeMock,
        resolveMock,
        42,
        "nested-update",
        "nested-update",
      );

      expect(resolveMock).toHaveBeenCalledTimes(3);
    });
  });
});

describe("cleanupAndResolveStabilization", () => {
  let realTimeout: NodeJS.Timeout;
  let realDebounce: NodeJS.Timeout;

  beforeEach(() => {
    realTimeout = setTimeout(() => {}, 10_000);
    realDebounce = setTimeout(() => {}, 10_000);
  });

  afterEach(() => {
    clearTimeout(realTimeout);
    clearTimeout(realDebounce);
  });

  it("should clear both timeoutId and debounceId", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { renderCount: 5, lastPhase: "update" as const };

    cleanupAndResolveStabilization(
      realTimeout,
      realDebounce,
      unsubscribeMock,
      resolveMock,
      value,
    );

    expect(clearTimeoutSpy).toHaveBeenCalledWith(realTimeout);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(realDebounce);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);

    clearTimeoutSpy.mockRestore();
  });

  it("should call unsubscribe callback", () => {
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { renderCount: 3 };

    cleanupAndResolveStabilization(
      realTimeout,
      realDebounce,
      unsubscribeMock,
      resolveMock,
      value,
    );

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it("should call resolve with the provided value", () => {
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { renderCount: 10, lastPhase: "nested-update" as const };

    cleanupAndResolveStabilization(
      realTimeout,
      realDebounce,
      unsubscribeMock,
      resolveMock,
      value,
    );

    expect(resolveMock).toHaveBeenCalledWith(value);
    expect(resolveMock).toHaveBeenCalledTimes(1);
  });

  it("should perform all four operations (clearTimeout x2, unsubscribe, resolve)", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
    const unsubscribeMock = vi.fn();
    const resolveMock = vi.fn();
    const value = { renderCount: 0 };

    cleanupAndResolveStabilization(
      realTimeout,
      realDebounce,
      unsubscribeMock,
      resolveMock,
      value,
    );

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    expect(resolveMock).toHaveBeenCalledTimes(1);

    clearTimeoutSpy.mockRestore();
  });

  describe("Call order verification", () => {
    it("should call operations in correct order: clearTimeout(timeout) → clearTimeout(debounce) → unsubscribe → resolve", () => {
      const callOrder: string[] = [];
      let clearTimeoutCallCount = 0;
      const clearTimeoutSpy = vi
        .spyOn(globalThis, "clearTimeout")
        .mockImplementation(() => {
          clearTimeoutCallCount++;
          callOrder.push(`clearTimeout-${clearTimeoutCallCount}`);
        });
      const unsubscribeMock = vi.fn(() => {
        callOrder.push("unsubscribe");
      });
      const resolveMock = vi.fn(() => {
        callOrder.push("resolve");
      });

      cleanupAndResolveStabilization(
        realTimeout,
        realDebounce,
        unsubscribeMock,
        resolveMock,
        { renderCount: 5 },
      );

      expect(callOrder).toStrictEqual([
        "clearTimeout-1",
        "clearTimeout-2",
        "unsubscribe",
        "resolve",
      ]);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("StabilizationResult value types", () => {
    it("should work with renderCount only (no lastPhase)", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const value = { renderCount: 0 };

      cleanupAndResolveStabilization(
        realTimeout,
        realDebounce,
        unsubscribeMock,
        resolveMock,
        value,
      );

      expect(resolveMock).toHaveBeenCalledWith({ renderCount: 0 });
    });

    it("should work with mount phase", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const value = { renderCount: 1, lastPhase: "mount" as const };

      cleanupAndResolveStabilization(
        realTimeout,
        realDebounce,
        unsubscribeMock,
        resolveMock,
        value,
      );

      expect(resolveMock).toHaveBeenCalledWith(value);
    });

    it("should work with update phase", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const value = { renderCount: 100, lastPhase: "update" as const };

      cleanupAndResolveStabilization(
        realTimeout,
        realDebounce,
        unsubscribeMock,
        resolveMock,
        value,
      );

      expect(resolveMock).toHaveBeenCalledWith(value);
    });

    it("should work with nested-update phase", () => {
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();
      const value = { renderCount: 50, lastPhase: "nested-update" as const };

      cleanupAndResolveStabilization(
        realTimeout,
        realDebounce,
        unsubscribeMock,
        resolveMock,
        value,
      );

      expect(resolveMock).toHaveBeenCalledWith(value);
    });
  });

  describe("Memory leak prevention", () => {
    it("should clear both timers to prevent memory leaks", () => {
      const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");
      const unsubscribeMock = vi.fn();
      const resolveMock = vi.fn();

      const timeout1 = setTimeout(() => {}, 5000);
      const debounce1 = setTimeout(() => {}, 5000);

      cleanupAndResolveStabilization(
        timeout1,
        debounce1,
        unsubscribeMock,
        resolveMock,
        { renderCount: 1 },
      );

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(debounce1);

      clearTimeoutSpy.mockRestore();
    });
  });
});
