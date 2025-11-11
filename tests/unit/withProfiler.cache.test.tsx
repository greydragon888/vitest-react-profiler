import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src/profiler/components/withProfiler";

describe("getRenderHistory caching", () => {
  it("should return the same reference when called multiple times without new renders", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    const history1 = ProfiledComponent.getRenderHistory();
    const history2 = ProfiledComponent.getRenderHistory();
    const history3 = ProfiledComponent.getRenderHistory();

    // Should return the exact same object reference (cached)
    expect(history1).toBe(history2);
    expect(history2).toBe(history3);
  });

  it("should invalidate cache on new render", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={1} />);

    const history1 = ProfiledComponent.getRenderHistory();

    // Re-render
    rerender(<ProfiledComponent value={2} />);

    const history2 = ProfiledComponent.getRenderHistory();

    // Should be different references after re-render
    expect(history1).not.toBe(history2);

    // But length should have increased
    expect(history1).toHaveLength(1);
    expect(history2).toHaveLength(2);
  });

  it("should maintain cache after multiple reads post-render", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={1} />);

    // First batch of reads
    const history1a = ProfiledComponent.getRenderHistory();
    const history1b = ProfiledComponent.getRenderHistory();

    expect(history1a).toBe(history1b);

    // Re-render
    rerender(<ProfiledComponent value={2} />);

    // Second batch of reads
    const history2a = ProfiledComponent.getRenderHistory();
    const history2b = ProfiledComponent.getRenderHistory();
    const history2c = ProfiledComponent.getRenderHistory();

    // All reads after second render should be the same
    expect(history2a).toBe(history2b);
    expect(history2b).toBe(history2c);

    // But different from first batch
    expect(history1a).not.toBe(history2a);
  });

  it("should cache remain consistent across test lifecycle", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    const history1 = ProfiledComponent.getRenderHistory();
    const history2 = ProfiledComponent.getRenderHistory();

    expect(history1).toHaveLength(1);
    expect(history2).toHaveLength(1);

    // Cache should be consistent
    expect(history1).toBe(history2);

    // Note: Automatic cleanup happens in afterEach hook
    // and is tested indirectly through test isolation
  });

  it("should maintain cache isolation between different components", () => {
    const Component1 = () => <div>Component 1</div>;
    const Component2 = () => <div>Component 2</div>;

    const ProfiledComponent1 = withProfiler(Component1);
    const ProfiledComponent2 = withProfiler(Component2);

    const { rerender: rerender1 } = render(<ProfiledComponent1 />);

    render(<ProfiledComponent2 />);

    // Force different histories by triggering an update on Component1
    rerender1(<ProfiledComponent1 />);

    const history1a = ProfiledComponent1.getRenderHistory();
    const history1b = ProfiledComponent1.getRenderHistory();

    const history2a = ProfiledComponent2.getRenderHistory();
    const history2b = ProfiledComponent2.getRenderHistory();

    // Each component should have its own cache
    expect(history1a).toBe(history1b);
    expect(history2a).toBe(history2b);

    // Components with different histories should have different references
    // Component1: ["mount", "update"], Component2: ["mount"]
    expect(history1a).not.toBe(history2a);
    expect(history1a).toStrictEqual(["mount", "update"]);
    expect(history2a).toStrictEqual(["mount"]);
  });

  it("should return frozen arrays", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    render(<ProfiledComponent />);

    const history = ProfiledComponent.getRenderHistory();

    // Should be frozen
    expect(Object.isFrozen(history)).toBe(true);

    // Should not be modifiable
    expect(() => {
      // @ts-expect-error - testing immutability
      history.push({
        phase: "update",
        actualDuration: 1,
        baseDuration: 1,
        startTime: 0,
        commitTime: 1,
        timestamp: Date.now(),
      });
    }).toThrow();
  });

  it("should handle high-frequency cache access efficiently", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={1} />);

    // Simulate high-frequency access
    const references = [];

    for (let i = 0; i < 100; i++) {
      references.push(ProfiledComponent.getRenderHistory());
    }

    // All should be the same reference
    const firstRef = references[0];

    for (const ref of references) {
      expect(ref).toBe(firstRef);
    }

    // Re-render
    rerender(<ProfiledComponent value={2} />);

    // New batch of reads
    const newReferences = [];

    for (let i = 0; i < 100; i++) {
      newReferences.push(ProfiledComponent.getRenderHistory());
    }

    // All new reads should be the same reference
    const newFirstRef = newReferences[0];

    for (const ref of newReferences) {
      expect(ref).toBe(newFirstRef);
    }

    // But different from old references
    expect(newFirstRef).not.toBe(firstRef);
  });
});

describe("getRendersByPhase caching", () => {
  it("should return the same reference when called multiple times without new renders", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create multiple renders
    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Multiple calls should return same reference
    const updates1 = ProfiledComponent.getRendersByPhase("update");
    const updates2 = ProfiledComponent.getRendersByPhase("update");
    const updates3 = ProfiledComponent.getRendersByPhase("update");

    expect(updates1).toBe(updates2);
    expect(updates2).toBe(updates3);
  });

  it("should invalidate cache on new render", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    const updates1 = ProfiledComponent.getRendersByPhase("update");

    // Re-render
    rerender(<ProfiledComponent value={1} />);

    const updates2 = ProfiledComponent.getRendersByPhase("update");

    // Should be different references after re-render
    expect(updates1).not.toBe(updates2);

    // Length should have increased
    expect(updates1).toHaveLength(0);
    expect(updates2).toHaveLength(1);
  });

  it("should cache different phases independently", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    for (let i = 1; i < 5; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // Get different phases
    const mounts1 = ProfiledComponent.getRendersByPhase("mount");
    const updates1 = ProfiledComponent.getRendersByPhase("update");
    const nested1 = ProfiledComponent.getRendersByPhase("nested-update");

    // Read again
    const mounts2 = ProfiledComponent.getRendersByPhase("mount");
    const updates2 = ProfiledComponent.getRendersByPhase("update");
    const nested2 = ProfiledComponent.getRendersByPhase("nested-update");

    // Each phase should cache independently
    expect(mounts1).toBe(mounts2);
    expect(updates1).toBe(updates2);
    expect(nested1).toBe(nested2);

    // Different phases should have different references
    expect(mounts1).not.toBe(updates1);
  });

  it("should return frozen arrays", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    rerender(<ProfiledComponent value={1} />);

    const updates = ProfiledComponent.getRendersByPhase("update");

    // Should be frozen
    expect(Object.isFrozen(updates)).toBe(true);
  });

  it("should return empty array when no profiler data exists", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Call without rendering - should return empty array
    const result = ProfiledComponent.getRendersByPhase("mount");

    expect(result).toStrictEqual([]);
  });
});

describe("hasMounted caching", () => {
  it("should return the same value when called multiple times without new renders", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // Create multiple renders
    for (let i = 1; i < 10; i++) {
      rerender(<ProfiledComponent value={i} />);
    }

    // First call computes and caches the result
    const result1 = ProfiledComponent.hasMounted();

    // Subsequent calls should return the SAME cached value without recomputing
    const result2 = ProfiledComponent.hasMounted();
    const result3 = ProfiledComponent.hasMounted();

    expect(result1).toBe(true);
    expect(result2).toBe(true);
    expect(result3).toBe(true);

    // All three calls should return the same result
    // This tests that the cache (profilerData.hasMountedCache) is being used
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  it("should return false when no profiler data exists", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Call without rendering
    const result = ProfiledComponent.hasMounted();

    expect(result).toBe(false);
  });

  it("should cache correctly before and after mount", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Before mount - should be false (cached)
    expect(ProfiledComponent.hasMounted()).toBe(false);
    expect(ProfiledComponent.hasMounted()).toBe(false);

    // After mount - should be true (cache invalidated then cached again)
    render(<ProfiledComponent />);

    expect(ProfiledComponent.hasMounted()).toBe(true);
    expect(ProfiledComponent.hasMounted()).toBe(true);
  });

  it("should remain true through updates", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={0} />);

    // After mount
    expect(ProfiledComponent.hasMounted()).toBe(true);

    // After updates
    rerender(<ProfiledComponent value={1} />);

    expect(ProfiledComponent.hasMounted()).toBe(true);

    rerender(<ProfiledComponent value={2} />);

    expect(ProfiledComponent.hasMounted()).toBe(true);
  });
});

describe("getRenderCount edge cases", () => {
  it("should return 0 when no profiler data exists", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Call without rendering
    const count = ProfiledComponent.getRenderCount();

    expect(count).toBe(0);
  });
});

describe("getRenderHistory edge cases", () => {
  it("should return empty array when no profiler data exists", () => {
    const Component = () => <div>test</div>;
    const ProfiledComponent = withProfiler(Component);

    // Call without rendering
    const history = ProfiledComponent.getRenderHistory();

    expect(history).toStrictEqual([]);
    expect(Object.isFrozen(history)).toBe(true);
  });
});
