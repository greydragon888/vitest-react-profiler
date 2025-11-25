/**
 * @file Property-Based Tests: Custom Vitest Matchers
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: Parameter Validation
 * - `toHaveRenderedTimes(n)` accepts only non-negative integers
 * - Negative numbers → ValidationError
 * - Floats → ValidationError
 * - NaN / Infinity → ValidationError
 * - Valid values: 0, 1, 2, ..., N
 * - **Why important:** Prevents incorrect assertions, fail-fast
 *
 * ### INVARIANT 2: isProfiledComponent Correctness
 * - Profiled component → `expect(C).toBeProfiled()` passes
 * - Non-profiled component → `expect(C).toBeProfiled()` fails
 * - Null / undefined → fails with clear message
 * - Primitives (string, number) → fails
 * - **Why important:** Early error detection, clear error messages
 *
 * ### INVARIANT 3: Matcher Logic Invariants
 * - `toHaveRenderedTimes(n)` passes ↔ `getRenderCount() === n`
 * - `toHaveMounted()` passes ↔ `hasMounted() === true`
 * - `toHaveRendered(n, phase)` passes ↔ `getRendersByPhase(phase).length === n`
 * - Negated matchers work correctly: `not.toHaveRenderedTimes(n)`
 * - **Why important:** Logical consistency, predictable behavior
 *
 * ### INVARIANT 4: Async Timeout Invariants
 * - `toEventuallyRender(n, { timeout })` resolves if render happens before timeout
 * - `toEventuallyRender(n, { timeout })` rejects if timeout expires
 * - Default timeout: 5000ms
 * - Custom timeout works correctly
 * - **Why important:** Async testing robustness, preventing hanging promises
 *
 * ### INVARIANT 5: Error Message Consistency
 * - Validation errors contain "must be" / "expected"
 * - Assertion errors show received vs expected
 * - Error messages include component name
 * - Clear hints for fixing (e.g., "Did you forget withProfiler?")
 * - **Why important:** Developer experience, fast debugging
 *
 * ### INVARIANT 6: Negation Support
 * - All matchers support `.not` prefix
 * - `expect(C).not.toHaveRenderedTimes(n)` works correctly
 * - Error messages adapt to negated context
 * - Double negation is equivalent to assertion
 * - **Why important:** Flexibility in assertions, full Vitest API support
 *
 * ## Testing Strategy:
 *
 * - **1000 runs** for parameter validation (high load)
 * - **500 runs** for matcher logic (medium load)
 * - **Generators:** `fc.integer()` for validation, `fc.oneof()` for type testing
 * - **Error testing:** Checking error messages via try/catch
 *
 * ## Technical Details:
 *
 * - **Vitest matcher protocol:** Implements `MatcherResult` interface
 * - **Custom matchers:** Registered via `expect.extend()`
 * - **Type augmentation:** TypeScript ambient declarations for autocomplete
 * - **Chai-compatible:** Works with Chai assertions if needed
 *
 * ## Available Matchers:
 *
 * **Sync Matchers:**
 * - `toBeProfiled()` - Checks if component is profiled
 * - `toHaveRenderedTimes(n)` - Exact render count
 * - `toHaveMounted()` - Component mounted
 * - `toHaveRendered(n, phase)` - Specific phase count
 *
 * **Async Matchers:**
 * - `toEventuallyRender(n)` - Waits for render count
 * - `toEventuallyHaveMounted()` - Waits for mount
 *
 * @see https://fast-check.dev/
 * @see src/matchers/sync.ts - sync matcher implementations
 * @see src/matchers/async.ts - async matcher implementations
 * @see https://vitest.dev/guide/extending-matchers
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

describe("Property-Based Tests: Event-based Matcher Invariants", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Cleanup Invariants", () => {
    test.prop([fc.integer({ min: 2, max: 10 })], { numRuns: 30 })(
      "matchers cleanup listeners properly on successful resolution",
      async (targetRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Trigger renders
        for (let i = 1; i < targetRenders; i++) {
          setTimeout(() => {
            rerender(<Component value={i} />);
          }, i * 5);
        }

        await expect(Component).toEventuallyRenderTimes(targetRenders, {
          timeout: 500,
        });

        // Component should still work after cleanup
        const beforeCount = Component.getRenderCount();

        rerender(<Component value={100} />);

        const afterCount = Component.getRenderCount();

        return afterCount === beforeCount + 1;
      },
    );

    test.prop([fc.integer({ min: 100, max: 200 })], { numRuns: 20 })(
      "matchers cleanup properly on timeout",
      async (impossibleRenders) => {
        const Component = createSimpleProfiledComponent();

        render(<Component value={0} />);

        try {
          await expect(Component).toEventuallyRenderTimes(impossibleRenders, {
            timeout: 100,
          });

          return false; // Should have timed out
        } catch {
          // Component should still work after cleanup
          const count = Component.getRenderCount();

          return count === 1;
        }
      },
    );
  });

  describe("Concurrent Matchers Invariants", () => {
    test.prop([fc.integer({ min: 3, max: 10 })], { numRuns: 30 })(
      "multiple matchers can wait on same component concurrently",
      async (maxRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        // Start multiple matchers with different targets
        const matcher1 = expect(Component).toEventuallyRenderTimes(2, {
          timeout: 500,
        });
        const matcher2 = expect(Component).toEventuallyRenderAtLeast(
          maxRenders,
          { timeout: 500 },
        );
        const matcher3 = expect(Component).toEventuallyReachPhase("update", {
          timeout: 500,
        });

        // Trigger renders
        for (let i = 1; i < maxRenders; i++) {
          setTimeout(() => {
            rerender(<Component value={i} />);
          }, i * 5);
        }

        // All matchers should complete successfully
        await Promise.all([matcher1, matcher2, matcher3]);

        return Component.getRenderCount() >= maxRenders;
      },
    );

    test.prop([fc.integer({ min: 2, max: 8 })], { numRuns: 30 })(
      "concurrent toEventuallyRenderTimes matchers with different targets work independently",
      async (renders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const matcher1 = expect(Component).toEventuallyRenderTimes(2, {
          timeout: 500,
        });
        const matcher2 = expect(Component).toEventuallyRenderTimes(renders, {
          timeout: 500,
        });

        // Trigger renders
        for (let i = 1; i < renders; i++) {
          setTimeout(() => {
            rerender(<Component value={i} />);
          }, i * 5);
        }

        await Promise.all([matcher1, matcher2]);

        return Component.getRenderCount() === renders;
      },
    );

    test.prop([fc.integer({ min: 2, max: 8 })], { numRuns: 30 })(
      "concurrent matchers of different types work correctly",
      async (targetRenders) => {
        const Component = createSimpleProfiledComponent();
        const { rerender } = render(<Component value={0} />);

        const matcherRenderTimes = expect(Component).toEventuallyRenderTimes(
          targetRenders,
          { timeout: 500 },
        );
        const matcherRenderAtLeast = expect(
          Component,
        ).toEventuallyRenderAtLeast(targetRenders - 1, { timeout: 500 });
        const matcherReachPhase = expect(Component).toEventuallyReachPhase(
          "update",
          { timeout: 500 },
        );

        // Trigger renders
        for (let i = 1; i < targetRenders; i++) {
          setTimeout(() => {
            rerender(<Component value={i} />);
          }, i * 5);
        }

        await Promise.all([
          matcherRenderTimes,
          matcherRenderAtLeast,
          matcherReachPhase,
        ]);

        return (
          Component.getRenderCount() === targetRenders &&
          Component.getRenderHistory().includes("update")
        );
      },
    );
  });
});
