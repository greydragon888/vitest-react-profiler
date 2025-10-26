import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { withProfiler } from "../../src";
import { memo } from "react";
import { Counter } from "../fixtures/Counter";
import { ExpensiveComponent } from "../fixtures/ExpensiveComponent";

describe("Profiler Usage Examples", () => {
  // Create profiled versions of components
  const ProfiledCounter = withProfiler(Counter, "Counter");
  const ProfiledExpensive = withProfiler(
    ExpensiveComponent,
    "ExpensiveComponent",
  );

  // Components are automatically cleared after each test
  // No manual cleanup needed!

  describe("Basic render counting", () => {
    it("should count initial mount", () => {
      render(<ProfiledCounter />);

      expect(ProfiledCounter).toHaveRendered();
      expect(ProfiledCounter).toHaveRenderedTimes(1);
      expect(ProfiledCounter).toHaveMountedOnce();
    });

    it("should count re-renders on prop changes", () => {
      const { rerender } = render(<ProfiledCounter initialCount={0} />);

      expect(ProfiledCounter).toHaveRenderedTimes(1);

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveRenderedTimes(2);

      rerender(<ProfiledCounter initialCount={10} />);

      expect(ProfiledCounter).toHaveRenderedTimes(3);
    });

    it("should count re-renders on state changes", () => {
      render(<ProfiledCounter />);

      const incrementButton = screen.getByText("Increment");

      expect(ProfiledCounter).toHaveRenderedTimes(1);

      fireEvent.click(incrementButton);

      expect(ProfiledCounter).toHaveRenderedTimes(2);

      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(ProfiledCounter).toHaveRenderedTimes(4);
    });
  });

  describe("Performance monitoring", () => {
    it("should measure render duration", () => {
      render(<ProfiledCounter />);

      // Check that render completed within 50ms (adjust based on your needs)
      expect(ProfiledCounter).toHaveRenderedWithin(50);

      // Get specific render information
      const lastRender = ProfiledCounter.getLastRender();

      expect(lastRender?.phase).toBe("mount");
      expect(lastRender?.actualDuration).toBeLessThan(50);
    });

    it("should track average render time", () => {
      const { rerender } = render(<ProfiledCounter />);

      // Trigger multiple renders
      for (let i = 0; i < 5; i++) {
        rerender(<ProfiledCounter initialCount={i} />);
      }

      expect(ProfiledCounter).toHaveRenderedTimes(6); // 1 mount + 5 updates
      expect(ProfiledCounter).toHaveAverageRenderTime(20);

      const avgTime = ProfiledCounter.getAverageRenderTime();

      console.log(`Average render time: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe("Mount/Update phase tracking", () => {
    it("should distinguish between mount and update phases", () => {
      const { rerender } = render(<ProfiledCounter />);

      // First render is a mount
      const firstRender = ProfiledCounter.getRenderAt(0);

      expect(firstRender?.phase).toBe("mount");

      // Subsequent renders are updates
      rerender(<ProfiledCounter initialCount={5} />);
      const secondRender = ProfiledCounter.getRenderAt(1);

      expect(secondRender?.phase).toBe("update");

      // Check phase-specific assertions
      expect(ProfiledCounter).toHaveMountedOnce();

      // Get all updates
      const updates = ProfiledCounter.getRendersByPhase("update");

      expect(updates).toHaveLength(1);
    });

    it("should track mounts and updates separately", () => {
      const { rerender } = render(<ProfiledCounter />);

      // Initial render is a mount
      expect(ProfiledCounter.getRendersByPhase("mount")).toHaveLength(1);

      rerender(<ProfiledCounter initialCount={10} />);
      rerender(<ProfiledCounter initialCount={20} />);

      // After rerenders, we have 1 mount and 2 updates
      expect(ProfiledCounter.getRendersByPhase("mount")).toHaveLength(1);
      expect(ProfiledCounter.getRendersByPhase("update")).toHaveLength(2);
    });
  });

  describe("Memoization effectiveness", () => {
    it("should verify memo prevents unnecessary renders", () => {
      const data = ["apple", "banana", "cherry"];

      const MemoizedProfiledExpensive = memo(ProfiledExpensive);
      const { rerender } = render(<MemoizedProfiledExpensive data={data} />);

      expect(ProfiledExpensive).toHaveRenderedTimes(1);

      // Same reference - memo should prevent re-render
      rerender(<MemoizedProfiledExpensive data={data} />);

      expect(ProfiledExpensive).toHaveRenderedTimes(1);

      // New reference - should trigger re-render
      rerender(<MemoizedProfiledExpensive data={[...data]} />);

      expect(ProfiledExpensive).toHaveRenderedTimes(2);
    });
  });

  describe("Complex scenarios", () => {
    it("should track renders with side effects", () => {
      const onCountChange = vi.fn();

      render(<ProfiledCounter onCountChange={onCountChange} />);

      expect(ProfiledCounter).toHaveRenderedTimes(1);
      expect(onCountChange).toHaveBeenCalledTimes(1);

      // Click increment
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRenderedTimes(2);
      expect(onCountChange).toHaveBeenCalledTimes(2);

      // Verify render history
      const history = ProfiledCounter.getRenderHistory();

      expect(history).toHaveLength(2);
      expect(history[0]?.phase).toBe("mount");
      expect(history[1]?.phase).toBe("update");
    });

    it("should handle multiple instances correctly", () => {
      // Each instance is tracked separately at the component level
      const { rerender: rerender1 } = render(
        <ProfiledCounter key="counter1" label="First" />,
      );

      render(<ProfiledCounter key="counter2" label="Second" />);

      // Both instances contribute to the same counter
      expect(ProfiledCounter).toHaveRenderedTimes(2);

      // Updates also accumulate
      rerender1(<ProfiledCounter key="counter1" label="First Updated" />);

      expect(ProfiledCounter).toHaveRenderedTimes(3);
    });
  });
});
