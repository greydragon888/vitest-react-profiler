/**
 * Unit tests for toEventuallyStabilize matcher
 *
 * Tests cover validation error messages and edge cases.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toEventuallyStabilize } from "@/matchers/async/stabilization";
import { withProfiler } from "@/profiler/components/withProfiler";
import { cacheMetrics } from "@/profiler/core/CacheMetrics";

import type { FC } from "react";

describe("toEventuallyStabilize matcher", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("Validation error messages", () => {
    it("should return validation error for non-profiled component", async () => {
      const result = await toEventuallyStabilize({});

      expect(result.pass).toBe(false);
      expect(result.message()).toContain("profiled component");
      expect(result.message()).toContain("withProfiler");
    });

    it("should return validation error for debounceMs <= 0", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 0,
        timeout: 100,
      });

      expect(result.pass).toBe(false);

      // Call message() to cover the lazy callback
      const message = result.message();

      expect(message).toContain("debounceMs");
      expect(message).toContain("positive number");
      expect(message).toContain("0");
    });

    it("should return validation error for negative debounceMs", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: -10,
        timeout: 100,
      });

      expect(result.pass).toBe(false);

      const message = result.message();

      expect(message).toContain("debounceMs");
      expect(message).toContain("-10");
    });

    it("should return validation error for timeout <= 0", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 10,
        timeout: 0,
      });

      expect(result.pass).toBe(false);

      // Call message() to cover the lazy callback
      const message = result.message();

      expect(message).toContain("timeout");
      expect(message).toContain("positive number");
      expect(message).toContain("0");
    });

    it("should return validation error for negative timeout", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 10,
        timeout: -50,
      });

      expect(result.pass).toBe(false);

      const message = result.message();

      expect(message).toContain("timeout");
      expect(message).toContain("-50");
    });

    it("should return validation error for NaN debounceMs", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: Number.NaN,
        timeout: 100,
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toContain("debounceMs");
    });

    it("should return validation error for Infinity timeout", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 10,
        timeout: Infinity,
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toContain("timeout");
    });

    it("should return validation error when debounceMs > timeout", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 100,
        timeout: 50,
      });

      expect(result.pass).toBe(false);

      const message = result.message();

      // Verify it's the MATCHER's validation message, not ProfilerAPI's
      expect(message).toBe(
        "Expected debounceMs (100) to be less than timeout (50)",
      );
    });

    it("should return validation error when debounceMs === timeout (exact equality)", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      // This tests the >= operator - debounceMs exactly equals timeout
      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 100,
        timeout: 100,
      });

      expect(result.pass).toBe(false);

      const message = result.message();

      // Verify it's the MATCHER's validation message (early return)
      expect(message).toBe(
        "Expected debounceMs (100) to be less than timeout (100)",
      );
    });
  });

  describe("Success message (for .not modifier)", () => {
    it("should return success message when component stabilizes", async () => {
      const TestComponent: FC = () => <div>test</div>;
      const ProfiledComponent = withProfiler(TestComponent);

      render(<ProfiledComponent />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 10,
        timeout: 100,
      });

      expect(result.pass).toBe(true);

      // Call message() to cover the lazy callback for .not case
      const message = result.message();

      // Verify exact message without any extra text (phaseInfo should be empty string)
      expect(message).toBe(
        "Expected component not to stabilize within 100ms, but it did after 0 renders",
      );
    });

    it("should include lastPhase in success message when renders occurred", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      const promise = toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 10,
        timeout: 200,
      });

      rerender(<ProfiledComponent value={1} />);

      const result = await promise;

      expect(result.pass).toBe(true);

      const message = result.message();

      expect(message).toContain("last phase");
      expect(message).toContain("update");
      expect(message).toContain("1 renders");
    });
  });

  describe("Error message content", () => {
    it("should include error message and render history on timeout", async () => {
      vi.useFakeTimers();

      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      // Start stabilization promise
      const resultPromise = toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 50,
        timeout: 100,
      });

      // Keep rendering to prevent stabilization
      let renderValue = 1;
      const intervalId = setInterval(() => {
        rerender(<ProfiledComponent value={renderValue++} />);
      }, 10);

      // Advance time to trigger timeout
      await vi.advanceTimersByTimeAsync(150);

      clearInterval(intervalId);

      const result = await resultPromise;

      expect(result.pass).toBe(false);

      // Message should contain error details
      const message = result.message();

      expect(message).toContain("StabilizationTimeoutError");
      expect(message).toContain("100ms");
      // Should include render history (contains "phase" from formatRenderHistory)
      expect(message).toContain("phase");

      vi.useRealTimers();
    });
  });

  describe("Cache behavior", () => {
    it("should record cache miss then cache hit on repeated calls", async () => {
      const TestComponent: FC<{ value: number }> = ({ value }) => (
        <div>{value}</div>
      );
      const ProfiledComponent = withProfiler(TestComponent);

      const { rerender } = render(<ProfiledComponent value={0} />);

      // Spy on cache metrics
      const recordMissSpy = vi.spyOn(cacheMetrics, "recordMiss");
      const recordHitSpy = vi.spyOn(cacheMetrics, "recordHit");

      // First call - should record cache miss
      const promise1 = ProfiledComponent.waitForStabilization({
        debounceMs: 10,
        timeout: 100,
      });

      rerender(<ProfiledComponent value={1} />);
      const result1 = await promise1;

      expect(result1.renderCount).toBe(1);
      expect(recordMissSpy).toHaveBeenCalledWith("closureCache");

      // Reset spies to track second call
      recordMissSpy.mockClear();
      recordHitSpy.mockClear();

      // Second call - should record cache hit (using cached ProfilerData)
      const promise2 = ProfiledComponent.waitForStabilization({
        debounceMs: 10,
        timeout: 100,
      });

      rerender(<ProfiledComponent value={2} />);
      const result2 = await promise2;

      expect(result2.renderCount).toBe(1);
      // This assertion kills the BlockStatement mutant that removes cacheMetrics.recordHit
      expect(recordHitSpy).toHaveBeenCalledWith("closureCache");
      // And cache miss should NOT have been called on second invocation
      expect(recordMissSpy).not.toHaveBeenCalled();
    });
  });
});
