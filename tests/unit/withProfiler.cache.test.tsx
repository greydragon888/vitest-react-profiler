import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { withProfiler } from "../../src/withProfiler";

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

  it("should handle methods that depend on getRenderHistory", () => {
    const Component = ({ value }: { value: number }) => <div>{value}</div>;
    const ProfiledComponent = withProfiler(Component);

    const { rerender } = render(<ProfiledComponent value={1} />);

    // Call methods that internally use getRenderHistory
    const avg1 = ProfiledComponent.getAverageRenderTime();
    const avg2 = ProfiledComponent.getAverageRenderTime();

    // Average should be consistent
    expect(avg1).toBe(avg2);

    // Get phases
    const mounts1 = ProfiledComponent.getRendersByPhase("mount");
    const mounts2 = ProfiledComponent.getRendersByPhase("mount");

    expect(mounts1).toHaveLength(1);
    expect(mounts2).toHaveLength(1);

    // Re-render
    rerender(<ProfiledComponent value={2} />);

    // New average after re-render
    const avg3 = ProfiledComponent.getAverageRenderTime();

    // Should be recalculated
    expect(avg3).toBeDefined();

    // Phases should include update now
    const updates = ProfiledComponent.getRendersByPhase("update");

    expect(updates).toHaveLength(1);
  });

  it("should maintain cache isolation between different components", () => {
    const Component1 = () => <div>Component 1</div>;
    const Component2 = () => <div>Component 2</div>;

    const ProfiledComponent1 = withProfiler(Component1);
    const ProfiledComponent2 = withProfiler(Component2);

    render(<ProfiledComponent1 />);
    render(<ProfiledComponent2 />);

    const history1a = ProfiledComponent1.getRenderHistory();
    const history1b = ProfiledComponent1.getRenderHistory();

    const history2a = ProfiledComponent2.getRenderHistory();
    const history2b = ProfiledComponent2.getRenderHistory();

    // Each component should have its own cache
    expect(history1a).toBe(history1b);
    expect(history2a).toBe(history2b);

    // Different components should have different histories
    expect(history1a).not.toBe(history2a);
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
