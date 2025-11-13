import { render } from "@testing-library/react";
import LeakDetector from "jest-leak-detector";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src";

import type { FC } from "react";

/**
 * Memory leak tests for component lifecycle
 *
 * These tests verify that components are properly garbage collected after unmount:
 * - Component instances are released from memory
 * - Large render histories are cleaned up
 * - Cached data is released
 *
 * Pattern: Create → Render → Unmount → Null → GC → Verify
 *
 * @requires --expose-gc flag (run with: npm run test:memory)
 *
 * Note: These tests use 30s timeout due to multiple GC cycles required.
 */

/**
 * Helper: Force garbage collection multiple times
 *
 * Note: Memory leak detection with jest-leak-detector requires multiple GC cycles
 * and delays to ensure objects are actually collected.
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

describe("Memory: Component Lifecycle", () => {
  // Scenario 1: Basic mount/unmount
  it("should GC single component after unmount", async () => {
    // 1. Setup with detector
    const Component: FC<{ name: string }> = ({ name }) => (
      <div>Hello {name}</div>
    );
    let ProfiledComponent: any = withProfiler(Component);
    const detector = new LeakDetector(ProfiledComponent);

    // 2. Use component
    const { unmount } = render(<ProfiledComponent name="test" />);

    // Verify it rendered
    expect(ProfiledComponent.getRenderCount()).toBe(1);

    // 3. Cleanup
    unmount();
    ProfiledComponent = null;

    // 4. Force GC (multiple times for reliability)
    await forceGC();

    // 5. Verify
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 2: Multiple components isolation (reduced to 10 for speed)
  it("should GC multiple components independently", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:152-184
    // Reduced from 100 to 10 components to avoid timeout
    const detectors: LeakDetector[] = [];
    const components: any[] = [];

    // 1. Create 10 components with detectors
    for (let i = 0; i < 10; i++) {
      const Comp: FC = () => <div>Component {i}</div>;
      const ProfiledComp = withProfiler(Comp);

      detectors.push(new LeakDetector(ProfiledComp));
      components.push(ProfiledComp);
    }

    // 2. Render all
    const renderedComponents = components.map((C) => render(<C />));

    // Verify isolation: each component has exactly 1 render
    components.forEach((C) => {
      expect(C.getRenderCount()).toBe(1);
    });

    // 3. Unmount all
    renderedComponents.forEach(({ unmount }) => {
      unmount();
    });

    // 4. Clear references
    components.length = 0;

    // 5. Force GC
    await forceGC();

    // 6. Verify all GC'd
    const leaks = await Promise.all(detectors.map((d) => d.isLeaking()));
    const leakCount = leaks.filter(Boolean).length;

    expect(leakCount).toBe(0);
  }, 60_000);

  // Scenario 3: Rapid creation/destruction (reduced iterations)
  it("should GC components in rapid create/destroy loop", async () => {
    // Pattern from: tests/property/stress.properties.tsx:308-326
    // Reduced from 50 to 10 iterations
    const detectors: LeakDetector[] = [];

    // 1. Rapid loop: create → render → unmount → null
    for (let i = 0; i < 10; i++) {
      const Component: FC = () => <div>Rapid {i}</div>;
      let ProfiledComp: any = withProfiler(Component);
      const detector = new LeakDetector(ProfiledComp);

      detectors.push(detector);

      const { unmount } = render(<ProfiledComp />);

      expect(ProfiledComp.getRenderCount()).toBe(1);

      unmount();
      ProfiledComp = null;
    }

    // 2. Force GC after all iterations
    await forceGC();

    // 3. Verify no accumulation
    const leaks = await Promise.all(detectors.map((d) => d.isLeaking()));
    const leakCount = leaks.filter(Boolean).length;

    expect(leakCount).toBe(0);
  }, 60_000);

  // Scenario 4: Component with large render history
  it("should GC component with 1000+ render history", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:20-56
    const Component: FC<{ count: number }> = ({ count }) => (
      <div>Count: {count}</div>
    );
    let ProfiledComponent: any = withProfiler(Component);
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

    // 5. Verify component + large history array GC'd together
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 5: Component with cached data
  it("should GC component with cached method results", async () => {
    // Pattern from: tests/stress/high-volume.test.tsx:118-148
    const Component: FC<{ value: number }> = ({ value }) => (
      <div>Value: {value}</div>
    );
    let ProfiledComponent: any = withProfiler(Component);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Render component
    const { rerender, unmount } = render(<ProfiledComponent value={0} />);

    // 2. Generate some history
    for (let i = 1; i < 500; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // 3. Call getRenderHistory() 50x to create cached references
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

    // 6. Verify component + all cached references GC'd
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);

  // Scenario 6: Component with nested structure
  it("should GC component with nested elements", async () => {
    // Simplified nested test - just verify a component with nested JSX
    const Component: FC = () => (
      <div>
        <div>Parent</div>
        <div>
          <span>Nested child</span>
          <span>Another child</span>
        </div>
      </div>
    );

    let ProfiledComponent: any = withProfiler(Component);
    const detector = new LeakDetector(ProfiledComponent);

    // 1. Render component with nested structure
    const { unmount } = render(<ProfiledComponent />);

    // Verify it rendered
    expect(ProfiledComponent.getRenderCount()).toBe(1);

    // 2. Unmount
    unmount();

    // 3. Clear reference
    ProfiledComponent = null;

    // 4. Force GC
    await forceGC();

    // 5. Verify GC'd
    const isLeaking = await detector.isLeaking();

    expect(isLeaking).toBe(false);
  }, 30_000);
});
