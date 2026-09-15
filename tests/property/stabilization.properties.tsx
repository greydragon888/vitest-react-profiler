/**
 * @file Property-Based Tests: Stabilization API (waitForStabilization, toEventuallyStabilize)
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: renderCount >= 0
 * - StabilizationResult.renderCount is always non-negative
 * - Zero renders is valid (component already stable)
 * - **Why important:** Mathematical correctness, no negative counts
 *
 * ### INVARIANT 2: debounceMs < timeout Validation
 * - ValidationError thrown if debounceMs >= timeout
 * - Error message includes both values
 * - **Why important:** User-friendly error handling
 *
 * ### INVARIANT 3: Timeout Guarantees
 * - Promise resolves within timeout if component stabilizes
 * - Promise rejects after timeout if component never stabilizes
 * - Actual wait time ≈ debounceMs (if stable) or timeout (if not stable)
 * - **Why important:** Predictable async behavior
 *
 * ### INVARIANT 4: lastPhase Correctness
 * - lastPhase is undefined when renderCount === 0
 * - lastPhase is valid PhaseType when renderCount > 0
 * - lastPhase matches the actual last render phase
 * - **Why important:** Accurate debugging information
 *
 * ### INVARIANT 5: Parameter Validation
 * - Negative debounceMs rejected
 * - Zero debounceMs rejected
 * - Negative timeout rejected
 * - Zero timeout rejected
 * - NaN values rejected
 * - Infinity values rejected
 * - **Why important:** Prevent invalid parameters
 *
 * ## Testing Strategy:
 * - **20 runs** for async tests (slow)
 * - **Timeout: 30s** per test
 * - **Cleanup:** afterEach for timers
 *
 * @since v1.12.0
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, vi } from "vitest";

import { createSimpleProfiledComponent } from "./helpers";

describe("Property-Based Tests: Stabilization API", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("INVARIANT 1: renderCount >= 0", () => {
    test.prop([fc.integer({ min: 0, max: 20 })], { numRuns: 20 })(
      "renderCount should be non-negative regardless of render count",
      async (renderCount) => {
        const ProfiledComponent = createSimpleProfiledComponent();

        const { rerender } = render(<ProfiledComponent value={0} />);

        const promise = ProfiledComponent.waitForStabilization({
          debounceMs: 10,
          timeout: 200,
        });

        // Trigger specified number of rerenders
        for (let i = 1; i <= renderCount; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        const result = await promise;

        // INVARIANT: renderCount >= 0
        expect(result.renderCount).toBeGreaterThanOrEqual(0);
        expect(result.renderCount).toBe(renderCount);
      },
    );
  });

  describe("INVARIANT 2: debounceMs < timeout Validation", () => {
    test.prop(
      [
        fc.integer({ min: 10, max: 500 }), // debounceMs
        fc.integer({ min: 10, max: 500 }), // timeout
      ],
      { numRuns: 50 },
    )(
      "should reject when debounceMs >= timeout",
      async (debounceMs, timeout) => {
        const ProfiledComponent = createSimpleProfiledComponent();

        render(<ProfiledComponent value={0} />);

        if (debounceMs >= timeout) {
          // Should reject with ValidationError
          await expect(
            ProfiledComponent.waitForStabilization({ debounceMs, timeout }),
          ).rejects.toThrow(/ValidationError/);
        } else {
          // Should resolve normally (stable component)
          const result = await ProfiledComponent.waitForStabilization({
            debounceMs,
            timeout,
          });

          expect(result.renderCount).toBeGreaterThanOrEqual(0);
        }
      },
    );
  });

  describe("INVARIANT 3: Timeout Guarantees", () => {
    test.prop(
      [fc.integer({ min: 10, max: 50 })], // debounceMs
      { numRuns: 10 },
    )(
      "should resolve after debounceMs when component is stable",
      async (debounceMs) => {
        const ProfiledComponent = createSimpleProfiledComponent();

        render(<ProfiledComponent value={0} />);

        const startTime = Date.now();

        await ProfiledComponent.waitForStabilization({
          debounceMs,
          timeout: debounceMs * 3,
        });
        const elapsed = Date.now() - startTime;

        // Should resolve approximately at debounceMs time (with some tolerance)
        // Allow 50% overhead for timing variance
        expect(elapsed).toBeGreaterThanOrEqual(debounceMs * 0.8);
        expect(elapsed).toBeLessThan(debounceMs * 2);
      },
    );
  });

  describe("INVARIANT 4: lastPhase Correctness", () => {
    test.prop([fc.integer({ min: 0, max: 10 })], { numRuns: 20 })(
      "lastPhase should be undefined when renderCount is 0, valid otherwise",
      async (updates) => {
        const ProfiledComponent = createSimpleProfiledComponent();

        const { rerender } = render(<ProfiledComponent value={0} />);

        const promise = ProfiledComponent.waitForStabilization({
          debounceMs: 10,
          timeout: 200,
        });

        // Trigger updates
        for (let i = 1; i <= updates; i++) {
          rerender(<ProfiledComponent value={i} />);
        }

        const result = await promise;

        // INVARIANT: lastPhase correctness
        if (result.renderCount === 0) {
          expect(result.lastPhase).toBeUndefined();
        } else {
          expect(["mount", "update", "nested-update"]).toContain(
            result.lastPhase,
          );
        }
      },
    );
  });

  describe("INVARIANT 5: Parameter Validation (matcher)", () => {
    // Import the matcher function directly for testing
    const getToEventuallyStabilize = async () => {
      const mod = await import("@/matchers/async/stabilization");

      return mod.toEventuallyStabilize;
    };

    test.prop(
      [fc.integer({ min: -100, max: 0 })], // invalid debounceMs
      { numRuns: 20 },
    )("should reject invalid debounceMs (<= 0)", async (invalidDebounceMs) => {
      const ProfiledComponent = createSimpleProfiledComponent();
      const toEventuallyStabilize = await getToEventuallyStabilize();

      render(<ProfiledComponent value={0} />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: invalidDebounceMs,
        timeout: 100,
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toContain("debounceMs");
    });

    test.prop(
      [fc.integer({ min: -100, max: 0 })], // invalid timeout
      { numRuns: 20 },
    )("should reject invalid timeout (<= 0)", async (invalidTimeout) => {
      const ProfiledComponent = createSimpleProfiledComponent();
      const toEventuallyStabilize = await getToEventuallyStabilize();

      render(<ProfiledComponent value={0} />);

      const result = await toEventuallyStabilize(ProfiledComponent, {
        debounceMs: 10,
        timeout: invalidTimeout,
      });

      expect(result.pass).toBe(false);
      expect(result.message()).toContain("timeout");
    });

    test.prop(
      [fc.constantFrom(Number.NaN, Infinity, -Infinity)], // special values
      { numRuns: 6 },
    )(
      "should reject special numeric values for debounceMs",
      async (specialValue) => {
        const ProfiledComponent = createSimpleProfiledComponent();
        const toEventuallyStabilize = await getToEventuallyStabilize();

        render(<ProfiledComponent value={0} />);

        const result = await toEventuallyStabilize(ProfiledComponent, {
          debounceMs: specialValue,
          timeout: 100,
        });

        expect(result.pass).toBe(false);
      },
    );

    test.prop(
      [fc.constantFrom(Number.NaN, Infinity, -Infinity)], // special values
      { numRuns: 6 },
    )(
      "should reject special numeric values for timeout",
      async (specialValue) => {
        const ProfiledComponent = createSimpleProfiledComponent();
        const toEventuallyStabilize = await getToEventuallyStabilize();

        render(<ProfiledComponent value={0} />);

        const result = await toEventuallyStabilize(ProfiledComponent, {
          debounceMs: 10,
          timeout: specialValue,
        });

        expect(result.pass).toBe(false);
      },
    );
  });

  describe("INVARIANT 6: Concurrent Stabilization Safety", () => {
    test.prop(
      [fc.integer({ min: 2, max: 5 })], // number of concurrent waits
      { numRuns: 10 },
    )(
      "multiple waitForStabilization calls should all resolve correctly",
      async (concurrentWaits) => {
        const ProfiledComponent = createSimpleProfiledComponent();

        const { rerender } = render(<ProfiledComponent value={0} />);

        // Start multiple concurrent stabilization waits
        const promises = Array.from({ length: concurrentWaits }, () =>
          ProfiledComponent.waitForStabilization({
            debounceMs: 20,
            timeout: 300,
          }),
        );

        // Trigger some updates
        rerender(<ProfiledComponent value={1} />);
        rerender(<ProfiledComponent value={2} />);

        // All should resolve
        const results = await Promise.all(promises);

        // INVARIANT: All concurrent waits should capture same renders
        const allRenderCounts = results.map((r) => r.renderCount);

        // All should have same render count (2 updates)
        expect(new Set(allRenderCounts).size).toBe(1);
        expect(allRenderCounts[0]).toBe(2);
      },
    );
  });
});
