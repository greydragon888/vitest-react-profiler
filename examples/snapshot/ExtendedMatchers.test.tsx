/**
 * Extended Matchers (v1.11.0)
 *
 * This file demonstrates the extended rerender matchers introduced in v1.11.0:
 * - toHaveRerendered() - checks at least 1 rerender after snapshot
 * - toHaveRerendered(n) - checks exact number of rerenders after snapshot
 * - toEventuallyRerender() - waits for async rerender
 * - toEventuallyRerenderTimes(n) - waits for exact number of async rerenders
 *
 * These matchers build on the Snapshot API (v1.10.0) and provide powerful
 * tools for testing component render behavior.
 */

import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { withProfiler } from "vitest-react-profiler";

import { Counter } from "./components/Counter";
import { AsyncCounter } from "./components/AsyncCounter";

// ═══════════════════════════════════════════════════════════════════════════
// 1. toHaveRerendered() - At Least One Rerender
// ═══════════════════════════════════════════════════════════════════════════

describe("1. toHaveRerendered() - At Least One Rerender", () => {
  const ProfiledCounter = withProfiler(Counter, "Counter");

  /**
   * Basic usage: Check that component rerendered after an action
   *
   * Use case: Verify that user interaction triggers a rerender
   */
  it("should pass when component rerendered at least once", () => {
    render(<ProfiledCounter />);

    // Take snapshot before action
    ProfiledCounter.snapshot();

    // Perform user action
    fireEvent.click(screen.getByText("Increment"));

    // Assert: component rerendered (at least 1 time)
    expect(ProfiledCounter).toHaveRerendered();
  });

  /**
   * Passes with multiple rerenders too
   *
   * Use case: toHaveRerendered() doesn't care about exact count
   */
  it("should pass with multiple rerenders", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    // Multiple actions = multiple rerenders
    fireEvent.click(screen.getByText("Increment"));
    fireEvent.click(screen.getByText("Increment"));
    fireEvent.click(screen.getByText("Increment"));

    // Still passes - we just need >= 1
    expect(ProfiledCounter).toHaveRerendered();
  });

  /**
   * Using .not modifier to assert no rerenders
   *
   * Use case: Verify memoization prevents unnecessary rerenders
   */
  it("should support .not modifier", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    // No action taken - no rerender expected
    expect(ProfiledCounter).not.toHaveRerendered();
  });

  /**
   * Workflow: Snapshot-action-verify pattern
   *
   * Use case: Iterative testing with multiple snapshots
   */
  it("should work with multiple snapshot cycles", () => {
    render(<ProfiledCounter />);

    // Cycle 1: Verify increment triggers rerender
    ProfiledCounter.snapshot();
    fireEvent.click(screen.getByText("Increment"));
    expect(ProfiledCounter).toHaveRerendered();

    // Cycle 2: Verify decrement also triggers rerender
    ProfiledCounter.snapshot();
    fireEvent.click(screen.getByText("Decrement"));
    expect(ProfiledCounter).toHaveRerendered();

    // Cycle 3: No action = no rerender
    ProfiledCounter.snapshot();
    expect(ProfiledCounter).not.toHaveRerendered();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. toHaveRerendered(n) - Exact Rerender Count
// ═══════════════════════════════════════════════════════════════════════════

describe("2. toHaveRerendered(n) - Exact Rerender Count", () => {
  const ProfiledCounter = withProfiler(Counter, "ExactCounter");

  /**
   * Check exact rerender count
   *
   * Use case: Ensure each action causes exactly one rerender (no double renders)
   */
  it("should verify exact rerender count", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    // 3 clicks = 3 state updates = 3 rerenders
    fireEvent.click(screen.getByText("Increment"));
    fireEvent.click(screen.getByText("Increment"));
    fireEvent.click(screen.getByText("Increment"));

    expect(ProfiledCounter).toHaveRerendered(3);
  });

  /**
   * Detect double-render bugs
   *
   * Use case: Catch performance issues where single action causes multiple renders
   */
  it("should detect single action = single rerender", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    // Single click should cause exactly 1 rerender
    fireEvent.click(screen.getByText("Increment"));

    // If this fails with n > 1, you have a double-render bug!
    expect(ProfiledCounter).toHaveRerendered(1);
  });

  /**
   * Zero rerenders is a valid expectation
   *
   * Use case: Alternative to toNotHaveRerendered()
   */
  it("should accept 0 as valid count", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    // No action = 0 rerenders
    expect(ProfiledCounter).toHaveRerendered(0);
  });

  /**
   * Using .not with exact count
   *
   * Use case: Assert render count is NOT a specific value
   */
  it("should support .not with exact count", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    fireEvent.click(screen.getByText("Increment"));
    fireEvent.click(screen.getByText("Increment"));

    // 2 rerenders - NOT 1, NOT 3
    expect(ProfiledCounter).not.toHaveRerendered(1);
    expect(ProfiledCounter).not.toHaveRerendered(3);
    expect(ProfiledCounter).toHaveRerendered(2);
  });

  /**
   * Performance budget testing
   *
   * Use case: Ensure batch operations stay within render budget
   */
  it("should validate render budget", () => {
    const { rerender } = render(<ProfiledCounter initialCount={0} />);

    ProfiledCounter.snapshot();

    // Simulate batch update with multiple prop changes
    rerender(<ProfiledCounter initialCount={1} />);
    rerender(<ProfiledCounter initialCount={2} />);
    rerender(<ProfiledCounter initialCount={3} />);
    rerender(<ProfiledCounter initialCount={4} />);
    rerender(<ProfiledCounter initialCount={5} />);

    // Budget: exactly 5 renders for 5 prop changes
    expect(ProfiledCounter).toHaveRerendered(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. toEventuallyRerender() - Async Rerender
// ═══════════════════════════════════════════════════════════════════════════

describe("3. toEventuallyRerender() - Async Rerender", () => {
  const ProfiledAsyncCounter = withProfiler(AsyncCounter, "AsyncCounter");

  /**
   * Wait for async state update
   *
   * Use case: Component triggers setTimeout/fetch and updates state later
   *
   * Note: AsyncCounter has 2 state updates (loading + count), so we wait for both
   */
  it("should wait for async rerender", async () => {
    render(<ProfiledAsyncCounter delay={50} />);

    ProfiledAsyncCounter.snapshot();

    // Trigger async action
    fireEvent.click(screen.getByText("Async +1"));

    // Wait for BOTH rerenders (loading=true, then loading=false + count update)
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2, {
      timeout: 300,
    });

    // Verify state updated
    expect(screen.getByTestId("count").textContent).toBe("Count: 1");
  });

  /**
   * Custom timeout
   *
   * Use case: Longer async operations (API calls, animations)
   */
  it("should support custom timeout", async () => {
    render(<ProfiledAsyncCounter delay={200} />);

    ProfiledAsyncCounter.snapshot();

    fireEvent.click(screen.getByText("Async +1"));

    // Increase timeout for slower operations
    await expect(ProfiledAsyncCounter).toEventuallyRerender({ timeout: 500 });
  });

  /**
   * Immediate resolution if already rerendered
   *
   * Use case: Race condition protection - sync update before await
   */
  it("should resolve immediately if already rerendered", async () => {
    render(<ProfiledAsyncCounter />);

    ProfiledAsyncCounter.snapshot();

    // Sync action - rerender happens immediately
    fireEvent.click(screen.getByText("+1"));

    // Should resolve instantly (no waiting)
    const start = performance.now();
    await expect(ProfiledAsyncCounter).toEventuallyRerender();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50); // Very fast resolution
  });

  /**
   * Using .not modifier (rarely needed)
   *
   * Use case: Assert component does NOT rerender within timeout
   */
  it("should support .not modifier", async () => {
    render(<ProfiledAsyncCounter />);

    ProfiledAsyncCounter.snapshot();

    // No action - should NOT rerender
    await expect(ProfiledAsyncCounter).not.toEventuallyRerender({
      timeout: 100,
    });
  });

  /**
   * Multiple async operations in sequence
   *
   * Use case: Test loading → success state transitions
   *
   * Note: Each async operation causes 2 rerenders (loading + count)
   */
  it("should handle sequential async operations", async () => {
    render(<ProfiledAsyncCounter delay={50} />);

    // First async operation (2 rerenders: loading=true, then count+loading=false)
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("Async +1"));
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2, {
      timeout: 300,
    });
    expect(screen.getByTestId("count").textContent).toBe("Count: 1");

    // Second async operation
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("Async +1"));
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2, {
      timeout: 300,
    });
    expect(screen.getByTestId("count").textContent).toBe("Count: 2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. toEventuallyRerenderTimes(n) - Exact Async Count
// ═══════════════════════════════════════════════════════════════════════════

describe("4. toEventuallyRerenderTimes(n) - Exact Async Count", () => {
  const ProfiledAsyncCounter = withProfiler(AsyncCounter, "AsyncTimesCounter");

  /**
   * Wait for exact number of async rerenders
   *
   * Use case: Component triggers multiple sequential state updates
   */
  it("should wait for exact rerender count", async () => {
    render(<ProfiledAsyncCounter delay={30} />);

    ProfiledAsyncCounter.snapshot();

    // Trigger 3 sequential async updates
    fireEvent.click(screen.getByText("Async +3"));

    // Wait for exactly 3 rerenders
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(3, {
      timeout: 500,
    });

    expect(screen.getByTestId("count").textContent).toBe("Count: 3");
  });

  /**
   * Immediate resolution when count already met
   *
   * Use case: Sync updates before await
   */
  it("should resolve immediately if count already met", async () => {
    render(<ProfiledAsyncCounter />);

    ProfiledAsyncCounter.snapshot();

    // Sync updates
    fireEvent.click(screen.getByText("+1"));
    fireEvent.click(screen.getByText("+1"));

    // Should resolve instantly (count already 2)
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2);
  });

  /**
   * Early failure when count exceeded
   *
   * Use case: Detect runaway renders without waiting for timeout
   */
  it("should fail early when count exceeded", async () => {
    render(<ProfiledAsyncCounter />);

    ProfiledAsyncCounter.snapshot();

    // Create 5 rerenders
    fireEvent.click(screen.getByText("+1"));
    fireEvent.click(screen.getByText("+1"));
    fireEvent.click(screen.getByText("+1"));
    fireEvent.click(screen.getByText("+1"));
    fireEvent.click(screen.getByText("+1"));

    // Expect only 2 - should fail IMMEDIATELY (no timeout wait)
    await expect(async () => {
      await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2);
    }).rejects.toThrow(/exceeded/);
  });

  /**
   * Zero rerenders expectation
   *
   * Use case: Assert component does NOT rerender at all
   */
  it("should support zero rerenders", async () => {
    render(<ProfiledAsyncCounter />);

    ProfiledAsyncCounter.snapshot();

    // No action - expect 0 rerenders (immediate success)
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(0);
  });

  /**
   * Combining sync and async assertions
   *
   * Use case: Hybrid workflow with both sync and async updates
   */
  it("should work alongside sync matchers", async () => {
    render(<ProfiledAsyncCounter delay={50} />);

    // Phase 1: Sync update
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("+1"));
    expect(ProfiledAsyncCounter).toHaveRerendered(1);

    // Phase 2: Async update
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("Async +1"));
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2, {
      timeout: 300,
    }); // loading + count update

    // Phase 3: Verify final state
    expect(screen.getByTestId("count").textContent).toBe("Count: 2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Real-World Patterns
// ═══════════════════════════════════════════════════════════════════════════

describe("5. Real-World Patterns", () => {
  const ProfiledCounter = withProfiler(Counter, "RealWorldCounter");
  const ProfiledAsyncCounter = withProfiler(AsyncCounter, "RealWorldAsync");

  /**
   * Pattern: Test that memoization works
   *
   * Use case: Verify React.memo or useMemo prevents unnecessary rerenders
   */
  it("should verify memoization effectiveness", () => {
    const { rerender } = render(<ProfiledCounter initialCount={0} />);

    // Take snapshot
    ProfiledCounter.snapshot();

    // Rerender with SAME props (memoized component should NOT rerender)
    // Note: Counter is NOT memoized, so it WILL rerender
    rerender(<ProfiledCounter initialCount={0} />);

    // This will pass because Counter is not memoized
    // With memo(Counter), this would be: expect(ProfiledCounter).not.toHaveRerendered()
    expect(ProfiledCounter).toHaveRerendered(1);
  });

  /**
   * Pattern: Validate render efficiency ratio
   *
   * Use case: N actions should cause exactly N rerenders (1:1 ratio)
   */
  it("should maintain 1:1 render ratio", () => {
    render(<ProfiledCounter />);

    ProfiledCounter.snapshot();

    const ACTIONS = 5;

    for (let i = 0; i < ACTIONS; i++) {
      fireEvent.click(screen.getByText("Increment"));
    }

    // Efficiency: 5 actions = 5 rerenders (not more)
    expect(ProfiledCounter).toHaveRerendered(ACTIONS);
  });

  /**
   * Pattern: Loading state transitions
   *
   * Use case: loading=true → loading=false state machine
   */
  it("should track loading state transitions", async () => {
    render(<ProfiledAsyncCounter delay={50} />);

    ProfiledAsyncCounter.snapshot();

    // Trigger async operation (sets loading=true, then updates count)
    fireEvent.click(screen.getByText("Async +1"));

    // Wait for both state updates: loading + count
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2, {
      timeout: 300,
    });
  });

  /**
   * Pattern: Debounced input validation
   *
   * Use case: Wait for debounced validation to complete
   */
  it("should handle debounced updates", async () => {
    render(<ProfiledAsyncCounter delay={100} />);

    ProfiledAsyncCounter.snapshot();

    // Trigger async operation
    fireEvent.click(screen.getByText("Async +1"));

    // Wait for render after debounce period
    await expect(ProfiledAsyncCounter).toEventuallyRerender({ timeout: 500 });
  });

  /**
   * Pattern: Full integration test workflow
   *
   * Use case: Complete user journey with mixed sync/async operations
   *
   * Note: AsyncCounter causes 2 rerenders per async action (loading + count)
   */
  it("should support complete user journey testing", async () => {
    render(<ProfiledAsyncCounter delay={30} />);

    // Step 1: Initial mount check
    expect(ProfiledAsyncCounter.getRenderCount()).toBe(1);
    expect(ProfiledAsyncCounter).toHaveLastRenderedWithPhase("mount");

    // Step 2: Sync increment
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("+1"));
    expect(ProfiledAsyncCounter).toHaveRerendered(1);
    expect(screen.getByTestId("count").textContent).toBe("Count: 1");

    // Step 3: Async increment (2 rerenders: loading=true, then count+loading=false)
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("Async +1"));
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(2, {
      timeout: 300,
    });
    expect(screen.getByTestId("count").textContent).toBe("Count: 2");

    // Step 4: Multiple async increments (Async +3 triggers 3 sequential timeouts)
    ProfiledAsyncCounter.snapshot();
    fireEvent.click(screen.getByText("Async +3"));
    await expect(ProfiledAsyncCounter).toEventuallyRerenderTimes(3, {
      timeout: 500,
    });
    expect(screen.getByTestId("count").textContent).toBe("Count: 5");

    // Step 5: Final render count check
    const totalRenders = ProfiledAsyncCounter.getRenderCount();
    expect(totalRenders).toBeGreaterThanOrEqual(6); // mount + various updates
  });
});
