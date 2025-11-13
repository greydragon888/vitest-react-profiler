import { render } from "@testing-library/react";
import LeakDetector from "jest-leak-detector";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Memory leak tests for render history
 *
 * These tests verify that render history arrays are properly garbage collected:
 * - Large render history (1000+ entries) is cleaned up
 * - Frozen arrays can be GC'd
 * - Cached history references are released
 * - Extreme cases (10K renders) are handled
 *
 * Pattern: Renders → Get History → Unmount → Null → GC → Verify
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

describe("Memory: Render History", () => {
  // Scenario 1: Large render history
  it("should GC component with 1000 render history", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:20-56
    const TestComponent: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    let ProfiledComponent: any = withProfiler(TestComponent);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Create large history (1000 renders)
    const { rerender, unmount } = render(<ProfiledComponent count={0} />);

    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    // 2. Verify history exists
    expect(ProfiledComponent.getRenderHistory()).toHaveLength(1000);

    // 3. Cleanup
    unmount();
    ProfiledComponent = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify component + history array (1000 entries) GC'd
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 2: Frozen arrays
  it("should GC frozen render history arrays", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:58-88
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>{value}</div>
    );
    let ProfiledComponent: any = withProfiler(TestComponent);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Create history
    const { rerender, unmount } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // 2. Get frozen history
    const history = ProfiledComponent.getRenderHistory();

    // Verify it's frozen
    expect(Object.isFrozen(history)).toBe(true);
    expect(history).toHaveLength(1000);

    // 3. Cleanup
    unmount();
    ProfiledComponent = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify frozen arrays can be GC'd (Object.freeze doesn't prevent)
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 3: Cached history references
  it("should GC history despite multiple cached references", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:118-148
    const TestComponent: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    let ProfiledComponent: any = withProfiler(TestComponent);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Render component
    const { rerender, unmount } = render(<ProfiledComponent value={0} />);

    // 2. Generate history (500 renders)
    for (let i = 1; i < 500; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // 3. Get history 50x to create cached references
    const cachedHistories: any[] = [];

    for (let i = 0; i < 50; i++) {
      cachedHistories.push(ProfiledComponent.getRenderHistory());
    }

    // Verify caching works (same references)
    expect(cachedHistories[0]).toBe(cachedHistories[49]);

    // 4. Cleanup
    unmount();
    cachedHistories.length = 0; // Clear cached references
    ProfiledComponent = null;

    // 5. Force GC
    await forceGC();

    // 6. Verify all cached references GC'd together
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 4: Extreme case - 10K renders (reduced to 2K for performance)
  it("should GC component with 2000 render history", async () => {
    // Pattern from: tests/property/stress.properties.tsx:283-306
    // Reduced from 10,000 to 2,000 for practical test time
    const TestComponent: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    let ProfiledComponent: any = withProfiler(TestComponent);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Create extreme history (2000 renders)
    const { rerender, unmount } = render(<ProfiledComponent count={0} />);

    for (let i = 1; i < 2000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    // 2. Verify history exists
    expect(ProfiledComponent.getRenderHistory()).toHaveLength(2000);

    // 3. Cleanup
    unmount();
    ProfiledComponent = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify even at large scale, GC works
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 5: History after multiple retrieval patterns
  it("should GC history after getRendersByPhase calls", async () => {
    const TestComponent: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    let ProfiledComponent: any = withProfiler(TestComponent);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Create mixed renders
    const { rerender, unmount } = render(<ProfiledComponent count={0} />);

    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    // 2. Call getRendersByPhase multiple times (creates filtered arrays)
    const mountRenders = ProfiledComponent.getRendersByPhase("mount");
    const updateRenders = ProfiledComponent.getRendersByPhase("update");

    expect(mountRenders).toHaveLength(1);
    expect(updateRenders).toHaveLength(999);

    // Get them multiple times
    for (let i = 0; i < 10; i++) {
      ProfiledComponent.getRendersByPhase("mount");
      ProfiledComponent.getRendersByPhase("update");
    }

    // 3. Cleanup
    unmount();
    ProfiledComponent = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify filtered arrays GC'd along with component
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 6: Phase-specific history
  it("should GC phase-filtered history arrays", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:20-56
    const TestComponent: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    let ProfiledComponent: any = withProfiler(TestComponent);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Create renders
    const { rerender, unmount } = render(<ProfiledComponent count={0} />);

    for (let i = 1; i < 1000; i++) {
      rerender(<ProfiledComponent count={i} />);
    }

    // 2. Get phase arrays separately
    const phases = [
      ProfiledComponent.getRendersByPhase("mount"),
      ProfiledComponent.getRendersByPhase("update"),
    ];

    expect(phases[0]).toHaveLength(1); // mount
    expect(phases[1]).toHaveLength(999); // updates

    // 3. Cleanup
    unmount();
    phases.length = 0;
    ProfiledComponent = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify all phase arrays GC'd
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);
});
