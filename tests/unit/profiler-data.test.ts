/* eslint-disable vitest/no-conditional-expect */
import { describe, it, expect, vi } from "vitest";

import { ProfilerData } from "../../src/profiler/core/ProfilerData";

import type { PhaseType } from "../../src/types";

describe("ProfilerData", () => {
  describe("constructor", () => {
    it("should initialize with empty history", () => {
      const data = new ProfilerData();

      expect(data.getRenderCount()).toBe(0);
      expect(data.getHistory()).toStrictEqual([]);
    });
  });

  describe("addRender", () => {
    it("should add render to history", () => {
      const data = new ProfilerData();
      const render: PhaseType = "mount";

      data.addRender(render);

      expect(data.getRenderCount()).toBe(1);
      expect(data.getHistory()).toStrictEqual([render]);
    });

    it("should add multiple renders in order", () => {
      const data = new ProfilerData();
      const render1: PhaseType = "mount";
      const render2: PhaseType = "update";
      const render3: PhaseType = "update";

      data.addRender(render1);
      data.addRender(render2);
      data.addRender(render3);

      expect(data.getRenderCount()).toBe(3);
      expect(data.getHistory()).toStrictEqual([render1, render2, render3]);
    });

    it("should invalidate caches when adding render", () => {
      const data = new ProfilerData();
      const render1: PhaseType = "mount";

      // Get history to populate cache
      data.addRender(render1);
      const history1 = data.getHistory();

      // Add another render (should invalidate cache)
      const render2: PhaseType = "update";

      data.addRender(render2);
      const history2 = data.getHistory();

      // Should be different references (new frozen array)
      expect(history1).not.toBe(history2);
      expect(history2).toStrictEqual([render1, render2]);
    });
  });

  describe("getRenderCount", () => {
    it("should return 0 for empty history", () => {
      const data = new ProfilerData();

      expect(data.getRenderCount()).toBe(0);
    });

    it("should return correct count", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      expect(data.getRenderCount()).toBe(1);

      data.addRender("update");

      expect(data.getRenderCount()).toBe(2);

      data.addRender("update");

      expect(data.getRenderCount()).toBe(3);
    });
  });

  describe("getHistory", () => {
    it("should return immutable array", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      const history = data.getHistory();

      // Should be frozen
      expect(Object.isFrozen(history)).toBe(true);
    });

    it("should return new reference after addRender", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      const history1 = data.getHistory();

      data.addRender("update");
      const history2 = data.getHistory();

      expect(history1).not.toBe(history2);
    });

    it("should return empty array for empty history", () => {
      const data = new ProfilerData();

      expect(data.getHistory()).toStrictEqual([]);
    });
  });

  describe("getLastRender", () => {
    it("should return undefined for empty history", () => {
      const data = new ProfilerData();

      expect(data.getLastRender()).toBeUndefined();
    });

    it("should return last render", () => {
      const data = new ProfilerData();
      const render1: PhaseType = "mount";
      const render2: PhaseType = "update";
      const render3: PhaseType = "update";

      data.addRender(render1);

      expect(data.getLastRender()).toStrictEqual(render1);

      data.addRender(render2);

      expect(data.getLastRender()).toStrictEqual(render2);

      data.addRender(render3);

      expect(data.getLastRender()).toStrictEqual(render3);
    });

    it("should use cached history", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      const last1 = data.getLastRender();
      const last2 = data.getLastRender();

      // Should return same object from cached history
      expect(last1).toBe(last2);
    });
  });

  describe("getRenderAt", () => {
    it("should return undefined for empty history", () => {
      const data = new ProfilerData();

      expect(data.getRenderAt(0)).toBeUndefined();
      expect(data.getRenderAt(5)).toBeUndefined();
    });

    it("should return undefined for out of range index", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      expect(data.getRenderAt(1)).toBeUndefined();
      expect(data.getRenderAt(10)).toBeUndefined();
      expect(data.getRenderAt(-1)).toBeUndefined();
    });

    it("should return render at specific index", () => {
      const data = new ProfilerData();
      const render0: PhaseType = "mount";
      const render1: PhaseType = "update";
      const render2: PhaseType = "update";

      data.addRender(render0);
      data.addRender(render1);
      data.addRender(render2);

      expect(data.getRenderAt(0)).toStrictEqual(render0);
      expect(data.getRenderAt(1)).toStrictEqual(render1);
      expect(data.getRenderAt(2)).toStrictEqual(render2);
    });
  });

  describe("getRendersByPhase", () => {
    it("should return empty array when no renders match phase", () => {
      const data = new ProfilerData();

      expect(data.getRendersByPhase("mount")).toStrictEqual([]);

      data.addRender("update");

      expect(data.getRendersByPhase("mount")).toStrictEqual([]);
    });

    it("should filter renders by mount phase", () => {
      const data = new ProfilerData();
      const mount1: PhaseType = "mount";
      const update1: PhaseType = "update";
      const mount2: PhaseType = "mount";

      data.addRender(mount1);
      data.addRender(update1);
      data.addRender(mount2);

      const mountRenders = data.getRendersByPhase("mount");

      expect(mountRenders).toStrictEqual([mount1, mount2]);
    });

    it("should filter renders by update phase", () => {
      const data = new ProfilerData();
      const mount: PhaseType = "mount";
      const update1: PhaseType = "update";
      const update2: PhaseType = "update";

      data.addRender(mount);
      data.addRender(update1);
      data.addRender(update2);

      const updateRenders = data.getRendersByPhase("update");

      expect(updateRenders).toStrictEqual([update1, update2]);
    });

    it("should filter renders by nested-update phase", () => {
      const data = new ProfilerData();
      const mount: PhaseType = "mount";
      const nested: PhaseType = "nested-update";

      data.addRender(mount);
      data.addRender(nested);

      const nestedRenders = data.getRendersByPhase("nested-update");

      expect(nestedRenders).toStrictEqual([nested]);
    });

    it("should return frozen array", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      const mountRenders = data.getRendersByPhase("mount");

      expect(Object.isFrozen(mountRenders)).toBe(true);
    });

    it("should cache results per phase", () => {
      const data = new ProfilerData();

      data.addRender("mount");
      data.addRender("update");

      const mount1 = data.getRendersByPhase("mount");
      const mount2 = data.getRendersByPhase("mount");
      const update1 = data.getRendersByPhase("update");
      const update2 = data.getRendersByPhase("update");

      // Same phase should return same reference
      expect(mount1).toBe(mount2);
      expect(update1).toBe(update2);

      // Different phases should be different references
      expect(mount1).not.toBe(update1);
    });

    it("should invalidate cache after addRender", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      const mount1 = data.getRendersByPhase("mount");

      data.addRender("mount");
      const mount2 = data.getRendersByPhase("mount");

      // Should be different references (cache invalidated)
      expect(mount1).not.toBe(mount2);
      expect(mount2).toHaveLength(2);
    });
  });

  describe("hasMounted", () => {
    it("should return false for empty history", () => {
      const data = new ProfilerData();

      expect(data.hasMounted()).toBe(false);
    });

    it("should return true when mount render exists", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      expect(data.hasMounted()).toBe(true);
    });

    it("should return true with multiple phase renders", () => {
      const data = new ProfilerData();

      data.addRender("mount");
      data.addRender("update");
      data.addRender("nested-update");

      expect(data.hasMounted()).toBe(true);
    });

    it("should consistently return result on multiple calls", () => {
      const data = new ProfilerData();

      data.addRender("mount");

      const result1 = data.hasMounted();
      const result2 = data.hasMounted();
      const result3 = data.hasMounted();

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);
    });

    it("should update from false to true after first render", () => {
      const data = new ProfilerData();

      expect(data.hasMounted()).toBe(false);

      data.addRender("mount");

      expect(data.hasMounted()).toBe(true);

      data.addRender("update");

      expect(data.hasMounted()).toBe(true);
    });

    it("should throw error when first render is not mount (invariant violation)", () => {
      const data = new ProfilerData();

      // Simulate bug: first render is "update" instead of "mount"
      data.addRender("update");

      expect(() => data.hasMounted()).toThrow(Error);
      expect(() => data.hasMounted()).toThrow(/Invariant violation/);
      expect(() => data.hasMounted()).toThrow(/First render must be "mount"/);
      expect(() => data.hasMounted()).toThrow(/got "update"/);

      // Verify exact error explanation (kills StringLiteral mutation)
      expect(() => data.hasMounted()).toThrow(
        /This indicates a bug in React Profiler or library integration\./,
      );
    });
  });

  describe("clear", () => {
    it("should clear empty history", () => {
      const data = new ProfilerData();

      data.clear();

      expect(data.getRenderCount()).toBe(0);
      expect(data.getHistory()).toStrictEqual([]);
    });

    it("should clear all history", () => {
      const data = new ProfilerData();

      data.addRender("mount");
      data.addRender("update");
      data.addRender("update");

      expect(data.getRenderCount()).toBe(3);

      data.clear();

      expect(data.getRenderCount()).toBe(0);
      expect(data.getHistory()).toStrictEqual([]);
      expect(data.getLastRender()).toBeUndefined();
      expect(data.hasMounted()).toBe(false);
    });

    it("should clear all caches", () => {
      const data = new ProfilerData();

      data.addRender("mount");
      data.addRender("update");

      // Populate caches
      const history1 = data.getHistory();
      const mount1 = data.getRendersByPhase("mount");
      const hasMounted1 = data.hasMounted();

      expect(history1).toHaveLength(2);
      expect(mount1).toHaveLength(1);
      expect(hasMounted1).toBe(true);

      data.clear();

      // Verify caches are cleared
      expect(data.getHistory()).toStrictEqual([]);
      expect(data.getRendersByPhase("mount")).toStrictEqual([]);
      expect(data.hasMounted()).toBe(false);
    });

    it("should allow adding renders after clear", () => {
      const data = new ProfilerData();

      data.addRender("mount");
      data.clear();

      data.addRender("mount");

      expect(data.getRenderCount()).toBe(1);
      expect(data.getHistory()).toStrictEqual(["mount"]);
      expect(data.hasMounted()).toBe(true);
    });
  });

  describe("integration scenarios", () => {
    it("should handle typical component lifecycle", () => {
      const data = new ProfilerData();

      // Mount
      data.addRender("mount");

      expect(data.getRenderCount()).toBe(1);
      expect(data.hasMounted()).toBe(true);
      expect(data.getRendersByPhase("mount")).toHaveLength(1);

      // Updates
      data.addRender("update");
      data.addRender("update");

      expect(data.getRenderCount()).toBe(3);
      expect(data.getRendersByPhase("update")).toHaveLength(2);

      // Nested update
      data.addRender("nested-update");

      expect(data.getRenderCount()).toBe(4);
      expect(data.getRendersByPhase("nested-update")).toHaveLength(1);
    });

    it("should maintain phase cache performance across multiple operations", () => {
      const data = new ProfilerData();

      // Add renders
      for (let i = 0; i < 10; i++) {
        data.addRender(i === 0 ? "mount" : "update");
      }

      // Multiple reads of phase cache should use cache
      const mount1 = data.getRendersByPhase("mount");
      const mount2 = data.getRendersByPhase("mount");

      expect(mount1).toBe(mount2);
    });
  });

  describe("event system integration", () => {
    it("should emit event when addRender is called", () => {
      const data = new ProfilerData();
      const listener = vi.fn();

      data.getEvents().subscribe(listener);

      data.addRender("mount");

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        count: 1,
        phase: "mount",
        history: ["mount"],
      });
    });

    it("should emit correct data for multiple renders", () => {
      const data = new ProfilerData();
      const listener = vi.fn();

      data.getEvents().subscribe(listener);

      data.addRender("mount");
      data.addRender("update");
      data.addRender("update");

      expect(listener).toHaveBeenCalledTimes(3);

      // Check first call - using objectContaining for getter property compatibility
      const firstCall = listener.mock.calls[0]![0];

      expect(firstCall.count).toBe(1);
      expect(firstCall.phase).toBe("mount");
      expect(firstCall.history).toStrictEqual(["mount"]);

      // Check second call
      const secondCall = listener.mock.calls[1]![0];

      expect(secondCall.count).toBe(2);
      expect(secondCall.phase).toBe("update");
      expect(secondCall.history).toStrictEqual(["mount", "update"]);

      // Check third call
      const thirdCall = listener.mock.calls[2]![0];

      expect(thirdCall.count).toBe(3);
      expect(thirdCall.phase).toBe("update");
      expect(thirdCall.history).toStrictEqual(["mount", "update", "update"]);
    });

    it("should pass frozen history in events", () => {
      const data = new ProfilerData();
      const listener = vi.fn();

      data.getEvents().subscribe(listener);

      data.addRender("mount");

      const receivedInfo = listener.mock.calls[0]![0];

      expect(Object.isFrozen(receivedInfo.history)).toBe(true);
    });

    it("should clear event listeners when clear is called", () => {
      const data = new ProfilerData();
      const listener = vi.fn();

      data.getEvents().subscribe(listener);

      data.addRender("mount");

      expect(listener).toHaveBeenCalledTimes(1);

      data.clear();

      data.addRender("mount");

      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it("should not emit events if no listeners", () => {
      const data = new ProfilerData();

      // Should not throw even without listeners
      expect(() => {
        data.addRender("mount");
        data.addRender("update");
      }).not.toThrow();

      expect(data.getRenderCount()).toBe(2);
    });

    it("should support multiple subscribers", () => {
      const data = new ProfilerData();
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      data.getEvents().subscribe(listener1);
      data.getEvents().subscribe(listener2);
      data.getEvents().subscribe(listener3);

      data.addRender("mount");

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(listener3).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe listeners correctly", () => {
      const data = new ProfilerData();
      const listener = vi.fn();

      const unsubscribe = data.getEvents().subscribe(listener);

      data.addRender("mount");

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      data.addRender("update");

      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe("Circuit Breaker (Infinite Loop Detection)", () => {
    it("should allow renders up to 10,000", () => {
      const data = new ProfilerData();

      // Should not throw for 10,000 renders
      expect(() => {
        for (let i = 0; i < 10_000; i++) {
          data.addRender(i === 0 ? "mount" : "update");
        }
      }).not.toThrow();

      expect(data.getRenderCount()).toBe(10_000);
    });

    it("should throw error on 10,001st render", () => {
      const data = new ProfilerData();

      // Add 10,000 renders (OK)
      for (let i = 0; i < 10_000; i++) {
        data.addRender(i === 0 ? "mount" : "update");
      }

      // 10,001st render should throw
      expect(() => {
        data.addRender("update");
      }).toThrow(/Infinite render loop detected/);
    });

    it("should include render count in error message", () => {
      const data = new ProfilerData();

      for (let i = 0; i < 10_000; i++) {
        data.addRender(i === 0 ? "mount" : "update");
      }

      expect(() => {
        data.addRender("update");
      }).toThrow(/Component rendered 10000 times/);
    });

    it("should include last 10 phases in error message", () => {
      const data = new ProfilerData();

      // Add mount + 9,999 updates
      data.addRender("mount");

      for (let i = 1; i < 10_000; i++) {
        data.addRender("update");
      }

      // Try to add 10,001st (should show last 10 phases = all "update")
      try {
        data.addRender("update");

        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);

        const message = (error as Error).message;

        expect(message).toContain("Last 10 phases");
        expect(message).toContain('"update"');

        // Verify comma-separated format (last 9 from history + the new one)
        expect(message).toContain(
          '"update", "update", "update", "update", "update", "update", "update", "update", "update", "update"',
        );
      }
    });

    it("should show LAST 9 phases, not first 9 (slice(-9) validation)", () => {
      const data = new ProfilerData();

      // Strategy: Create history with different phases at start vs end
      // Start: mount, update, update, ...
      // End: nested-update (last 9)

      data.addRender("mount"); // #1

      // Add 9,990 "update" phases (#2 to #9,991)
      for (let i = 1; i < 9991; i++) {
        data.addRender("update");
      }

      // Add 9 "nested-update" phases (#9,992 to #10,000)
      for (let i = 0; i < 9; i++) {
        data.addRender("nested-update");
      }

      // Try to add 10,001st - should show LAST 9 "nested-update" + new "update"
      try {
        data.addRender("update");

        throw new Error("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);

        const message = (error as Error).message;

        // Should contain the LAST 9 phases (all "nested-update")
        expect(message).toContain('"nested-update"');

        // Should NOT contain "mount" (proves it's not showing first 9)
        expect(message).not.toContain('"mount"');

        // CRITICAL: Verify EXACTLY 10 phases, not more (kills slice(+9) mutation)
        // Pattern: "Last 10 phases: [" + exactly 10 comma-separated phases + "]"
        const last10Pattern =
          /Last 10 phases: \[("nested-update", ){9}"update"\]/;

        expect(message).toMatch(last10Pattern);

        // Double-check: should NOT have extra phases before the pattern
        // If slice(+9) is used, there will be thousands of "update" before "nested-update"
        const extractLast10 = /Last 10 phases: \[(.*?)\]/.exec(message)?.[1];

        expect(extractLast10).toBeDefined();

        // Count phases (split by ", " and count)
        const phases = extractLast10!.split(", ");

        expect(phases).toHaveLength(10); // EXACTLY 10, not 9991!
      }
    });

    it("should include debugging tips in error message", () => {
      const data = new ProfilerData();

      for (let i = 0; i < 10_000; i++) {
        data.addRender(i === 0 ? "mount" : "update");
      }

      try {
        data.addRender("update");

        throw new Error("Should have thrown");
      } catch (error) {
        const message = (error as Error).message;

        // Verify exact render count in "Attempted to add"
        expect(message).toContain("Attempted to add render #10001");

        // Verify bug explanation header
        expect(message).toContain("This likely indicates a bug:");

        // Verify all debugging tips (exact strings)
        expect(message).toContain(
          "  • useEffect with missing/wrong dependencies",
        );
        expect(message).toContain("  • setState called during render");
        expect(message).toContain("  • Circular state updates");

        // Verify tip emoji
        expect(message).toContain("💡");
      }
    });

    it("should show pattern in last 10 phases for mixed renders", () => {
      const data = new ProfilerData();

      // Add 9,995 updates
      for (let i = 0; i < 9995; i++) {
        data.addRender(i === 0 ? "mount" : "update");
      }

      // Add 5 nested-updates (will be in last 10)
      for (let i = 0; i < 5; i++) {
        data.addRender("nested-update");
      }

      try {
        data.addRender("update");

        throw new Error("Should have thrown");
      } catch (error) {
        const message = (error as Error).message;

        // Should show mix of "update" and "nested-update" in last 10
        expect(message).toContain('"update"');
        expect(message).toContain('"nested-update"');
      }
    });

    it("should not affect normal operations after circuit breaker triggers", () => {
      const data = new ProfilerData();

      // Fill to limit
      for (let i = 0; i < 10_000; i++) {
        data.addRender(i === 0 ? "mount" : "update");
      }

      // Trigger circuit breaker
      expect(() => {
        data.addRender("update");
      }).toThrow();

      // Can still read data
      expect(data.getRenderCount()).toBe(10_000);
      expect(data.hasMounted()).toBe(true);
      expect(data.getHistory()).toHaveLength(10_000);

      // Can clear and restart
      data.clear();

      expect(data.getRenderCount()).toBe(0);

      // Can add renders again after clear
      expect(() => {
        data.addRender("mount");
      }).not.toThrow();

      expect(data.getRenderCount()).toBe(1);
    });
  });
});
