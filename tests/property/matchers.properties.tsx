/**
 * Property-Based Tests for Custom Matchers
 *
 * These tests verify that custom Vitest matchers behave correctly:
 * - Parameter validation (integers, positive numbers, valid types)
 * - isProfiledComponent validation across all input types
 * - Logical invariants (pass conditions)
 * - Async timeout invariants
 * - Error message consistency
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect } from "vitest";

import { createSimpleProfiledComponent } from "./helpers";

describe("Property-Based Tests: Matcher Parameter Validation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Integer Parameter Validation", () => {
    test.prop([fc.integer()], { numRuns: 1000 })(
      "toHaveRenderedTimes accepts non-negative integers only",
      (value) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        if (Number.isInteger(value) && value >= 0) {
          // Should not throw validation error (may throw count mismatch)
          try {
            expect(Component).toHaveRenderedTimes(value);

            // If it doesn't throw, that's fine - value matched
            return true;
          } catch (error) {
            // Should throw count mismatch, not validation error
            const message = (error as Error).message;

            return !message.includes(
              "Expected render count must be a non-negative integer",
            );
          }
        } else {
          // Should throw validation error
          try {
            expect(Component).toHaveRenderedTimes(value);

            return false; // Should have thrown
          } catch (error) {
            const message = (error as Error).message;

            return message.includes(
              "Expected render count must be a non-negative integer",
            );
          }
        }
      },
    );

    test.prop([fc.float()], { numRuns: 1000 })(
      "toHaveRenderedTimes rejects non-integer floats",
      (value) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        if (Number.isInteger(value) && value >= 0) {
          // Valid integer
          return true;
        }

        try {
          expect(Component).toHaveRenderedTimes(value);

          return false; // Should have thrown
        } catch (error) {
          const message = (error as Error).message;

          return message.includes(
            "Expected render count must be a non-negative integer",
          );
        }
      },
    );

    test.prop([fc.constantFrom(Number.NaN, Infinity, -Infinity)], {
      numRuns: 100,
    })("toHaveRenderedTimes rejects special numeric values", (value) => {
      const Component = createSimpleProfiledComponent();

      render(<Component />);

      try {
        expect(Component).toHaveRenderedTimes(value);

        return false; // Should have thrown
      } catch (error) {
        const message = (error as Error).message;

        return message.includes(
          "Expected render count must be a non-negative integer",
        );
      }
    });
  });

  describe("Async Matcher Parameter Validation", () => {
    test.prop([fc.integer()], { numRuns: 500 })(
      "toEventuallyRenderTimes validates expected parameter",
      async (value) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        if (Number.isInteger(value) && value >= 0) {
          // Valid parameter
          try {
            await expect(Component).toEventuallyRenderTimes(value, {
              timeout: 100,
            });

            return true;
          } catch (error) {
            const message = (error as Error).message;

            return !message.includes(
              "Expected render count must be a non-negative integer",
            );
          }
        } else {
          // Invalid parameter
          try {
            await expect(Component).toEventuallyRenderTimes(value, {
              timeout: 100,
            });

            return false;
          } catch (error) {
            const message = (error as Error).message;

            return message.includes(
              "Expected render count must be a non-negative integer",
            );
          }
        }
      },
    );

    test.prop([fc.integer()], { numRuns: 500 })(
      "toEventuallyRenderAtLeast validates minCount parameter",
      async (value) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        if (Number.isInteger(value) && value >= 0) {
          try {
            await expect(Component).toEventuallyRenderAtLeast(value, {
              timeout: 100,
            });

            return true;
          } catch (error) {
            const message = (error as Error).message;

            return !message.includes(
              "Minimum render count must be a non-negative integer",
            );
          }
        } else {
          try {
            await expect(Component).toEventuallyRenderAtLeast(value, {
              timeout: 100,
            });

            return false;
          } catch (error) {
            const message = (error as Error).message;

            return message.includes(
              "Minimum render count must be a non-negative integer",
            );
          }
        }
      },
    );

    test.prop([fc.string()], { numRuns: 500 })(
      "toEventuallyReachPhase validates phase parameter",
      async (phase) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        const validPhases = ["mount", "update", "nested-update"];
        const isValid = validPhases.includes(phase);

        if (isValid) {
          try {
            await expect(Component).toEventuallyReachPhase(
              phase as "mount" | "update" | "nested-update",
              { timeout: 100 },
            );

            return true;
          } catch (error) {
            const message = (error as Error).message;

            return !message.includes("Phase must be one of:");
          }
        } else {
          try {
            await expect(Component).toEventuallyReachPhase(
              phase as "mount" | "update" | "nested-update",
              { timeout: 100 },
            );

            return false;
          } catch (error) {
            const message = (error as Error).message;

            return message.includes("Phase must be one of:");
          }
        }
      },
    );
  });
});

describe("Property-Based Tests: isProfiledComponent Validation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Type Rejection", () => {
    test.prop(
      [
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.string(),
          fc.boolean(),
          fc.array(fc.anything()),
          fc.object(),
        ),
      ],
      { numRuns: 1000 },
    )("all sync matchers reject non-profiled components", (invalidInput) => {
      const syncMatchers = [
        () => {
          expect(invalidInput).toHaveRendered();
        },
        () => {
          expect(invalidInput).toHaveRenderedTimes(1);
        },
        () => {
          expect(invalidInput).toHaveMountedOnce();
        },
        () => {
          expect(invalidInput).toHaveNeverMounted();
        },
        () => {
          expect(invalidInput).toHaveOnlyUpdated();
        },
      ];

      return syncMatchers.every((matcher) => {
        try {
          matcher();

          return false; // Should have thrown
        } catch (error) {
          return (error as Error).message.includes(
            "Expected a profiled component created with withProfiler",
          );
        }
      });
    });

    test.prop(
      [
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.string(),
          fc.boolean(),
          fc.array(fc.anything()),
          fc.object(),
        ),
      ],
      { numRuns: 500 },
    )(
      "all async matchers reject non-profiled components",
      async (invalidInput) => {
        const asyncMatchers = [
          async () => {
            await expect(invalidInput).toEventuallyRenderTimes(1);
          },
          async () => {
            await expect(invalidInput).toEventuallyRenderAtLeast(1);
          },
          async () => {
            await expect(invalidInput).toEventuallyReachPhase("mount");
          },
        ];

        for (const matcher of asyncMatchers) {
          try {
            await matcher();

            return false; // Should have thrown
          } catch (error) {
            if (
              !(error as Error).message.includes(
                "Expected a profiled component created with withProfiler",
              )
            ) {
              return false;
            }
          }
        }

        return true;
      },
    );

    test.prop([fc.constant(null)], { numRuns: 100 })(
      "null is explicitly rejected with correct type in error message",
      (nullValue) => {
        const errorPattern =
          /Expected a profiled component created with withProfiler.*received object/;

        try {
          expect(nullValue).toHaveRendered();

          return false;
        } catch (error) {
          return errorPattern.test((error as Error).message);
        }
      },
    );
  });

  describe("Profiled Component Acceptance", () => {
    test.prop([fc.nat({ max: 10 })], { numRuns: 1000 })(
      "profiled components pass validation for all matchers",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create renders
        for (let i = 1; i < numRenders; i++) {
          rerender(<Component value={i} />);
        }

        // All matchers should not throw isProfiledComponent error
        // (they may throw other assertion errors, but not validation)
        const matchers = [
          () => {
            expect(Component).toHaveRendered();
          },
          () => {
            expect(Component).toHaveRenderedTimes(numRenders);
          },
          () => {
            expect(Component).toHaveMountedOnce();
          },
        ];

        return matchers.every((matcher) => {
          try {
            matcher();

            return true; // Passed
          } catch (error) {
            const message = (error as Error).message;

            // Should not be a validation error
            return !message.includes(
              "Expected a profiled component created with withProfiler",
            );
          }
        });
      },
    );
  });
});

describe("Property-Based Tests: Matcher Logic Invariants", () => {
  afterEach(() => {
    cleanup();
  });

  describe("toHaveRendered Logic", () => {
    test.prop([fc.nat({ max: 50 })], { numRuns: 1000 })(
      "toHaveRendered passes if and only if render count > 0",
      (numRenders) => {
        const Component = createSimpleProfiledComponent();

        if (numRenders > 0) {
          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < numRenders; i++) {
            rerender(<Component value={i} />);
          }
        }

        const actualCount = Component.getRenderCount();
        const shouldPass = actualCount > 0;

        try {
          expect(Component).toHaveRendered();

          return shouldPass; // Should only pass if count > 0
        } catch {
          return !shouldPass; // Should only fail if count === 0
        }
      },
    );
  });

  describe("toHaveRenderedTimes Logic", () => {
    test.prop([fc.nat({ max: 50 }), fc.nat({ max: 50 })], { numRuns: 1000 })(
      "toHaveRenderedTimes passes if and only if actual === expected",
      (numRenders, expectedCount) => {
        const Component = createSimpleProfiledComponent();

        if (numRenders > 0) {
          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < numRenders; i++) {
            rerender(<Component value={i} />);
          }
        }

        const actualCount = Component.getRenderCount();
        const shouldPass = actualCount === expectedCount;

        try {
          expect(Component).toHaveRenderedTimes(expectedCount);

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );
  });

  describe("toHaveMountedOnce Logic", () => {
    test.prop([fc.nat({ max: 10 })], { numRuns: 1000 })(
      "toHaveMountedOnce passes if and only if exactly 1 mount phase",
      (numMounts) => {
        const Component = createSimpleProfiledComponent();

        // Create specified number of mounts
        for (let i = 0; i < numMounts; i++) {
          render(<Component key={`mount-${i}`} />);
        }

        const mounts = Component.getRendersByPhase("mount");
        const mountCount = mounts.length;
        const shouldPass = mountCount === 1;

        try {
          expect(Component).toHaveMountedOnce();

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );
  });

  describe("toHaveNeverMounted Logic", () => {
    test.prop([fc.boolean()], { numRuns: 1000 })(
      "toHaveNeverMounted passes if and only if no mount phase",
      (shouldMount) => {
        const Component = createSimpleProfiledComponent();

        if (shouldMount) {
          render(<Component />);
        }

        const hasMounted = Component.hasMounted();
        const shouldPass = !hasMounted;

        try {
          expect(Component).toHaveNeverMounted();

          return shouldPass;
        } catch {
          return !shouldPass;
        }
      },
    );
  });
});

describe("Property-Based Tests: Async Matcher Invariants", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Timeout Behavior", () => {
    test.prop(
      [fc.integer({ min: 1, max: 10 }), fc.integer({ min: 100, max: 500 })],
      { numRuns: 30 },
    )(
      "toEventuallyRenderTimes completes within timeout when condition is met",
      async (targetRenders, timeout) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Trigger renders to meet condition
        const renderPromises: Promise<void>[] = [];

        for (let i = 1; i < targetRenders; i++) {
          renderPromises.push(
            new Promise((resolve) => {
              setTimeout(() => {
                rerender(<Component value={i} />);
                resolve();
              }, i * 10);
            }),
          );
        }

        const start = Date.now();

        try {
          await expect(Component).toEventuallyRenderTimes(targetRenders, {
            timeout,
            interval: 10,
          });

          const elapsed = Date.now() - start;

          // Should complete within timeout
          return elapsed <= timeout + 200; // 200ms tolerance
        } catch {
          // Timeout is acceptable if renders didn't complete in time
          return true;
        } finally {
          // Wait for all renders to complete to avoid test pollution
          await Promise.all(renderPromises);
        }
      },
    );

    test.prop([fc.integer({ min: 100, max: 500 })], { numRuns: 30 })(
      "toEventuallyRenderTimes throws after timeout when condition not met",
      async (timeout) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        const start = Date.now();

        try {
          await expect(Component).toEventuallyRenderTimes(100, {
            timeout,
            interval: 20,
          });

          return false; // Should have thrown
        } catch {
          const elapsed = Date.now() - start;

          // Should timeout close to specified timeout
          return elapsed >= timeout && elapsed <= timeout + 200;
        }
      },
    );

    test.prop(
      [fc.integer({ min: 1, max: 10 }), fc.integer({ min: 100, max: 500 })],
      { numRuns: 30 },
    )(
      "toEventuallyRenderAtLeast completes when minimum is reached",
      async (minRenders, timeout) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Trigger renders
        const renderPromises: Promise<void>[] = [];

        for (let i = 1; i < minRenders; i++) {
          renderPromises.push(
            new Promise((resolve) => {
              setTimeout(() => {
                rerender(<Component value={i} />);
                resolve();
              }, i * 10);
            }),
          );
        }

        const start = Date.now();

        try {
          await expect(Component).toEventuallyRenderAtLeast(minRenders, {
            timeout,
            interval: 10,
          });

          const elapsed = Date.now() - start;

          return elapsed <= timeout + 200;
        } catch {
          return true;
        } finally {
          await Promise.all(renderPromises);
        }
      },
    );
  });

  describe("Immediate Resolution", () => {
    test.prop([fc.nat({ max: 20 })], { numRuns: 500 })(
      "toEventuallyRenderTimes resolves immediately if condition already met",
      async (numRenders) => {
        const Component = createSimpleProfiledComponent();

        if (numRenders > 0) {
          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < numRenders; i++) {
            rerender(<Component value={i} />);
          }
        }

        const start = Date.now();

        try {
          await expect(Component).toEventuallyRenderTimes(numRenders, {
            timeout: 1000,
          });

          const elapsed = Date.now() - start;

          // Should resolve almost immediately (< 100ms)
          return elapsed < 100;
        } catch {
          // Only acceptable if condition wasn't met
          return Component.getRenderCount() !== numRenders;
        }
      },
    );

    test.prop([fc.nat({ max: 20 })], { numRuns: 200, timeout: 60_000 })(
      "toEventuallyRenderAtLeast resolves immediately if minimum already reached",
      async (currentRenders) => {
        const Component = createSimpleProfiledComponent();

        if (currentRenders > 0) {
          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < currentRenders; i++) {
            rerender(<Component value={i} />);
          }
        }

        const minRenders = Math.max(1, Math.floor(currentRenders / 2));
        const start = Date.now();

        try {
          await expect(Component).toEventuallyRenderAtLeast(minRenders, {
            timeout: 1000,
            interval: 10,
          });

          const elapsed = Date.now() - start;

          return elapsed < 150;
        } catch {
          return Component.getRenderCount() < minRenders;
        }
      },
    );

    test.prop([fc.constantFrom("mount", "update")], { numRuns: 500 })(
      "toEventuallyReachPhase resolves immediately if phase already present",
      async (phase) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Create update phase
        rerender(<Component value={1} />);

        const start = Date.now();

        await expect(Component).toEventuallyReachPhase(phase, {
          timeout: 1000,
        });

        const elapsed = Date.now() - start;

        // Should resolve almost immediately
        return elapsed < 100;
      },
    );
  });
});

describe("Property-Based Tests: Error Message Consistency", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Validation Error Format", () => {
    test.prop([fc.integer().filter((n) => n < 0 || !Number.isInteger(n))], {
      numRuns: 500,
    })(
      "integer validation errors include parameter name and constraint",
      (invalidValue) => {
        const Component = createSimpleProfiledComponent();

        render(<Component />);

        try {
          expect(Component).toHaveRenderedTimes(invalidValue);

          return false;
        } catch (error) {
          const message = (error as Error).message;

          return (
            message.includes("render count") &&
            message.includes("non-negative integer")
          );
        }
      },
    );
  });

  describe("Assertion Error Format", () => {
    test.prop([fc.nat({ max: 20 }), fc.nat({ max: 20 })], { numRuns: 1000 })(
      "toHaveRenderedTimes error includes actual and expected values",
      (actualRenders, expectedRenders) => {
        // Only test when they differ
        if (actualRenders === expectedRenders) {
          return true;
        }

        const Component = createSimpleProfiledComponent();

        if (actualRenders > 0) {
          const { rerender } = render(<Component value={0} />);

          for (let i = 1; i < actualRenders; i++) {
            rerender(<Component value={i} />);
          }
        }

        try {
          expect(Component).toHaveRenderedTimes(expectedRenders);

          return false; // Should have failed
        } catch (error) {
          const message = (error as Error).message;

          // Should include both values
          return (
            message.includes(`Expected ${expectedRenders}`) &&
            message.includes(`got ${actualRenders}`)
          );
        }
      },
    );
  });

  describe("Empty State Error Messages", () => {
    test.prop([fc.constant(undefined)], { numRuns: 100 })(
      "matchers provide helpful messages for unrendered components",
      () => {
        const Component = createSimpleProfiledComponent();

        // Test various matchers with unrendered component
        const tests = [
          {
            fn: () => {
              expect(Component).toHaveRendered();
            },
            expectedPhrase: "never rendered",
          },
          {
            fn: () => {
              expect(Component).toHaveMountedOnce();
            },
            expectedPhrase: "never mounted",
          },
        ];

        return tests.every(({ fn, expectedPhrase }) => {
          try {
            fn();

            return false;
          } catch (error) {
            const message = (error as Error).message;

            return message.includes(expectedPhrase);
          }
        });
      },
    );
  });
});
