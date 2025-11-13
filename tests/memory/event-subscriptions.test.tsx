import { render } from "@testing-library/react";
import LeakDetector from "jest-leak-detector";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Memory leak tests for event subscriptions
 *
 * These tests verify that event listeners are properly garbage collected:
 * - Listeners are released after unsubscribe
 * - Forgotten unsubscribe is detected as leak
 * - Listeners with large render history are cleaned up
 * - Multiple subscription cycles don't accumulate
 *
 * Pattern: Subscribe → Use → Unsubscribe → Null → GC → Verify
 *
 * @requires --expose-gc flag (run with: npm run test:memory)
 *
 * Note: These tests use 30-60s timeout due to multiple GC cycles required.
 */

/**
 * Helper: Force garbage collection multiple times
 */
async function forceGC(cycles = 10, delayMs = 200): Promise<void> {
  if (!globalThis.gc) {
    console.warn("global.gc not available - run with --expose-gc");

    return;
  }

  for (let i = 0; i < cycles; i++) {
    globalThis.gc();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

describe("Memory: Event Subscriptions", () => {
  // Scenario 1: Single listener cleanup
  it("should GC listener after unsubscribe", async () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={1} />);

    // 1. Create callback with detector
    let callback: any = () => {};
    const detector = new LeakDetector(callback);

    // 2. Subscribe and trigger render
    const unsubscribe = ProfiledComponent.onRender(callback);

    rerender(<ProfiledComponent value={2} />);

    // 3. Unsubscribe (cleanup)
    unsubscribe();

    // 4. Clear reference
    callback = null;

    // 5. Force GC
    await forceGC();

    // 6. Verify
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 2: Multiple listeners cleanup
  it("should GC 10 listeners after unsubscribe", async () => {
    // Pattern from: tests/integration/event-system.test.tsx:323-357
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={1} />);

    // 1. Create 10 callbacks with detectors
    const detectors: LeakDetector[] = [];
    const callbacks: any[] = Array.from({ length: 10 }, () => () => {});

    callbacks.forEach((cb) => {
      detectors.push(new LeakDetector(cb));
    });

    // 2. Subscribe all
    const unsubscribes = callbacks.map((cb) => ProfiledComponent.onRender(cb));

    // 3. Trigger render
    rerender(<ProfiledComponent value={2} />);

    // 4. Unsubscribe all
    unsubscribes.forEach((unsub) => {
      unsub();
    });

    // 5. Clear references
    callbacks.length = 0;

    // 6. Force GC
    await forceGC();

    // 7. Verify all GC'd
    const leaks = await Promise.all(detectors.map((d) => d.isLeaking()));
    const leakCount = leaks.filter(Boolean).length;

    expect(leakCount).toBe(0);
  }, 60_000);

  // Scenario 3: Forgotten unsubscribe (NEGATIVE TEST)
  it("should DETECT forgotten unsubscribe as leak", async () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    render(<ProfiledComponent value={1} />);

    // 1. Create callback with detector
    let callback: any = () => {};
    const detector = new LeakDetector(callback);

    // 2. Subscribe WITHOUT unsubscribe (intentional leak)
    ProfiledComponent.onRender(callback);

    // 3. Clear reference (but still subscribed internally)
    callback = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify LEAK DETECTED (negative test)
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(true); // Expect leak!
  }, 30_000);

  // Scenario 4: Listener with large render history
  it("should GC listener despite large render history", async () => {
    // Pattern from: tests/integration/event-system.test.tsx:475-518
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // 1. Create large history (1000 renders)
    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    expect(ProfiledComponent.getRenderCount()).toBe(1000);

    // 2. Create listener with detector
    let listener: any = () => {};
    const detector = new LeakDetector(listener);

    // 3. Subscribe and trigger one more render
    const unsubscribe = ProfiledComponent.onRender(listener);

    rerender(<ProfiledComponent value={1000} />);

    // 4. Unsubscribe
    unsubscribe();

    // 5. Clear reference
    listener = null;

    // 6. Force GC
    await forceGC();

    // 7. Verify listener GC'd even with 1000+ renders in history
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 5: Listener with component unmount
  it("should GC listener when component unmounts", async () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender, unmount } = render(<ProfiledComponent value={1} />);

    // 1. Create listener with detector
    let listener: any = () => {};
    const detector = new LeakDetector(listener);

    // 2. Subscribe
    const unsubscribe = ProfiledComponent.onRender(listener);

    // 3. Trigger some renders
    rerender(<ProfiledComponent value={2} />);
    rerender(<ProfiledComponent value={3} />);

    // 4. Unmount component
    unmount();

    // 5. Unsubscribe after unmount
    unsubscribe();

    // 6. Clear reference
    listener = null;

    // 7. Force GC
    await forceGC();

    // 8. Verify
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 6: Multiple subscribe/unsubscribe cycles
  it("should GC listeners over multiple subscribe cycles", async () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    const { rerender } = render(<ProfiledComponent value={0} />);

    const detectors: LeakDetector[] = [];

    // 1. Multiple cycles: subscribe → use → unsubscribe
    for (let cycle = 0; cycle < 10; cycle++) {
      // Create listener
      let listener: any = () => {};
      const detector = new LeakDetector(listener);

      detectors.push(detector);

      // Subscribe
      const unsubscribe = ProfiledComponent.onRender(listener);

      // Trigger render
      rerender(<ProfiledComponent value={cycle + 1} />);

      // Unsubscribe
      unsubscribe();

      // Clear reference
      listener = null;
    }

    // 2. Force GC after all cycles
    await forceGC();

    // 3. Verify no accumulation
    const leaks = await Promise.all(detectors.map((d) => d.isLeaking()));
    const leakCount = leaks.filter(Boolean).length;

    expect(leakCount).toBe(0);
  }, 60_000);

  // Scenario 7: Listener references in closure
  it("should GC listener with closure-captured data", async () => {
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    render(<ProfiledComponent value={1} />);

    // 1. Create data to be captured in closure
    const capturedData = {
      count: 0,
      items: Array.from({ length: 100 }, (_, i) => i),
    };

    // 2. Create listener with closure
    let listener: any = () => {
      capturedData.count++;
    };
    const detector = new LeakDetector(listener);

    // 3. Subscribe
    const unsubscribe = ProfiledComponent.onRender(listener);

    // 4. Unsubscribe
    unsubscribe();

    // 5. Clear references
    listener = null;

    // 6. Force GC
    await forceGC();

    // 7. Verify closure + captured data GC'd
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 8: MAX_LISTENERS circuit breaker
  it("should GC 99 listeners under MAX_LISTENERS limit", async () => {
    // MAX_LISTENERS = 100 in ProfilerEvents.ts
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    const ProfiledComponent = withProfiler(TestComponent);

    render(<ProfiledComponent value={1} />);

    const detectors: LeakDetector[] = [];
    const callbacks: any[] = [];

    // 1. Create 99 listeners (< MAX_LISTENERS = 100)
    for (let i = 0; i < 99; i++) {
      const cb: any = () => {};

      callbacks.push(cb);
      detectors.push(new LeakDetector(cb));
    }

    // 2. Subscribe all (should not trigger circuit breaker)
    const unsubscribes = callbacks.map((cb) => ProfiledComponent.onRender(cb));

    // 3. Unsubscribe all
    unsubscribes.forEach((unsub) => {
      unsub();
    });

    // 4. Clear references
    callbacks.length = 0;

    // 5. Force GC
    await forceGC();

    // 6. Verify all GC'd, circuit breaker doesn't prevent cleanup
    const leaks = await Promise.all(detectors.map((d) => d.isLeaking()));
    const leakCount = leaks.filter(Boolean).length;

    expect(leakCount).toBe(0);
  }, 60_000);
});
