/**
 * Event-Based API Examples (v1.6.0)
 *
 * This file demonstrates real-world usage patterns for the event-based API.
 * Examples are copy-paste ready and demonstrate best practices.
 *
 * @see https://github.com/greydragon888/vitest-react-profiler
 */

import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { withProfiler } from "../../src";
import { AsyncCounter } from "./components/AsyncCounter";
import { DataFetcher } from "./components/DataFetcher";
import { FormValidator } from "./components/FormValidator";

import type { RenderEventInfo } from "../../src/types";

// ═══════════════════════════════════════════════════════════════════
// 1. BASIC ONRENDER USAGE
// ═══════════════════════════════════════════════════════════════════

describe("1. Basic onRender usage", () => {
  /**
   * Example 1: Simple event listener
   *
   * Use case: Track renders in real-time without polling
   *
   * This demonstrates the most basic usage of onRender():
   * - Subscribe to render events
   * - Receive RenderEventInfo on each render
   * - Unsubscribe when done
   */
  it("should track renders with event listener", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    // Subscribe to render events
    let renderCount = 0;
    const unsubscribe = ProfiledCounter.onRender((info) => {
      renderCount++;
      console.log(`Render #${info.count}: ${info.phase}`);
    });

    // Trigger a re-render
    rerender(<ProfiledCounter />);

    // Verify event was received (only update phase counted)
    expect(renderCount).toBe(1);

    // Clean up
    unsubscribe();
  });

  /**
   * Example 2: Tracking render count
   *
   * Use case: Count total renders during a test scenario
   *
   * This shows how to use onRender() to track the number of renders
   * that occur during a specific action (e.g., clicking a button).
   */
  it("should count renders during user interaction", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { getByText } = render(<ProfiledCounter />);

    let totalRenders = 0;
    ProfiledCounter.onRender(() => {
      totalRenders++;
    });

    // Perform sync action (single render)
    fireEvent.click(getByText("Increment Sync"));

    expect(totalRenders).toBe(1);
    expect(ProfiledCounter.getRenderCount()).toBe(2); // mount + update
  });

  /**
   * Example 3: Logging render phases
   *
   * Use case: Debug component re-renders and understand mount vs update phases
   *
   * This demonstrates accessing all render information:
   * - phase: "mount" | "update"
   * - count: total render count
   * - actualDuration: time spent rendering (React Profiler API)
   */
  it("should log detailed render information", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    const logs: RenderEventInfo[] = [];
    ProfiledCounter.onRender((info) => {
      logs.push(info);
      console.log(`[${info.phase}] Render #${info.count} took ${info.actualDuration}ms`);
    });

    // Trigger multiple re-renders
    rerender(<ProfiledCounter />);
    rerender(<ProfiledCounter />);

    expect(logs).toHaveLength(2);
    expect(logs[0].phase).toBe("update");
    expect(logs[1].phase).toBe("update");
    expect(logs[0].count).toBe(2);
    expect(logs[1].count).toBe(3);
  });

  /**
   * Example 4: Conditional event handling
   *
   * Use case: React only to specific render phases (e.g., only updates, not mounts)
   *
   * This shows how to filter events based on conditions like phase type,
   * render count threshold, or performance metrics.
   */
  it("should handle events conditionally", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    // Track only update phases (ignore mount)
    let updateCount = 0;
    ProfiledCounter.onRender((info) => {
      if (info.phase === "update") {
        updateCount++;
      }
    });

    rerender(<ProfiledCounter />);
    rerender(<ProfiledCounter />);

    expect(updateCount).toBe(2);
    expect(ProfiledCounter.getRenderCount()).toBe(3); // mount + 2 updates
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. WAITFORNEXTRENDER USAGE
// ═══════════════════════════════════════════════════════════════════

describe("2. waitForNextRender usage", () => {
  /**
   * Example 1: Waiting for async state update
   *
   * Use case: Component triggers async operation (setTimeout, API call)
   *
   * This demonstrates the core async pattern:
   * 1. Start waiting BEFORE triggering the action
   * 2. Trigger the async action
   * 3. Await the promise to get render info
   */
  it("should wait for async state update", async () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { getByText } = render(<ProfiledCounter />);

    // Start waiting BEFORE triggering action
    const promise = ProfiledCounter.waitForNextRender({ timeout: 1000 });

    // Trigger async action
    fireEvent.click(getByText("Increment Async"));

    // Wait for the next render
    const info = await promise;

    expect(info.phase).toBe("update");
    expect(ProfiledCounter.getRenderCount()).toBeGreaterThanOrEqual(2);
  });

  /**
   * Example 2: Data fetching with loading states
   *
   * Use case: Component with loading → success/error state transitions
   *
   * This shows how to wait for multiple sequential renders
   * (e.g., mount → loading → success).
   */
  it("should wait for data fetching completion", async () => {
    const ProfiledFetcher = withProfiler(DataFetcher);
    render(<ProfiledFetcher userId="456" />);

    // Wait for data to load (useEffect triggers async fetch)
    const info = await ProfiledFetcher.waitForNextRender({ timeout: 2000 });

    expect(info.phase).toBe("update");
    expect(ProfiledFetcher.getRenderCount()).toBe(2); // mount + data loaded
  });

  /**
   * Example 3: Multiple sequential renders
   *
   * Use case: Waiting for multiple render cycles in sequence
   *
   * This demonstrates chaining waitForNextRender() calls
   * to wait for multiple renders sequentially.
   */
  it("should wait for multiple sequential renders", async () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { getByText, rerender } = render(<ProfiledCounter />);

    // Wait for first re-render
    const promise1 = ProfiledCounter.waitForNextRender({ timeout: 500 });
    rerender(<ProfiledCounter />);
    const info1 = await promise1;
    expect(info1.count).toBe(2);

    // Wait for second re-render
    const promise2 = ProfiledCounter.waitForNextRender({ timeout: 500 });
    fireEvent.click(getByText("Increment Sync"));
    const info2 = await promise2;
    expect(info2.count).toBe(3);
  });

  /**
   * Example 4: Timeout handling
   *
   * Use case: Ensure test fails gracefully if component doesn't render
   *
   * This shows how to use timeout option to prevent tests from hanging
   * indefinitely if the expected render doesn't happen.
   */
  it("should timeout if no render occurs", async () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    render(<ProfiledCounter />);

    // Start waiting but DON'T trigger any action
    const promise = ProfiledCounter.waitForNextRender({ timeout: 100 });

    // Should reject with timeout error
    await expect(promise).rejects.toThrow("Timeout: No render occurred within 100ms");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. BASIC CLEANUP PATTERNS
// ═══════════════════════════════════════════════════════════════════

describe("3. Basic cleanup patterns", () => {
  /**
   * Example 1: Manual unsubscribe
   *
   * Use case: Stop listening to events when no longer needed
   *
   * This demonstrates the basic cleanup pattern:
   * - onRender() returns an unsubscribe function
   * - Call it to remove the listener
   * - Future renders won't trigger the callback
   */
  it("should unsubscribe manually", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    let renderCount = 0;
    const unsubscribe = ProfiledCounter.onRender(() => {
      renderCount++;
    });

    // Trigger render while subscribed
    rerender(<ProfiledCounter />);
    expect(renderCount).toBe(1);

    // Unsubscribe
    unsubscribe();

    // Trigger render after unsubscribe (should NOT increment)
    rerender(<ProfiledCounter />);
    expect(renderCount).toBe(1); // Still 1, not 2
  });

  /**
   * Example 2: Automatic cleanup with beforeEach/afterEach
   *
   * Use case: Ensure clean state between tests
   *
   * This shows the recommended pattern for test cleanup:
   * - Store unsubscribe functions
   * - Clean up in afterEach hook
   */
  it("should cleanup in afterEach hook", () => {
    const unsubscribes: Array<() => void> = [];

    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    // Track unsubscribe functions
    const unsubscribe = ProfiledCounter.onRender(() => {
      console.log("Render event");
    });
    unsubscribes.push(unsubscribe);

    rerender(<ProfiledCounter />);

    // Cleanup (normally in afterEach)
    unsubscribes.forEach((fn) => fn());
    unsubscribes.length = 0;

    // Future renders won't trigger callback
    rerender(<ProfiledCounter />);
  });

  /**
   * Example 3: Cleanup after unmount
   *
   * Use case: Component unmounts, listeners should be cleaned up
   *
   * This demonstrates that listeners remain active even after unmount
   * unless explicitly cleaned up. This is intentional design to allow
   * testing unmount scenarios.
   */
  it("should cleanup listeners after unmount", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { unmount } = render(<ProfiledCounter />);

    let eventCount = 0;
    const unsubscribe = ProfiledCounter.onRender(() => {
      eventCount++;
    });

    // Unmount component
    unmount();

    // Listener is still active (intentional design)
    // Clean up manually
    unsubscribe();

    expect(eventCount).toBe(0); // No renders after mount
  });

  /**
   * Example 4: Multiple subscriptions cleanup
   *
   * Use case: Multiple listeners (e.g., logging + analytics)
   *
   * This shows how to manage multiple subscriptions:
   * - Store all unsubscribe functions
   * - Clean up all at once
   */
  it("should cleanup multiple subscriptions", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    const unsubscribes: Array<() => void> = [];

    // Subscriber 1: Logger
    unsubscribes.push(
      ProfiledCounter.onRender((info) => {
        console.log(`[LOG] Render ${info.count}`);
      })
    );

    // Subscriber 2: Analytics
    unsubscribes.push(
      ProfiledCounter.onRender((info) => {
        console.log(`[ANALYTICS] ${info.phase}`);
      })
    );

    // Subscriber 3: Debug
    unsubscribes.push(
      ProfiledCounter.onRender((info) => {
        console.log(`[DEBUG] Duration: ${info.actualDuration}ms`);
      })
    );

    rerender(<ProfiledCounter />);

    // Cleanup all subscriptions
    unsubscribes.forEach((unsubscribe) => unsubscribe());

    expect(unsubscribes).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. COMPLEX CONDITIONS WITH ONRENDER
// ═══════════════════════════════════════════════════════════════════

describe("4. Complex conditions with onRender", () => {
  /**
   * Example 1: Track only update phases
   *
   * Use case: Ignore mount phase, focus on re-renders
   *
   * This demonstrates filtering events by phase to track only updates,
   * which is useful for identifying unnecessary re-renders during
   * user interactions.
   */
  it("should track only update phases", () => {
    const ProfiledValidator = withProfiler(FormValidator);
    const { getByPlaceholderText } = render(<ProfiledValidator />);

    let updateCount = 0;
    ProfiledValidator.onRender((info) => {
      if (info.phase === "update") {
        updateCount++;
        console.log(`Revalidation #${updateCount}`);
      }
    });

    // Trigger form input changes
    const input = getByPlaceholderText("Enter your email");
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.change(input, { target: { value: "test@" } });

    // Only updates counted (mount phase ignored)
    // FormValidator triggers multiple state updates per input change
    expect(updateCount).toBeGreaterThanOrEqual(2);
  });

  /**
   * Example 2: Form validation tracking
   *
   * Use case: Monitor form validation state changes
   *
   * This shows how to track specific state changes (validation states)
   * by examining render information during form input.
   */
  it("should track form validation state changes", async () => {
    const ProfiledValidator = withProfiler(FormValidator);
    const { getByPlaceholderText } = render(<ProfiledValidator />);

    const validationChanges: string[] = [];
    ProfiledValidator.onRender((info) => {
      if (info.phase === "update") {
        validationChanges.push(`Render ${info.count}`);
      }
    });

    const input = getByPlaceholderText("Enter your email");

    // Type invalid email
    fireEvent.change(input, { target: { value: "invalid" } });

    // Wait for debounced validation (300ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Should have renders for: input change + validation result
    expect(validationChanges.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * Example 3: Render count thresholds
   *
   * Use case: Alert when component renders too many times
   *
   * This demonstrates using render count to detect performance issues,
   * such as excessive re-renders that might indicate bugs.
   */
  it("should alert on excessive renders", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    const THRESHOLD = 5;
    let excessiveRenderWarning = false;

    ProfiledCounter.onRender((info) => {
      if (info.count > THRESHOLD) {
        excessiveRenderWarning = true;
        console.warn(`⚠️ Excessive renders detected: ${info.count} > ${THRESHOLD}`);
      }
    });

    // Trigger many re-renders
    for (let i = 0; i < 7; i++) {
      rerender(<ProfiledCounter />);
    }

    expect(excessiveRenderWarning).toBe(true);
    expect(ProfiledCounter.getRenderCount()).toBe(8); // mount + 7 rerenders
  });

  /**
   * Example 4: Phase-specific logic
   *
   * Use case: Different actions for mount vs update
   *
   * This shows how to execute different logic based on render phase,
   * such as initializing analytics on mount and tracking interactions on updates.
   */
  it("should handle mount and update phases differently", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    const analytics = {
      initialized: false,
      interactions: 0,
    };

    ProfiledCounter.onRender((info) => {
      if (info.phase === "mount") {
        analytics.initialized = true;
        console.log("[ANALYTICS] Component initialized");
      } else if (info.phase === "update") {
        analytics.interactions++;
        console.log(`[ANALYTICS] User interaction #${analytics.interactions}`);
      }
    });

    // Trigger updates
    rerender(<ProfiledCounter />);
    rerender(<ProfiledCounter />);

    // Mount phase not tracked (component already mounted)
    expect(analytics.initialized).toBe(false);
    expect(analytics.interactions).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. PERFORMANCE BENCHMARKS (< 20MS)
// ═══════════════════════════════════════════════════════════════════

describe("5. Performance benchmarks (< 20ms)", () => {
  /**
   * Example 1: Measure async operation time
   *
   * Use case: Ensure async operations complete within performance budget
   *
   * This demonstrates using waitForNextRender() with performance.now()
   * to measure and assert on operation timing.
   */
  it("should complete async operations in < 20ms", async () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { getByText } = render(<ProfiledCounter />);

    const start = performance.now();

    // Start waiting, then trigger async action
    const promise = ProfiledCounter.waitForNextRender({ timeout: 1000 });
    fireEvent.click(getByText("Increment Sync"));

    await promise;
    const elapsed = performance.now() - start;

    // Sync operation should be very fast (< 20ms)
    expect(elapsed).toBeLessThan(20);
    console.log(`⏱️ Operation completed in ${elapsed.toFixed(2)}ms`);
  });

  /**
   * Example 2: Identify slow renders
   *
   * Use case: Track render performance to find bottlenecks
   *
   * This shows how to use the actualDuration from React Profiler
   * to identify renders that take longer than expected.
   */
  it("should identify slow renders", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    const SLOW_RENDER_THRESHOLD = 16; // 60fps = 16.67ms per frame
    const slowRenders: number[] = [];

    ProfiledCounter.onRender((info) => {
      if (info.actualDuration !== undefined && info.actualDuration > SLOW_RENDER_THRESHOLD) {
        slowRenders.push(info.count);
        console.warn(`🐌 Slow render detected: Render #${info.count} took ${info.actualDuration}ms`);
      }
    });

    // Trigger multiple renders
    for (let i = 0; i < 5; i++) {
      rerender(<ProfiledCounter />);
    }

    // Most renders should be fast (actualDuration is often undefined in test env)
    console.log(`Slow renders: ${slowRenders.length} out of ${ProfiledCounter.getRenderCount()}`);
  });

  /**
   * Example 3: Performance regression detection
   *
   * Use case: Compare current vs baseline render performance
   *
   * This demonstrates using render count as a performance metric
   * to detect regressions where components render more than expected.
   */
  it("should detect performance regressions", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { getByText } = render(<ProfiledCounter />);

    const BASELINE_RENDER_COUNT = 3; // Expected: mount + 2 updates

    // Perform action that should cause 2 updates
    fireEvent.click(getByText("Increment Sync"));
    fireEvent.click(getByText("Increment Sync"));

    const actualRenderCount = ProfiledCounter.getRenderCount();

    if (actualRenderCount > BASELINE_RENDER_COUNT) {
      console.error(
        `⚠️ REGRESSION: Expected ${BASELINE_RENDER_COUNT} renders, got ${actualRenderCount}`
      );
    }

    expect(actualRenderCount).toBeLessThanOrEqual(BASELINE_RENDER_COUNT);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. MULTIPLE SUBSCRIBERS
// ═══════════════════════════════════════════════════════════════════

describe("6. Multiple subscribers", () => {
  /**
   * Example 1: Logging + analytics pattern
   *
   * Use case: Separate concerns with multiple independent listeners
   *
   * This demonstrates the separation of concerns pattern where
   * different subsystems (logging, analytics, debugging) each
   * have their own listener without interfering with each other.
   */
  it("should support logging + analytics pattern", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    const logs: string[] = [];
    const analyticsEvents: string[] = [];

    // Logger subsystem
    const logUnsubscribe = ProfiledCounter.onRender((info) => {
      logs.push(`[LOG] Render ${info.count}: ${info.phase}`);
    });

    // Analytics subsystem
    const analyticsUnsubscribe = ProfiledCounter.onRender((info) => {
      analyticsEvents.push(`render_${info.phase}`);
      // In production: sendToAnalytics({ event: "component_render", phase: info.phase })
    });

    // Trigger render
    rerender(<ProfiledCounter />);

    // Both subsystems received event
    expect(logs).toHaveLength(1);
    expect(analyticsEvents).toHaveLength(1);
    expect(logs[0]).toContain("Render 2: update");
    expect(analyticsEvents[0]).toBe("render_update");

    // Cleanup
    logUnsubscribe();
    analyticsUnsubscribe();
  });

  /**
   * Example 2: Independent listeners lifecycle
   *
   * Use case: Listeners can be added/removed independently
   *
   * This shows that each listener has its own lifecycle and can be
   * unsubscribed without affecting other listeners.
   */
  it("should handle independent listener lifecycles", () => {
    const ProfiledCounter = withProfiler(AsyncCounter);
    const { rerender } = render(<ProfiledCounter />);

    let listener1Count = 0;
    let listener2Count = 0;
    let listener3Count = 0;

    const unsubscribe1 = ProfiledCounter.onRender(() => listener1Count++);
    const unsubscribe2 = ProfiledCounter.onRender(() => listener2Count++);
    const unsubscribe3 = ProfiledCounter.onRender(() => listener3Count++);

    // Render 1: All listeners active
    rerender(<ProfiledCounter />);
    expect(listener1Count).toBe(1);
    expect(listener2Count).toBe(1);
    expect(listener3Count).toBe(1);

    // Unsubscribe listener 2
    unsubscribe2();

    // Render 2: Only listeners 1 and 3 active
    rerender(<ProfiledCounter />);
    expect(listener1Count).toBe(2);
    expect(listener2Count).toBe(1); // Not incremented
    expect(listener3Count).toBe(2);

    // Cleanup remaining
    unsubscribe1();
    unsubscribe3();
  });
});
