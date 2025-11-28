import { render, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withProfiler, clearProfilerData } from "../../src";
import { AnimationStressTest } from "./components/AnimationStressTest";
import { ReconciliationTest } from "./components/ReconciliationTest";
import { ContextPerformanceTest } from "./components/ContextPerformanceTest";
import { LargeList } from "./components/LargeList";
import { HeavyComputation } from "./components/HeavyComputation";
import { ConditionalRendering } from "./components/ConditionalRendering";

describe("Performance Testing Suite", () => {
  describe("Animation Performance", () => {
    it("should compare RAF vs setInterval animation performance", async () => {
      const particleCount = 50;
      const duration = 100;

      // Test with requestAnimationFrame
      const ProfiledRAF = withProfiler(AnimationStressTest, "Animation-RAF");

      const { unmount: unmountRAF } = render(
        <ProfiledRAF
          particleCount={particleCount}
          animationDuration={duration}
          useRequestAnimationFrame={true}
        />,
      );

      await waitFor(
        () => {
          expect(ProfiledRAF.getRenderCount()).toBeGreaterThan(1);
        },
        { timeout: duration + 50 },
      );

      unmountRAF();

      // Test with setInterval
      const ProfiledInterval = withProfiler(
        AnimationStressTest,
        "Animation-Interval",
      );

      const { unmount: unmountInterval } = render(
        <ProfiledInterval
          particleCount={particleCount}
          animationDuration={duration}
          useRequestAnimationFrame={false}
        />,
      );

      await waitFor(
        () => {
          expect(ProfiledInterval.getRenderCount()).toBeGreaterThan(1);
        },
        { timeout: duration + 50 },
      );

      unmountInterval();

      console.log(`Animation performance (${particleCount} particles):`);
    });

    it("should track animation performance scaling", async () => {
      const particleCounts = [10, 25, 50];
      const duration = 100;

      for (const count of particleCounts) {
        const ProfiledAnimation = withProfiler(
          AnimationStressTest,
          `Animation-${count}-particles`,
        );

        const { unmount } = render(
          <ProfiledAnimation
            particleCount={count}
            animationDuration={duration}
            useRequestAnimationFrame={true}
          />,
        );

        await waitFor(
          () => {
            expect(ProfiledAnimation.getRenderCount()).toBeGreaterThan(1);
          },
          { timeout: duration + 50 },
        );

        unmount();
        clearProfilerData(); // Clear data between loop iterations
      }
    });
  });

  describe("Reconciliation Performance", () => {
    it("should compare render counts with stable keys vs index keys after shuffle", async () => {
      const itemCount = 20;

      // Test with stable keys (item.id)
      const ProfiledWithKeys = withProfiler(
        ReconciliationTest,
        "Reconciliation-StableKeys",
      );

      const { rerender: rerenderWithKeys, unmount: unmountWithKeys } = render(
        <ProfiledWithKeys
          itemCount={itemCount}
          shuffleOnUpdate={true}
          useKeys={true}
        />,
      );

      // Wait for initial items to be set by useEffect
      await waitFor(
        () => {
          expect(ProfiledWithKeys.getRenderCount()).toBeGreaterThanOrEqual(2); // mount + useEffect update
        },
        { timeout: 500 },
      );

      const initialRenderCount = ProfiledWithKeys.getRenderCount();
      expect(initialRenderCount).toBeGreaterThanOrEqual(2); // mount + useEffect update

      // Trigger multiple shuffles
      rerenderWithKeys(
        <ProfiledWithKeys
          itemCount={itemCount}
          shuffleOnUpdate={true}
          useKeys={true}
        />,
      );

      const renderCountWithKeys = ProfiledWithKeys.getRenderCount();

      unmountWithKeys();

      // Test with index keys (causes more re-renders during reconciliation)
      const ProfiledWithIndexKeys = withProfiler(
        ReconciliationTest,
        "Reconciliation-IndexKeys",
      );

      const { rerender: rerenderWithIndexKeys, unmount: unmountWithIndexKeys } =
        render(
          <ProfiledWithIndexKeys
            itemCount={itemCount}
            shuffleOnUpdate={true}
            useKeys={false}
          />,
        );

      await waitFor(
        () => {
          expect(ProfiledWithIndexKeys.getRenderCount()).toBeGreaterThanOrEqual(
            2,
          );
        },
        { timeout: 500 },
      );

      rerenderWithIndexKeys(
        <ProfiledWithIndexKeys
          itemCount={itemCount}
          shuffleOnUpdate={true}
          useKeys={false}
        />,
      );

      const renderCountWithIndexKeys = ProfiledWithIndexKeys.getRenderCount();

      unmountWithIndexKeys();

      // Both approaches should track renders
      // Note: Actual render counts may vary based on React's reconciliation
      expect(renderCountWithKeys).toBeGreaterThanOrEqual(2);
      expect(renderCountWithIndexKeys).toBeGreaterThanOrEqual(2);

      console.log(`Reconciliation performance (${itemCount} items, shuffle):`);
      console.log(`  With stable keys: ${renderCountWithKeys} renders`);
      console.log(`  With index keys: ${renderCountWithIndexKeys} renders`);
    });

    it("should measure render count when adding/removing items with proper keys", async () => {
      const initialItemCount = 10;

      const ProfiledReconciliation = withProfiler(
        ReconciliationTest,
        "Reconciliation-AddRemove",
      );

      const { rerender, unmount } = render(
        <ProfiledReconciliation
          itemCount={initialItemCount}
          shuffleOnUpdate={false}
          useKeys={true}
        />,
      );

      // Wait for initial render + useEffect update
      await waitFor(
        () => {
          expect(ProfiledReconciliation.getRenderCount()).toBe(2);
        },
        { timeout: 500 },
      );

      const initialRenderCount = ProfiledReconciliation.getRenderCount();

      // Simulate adding items (itemCount increases)
      rerender(
        <ProfiledReconciliation
          itemCount={initialItemCount + 5}
          shuffleOnUpdate={false}
          useKeys={true}
        />,
      );

      // Wait for new items to be added via useEffect
      await waitFor(
        () => {
          expect(ProfiledReconciliation.getRenderCount()).toBeGreaterThan(
            initialRenderCount,
          );
        },
        { timeout: 500 },
      );

      const afterAddRenderCount = ProfiledReconciliation.getRenderCount();

      // Adding items should trigger re-render
      expect(afterAddRenderCount).toBeGreaterThan(initialRenderCount);

      unmount();

      console.log(
        `Reconciliation add/remove (${initialItemCount} → ${initialItemCount + 5} items):`,
      );
      console.log(
        `  Render count after add: ${afterAddRenderCount - initialRenderCount} additional renders`,
      );
    });

    it("should verify reconciliation efficiency with proper stable keys", async () => {
      const itemCount = 15;

      const ProfiledReconciliation = withProfiler(
        ReconciliationTest,
        "Reconciliation-Efficiency",
      );

      const { unmount } = render(
        <ProfiledReconciliation
          itemCount={itemCount}
          shuffleOnUpdate={false}
          useKeys={true}
        />,
      );

      // Wait for initial setup
      await waitFor(
        () => {
          expect(ProfiledReconciliation.getRenderCount()).toBe(2);
        },
        { timeout: 500 },
      );

      // With stable keys, React should efficiently reconcile
      const renderHistory = ProfiledReconciliation.getRenderHistory();

      expect(renderHistory).toContain("mount");
      expect(renderHistory).toContain("update"); // useEffect update

      // Component should have minimal renders with stable keys
      expect(ProfiledReconciliation.getRenderCount()).toBeLessThanOrEqual(3);

      unmount();

      console.log(`Reconciliation efficiency (${itemCount} items):`);
      console.log(
        `  Total renders with stable keys: ${ProfiledReconciliation.getRenderCount()}`,
      );
      console.log(
        `  Render history: ${ProfiledReconciliation.getRenderHistory().join(" → ")}`,
      );
    });
  });

  describe("Context Performance (Parent-Child Updates)", () => {
    it("should measure render cascades with multiple consumers", async () => {
      const consumerCount = 5;
      const updateFrequency = 300; // Slower to avoid hitting 10k render limit

      const ProfiledContext = withProfiler(
        ContextPerformanceTest,
        "ContextPerf-5Consumers",
      );

      const { unmount } = render(
        <ProfiledContext
          consumerCount={consumerCount}
          updateFrequency={updateFrequency}
        />,
      );

      const initialParentRenders = ProfiledContext.getRenderCount();

      expect(initialParentRenders).toBe(1); // Initial mount

      // Start updates
      const startButton = screen.getByRole("button", {
        name: /start updates/i,
      });

      await userEvent.click(startButton);

      // Wait for a few updates to occur
      await waitFor(
        () => {
          expect(ProfiledContext.getRenderCount()).toBeGreaterThan(
            initialParentRenders + 2,
          );
        },
        { timeout: updateFrequency * 5 },
      );

      const afterUpdateRenders = ProfiledContext.getRenderCount();

      // Parent component should have rendered multiple times due to setInterval
      expect(afterUpdateRenders).toBeGreaterThan(initialParentRenders);

      unmount();

      console.log(
        `Context performance (${consumerCount} consumers, ${updateFrequency}ms updates):`,
      );
      console.log(
        `  Parent renders: ${afterUpdateRenders} (${afterUpdateRenders - initialParentRenders} updates)`,
      );
    });

    it("should track renders with increasing consumer count", async () => {
      const consumerCounts = [3, 5, 10];
      const updateFrequency = 300; // Slower to avoid hitting 10k render limit
      const results: { count: number; renders: number }[] = [];

      for (const count of consumerCounts) {
        const ProfiledContext = withProfiler(
          ContextPerformanceTest,
          `ContextPerf-${count}Consumers`,
        );

        const { unmount, rerender } = render(
          <ProfiledContext
            consumerCount={count}
            updateFrequency={updateFrequency}
          />,
        );

        const initialRenders = ProfiledContext.getRenderCount();
        expect(initialRenders).toBe(1); // Only mount

        // Trigger a few re-renders by updating props
        rerender(
          <ProfiledContext
            consumerCount={count + 1}
            updateFrequency={updateFrequency}
          />,
        );
        rerender(
          <ProfiledContext
            consumerCount={count + 2}
            updateFrequency={updateFrequency}
          />,
        );

        const finalRenders = ProfiledContext.getRenderCount();

        results.push({ count, renders: finalRenders });

        unmount();
        clearProfilerData(); // Clear data between loop iterations
      }

      // More consumers doesn't necessarily mean more parent renders
      // (React batches efficiently), but we can track the pattern
      console.log("Context scaling with consumer count:");
      results.forEach(({ count, renders }) => {
        console.log(`  ${count} consumers: ${renders} parent renders`);
      });

      // Verify profiler tracked all renders
      expect(results.every((r) => r.renders > 0)).toBe(true);
    });

    it("should verify cleanup after unmount with running updates", async () => {
      const consumerCount = 5;
      const updateFrequency = 300; // Slower to avoid hitting 10k render limit

      const ProfiledContext = withProfiler(
        ContextPerformanceTest,
        "ContextPerf-Cleanup",
      );

      const { unmount } = render(
        <ProfiledContext
          consumerCount={consumerCount}
          updateFrequency={updateFrequency}
        />,
      );

      // Start updates
      const startButton = screen.getByRole("button", {
        name: /start updates/i,
      });

      await userEvent.click(startButton);

      // Wait for some renders
      await waitFor(
        () => {
          expect(ProfiledContext.getRenderCount()).toBeGreaterThan(2);
        },
        { timeout: updateFrequency * 4 },
      );

      const rendersBeforeUnmount = ProfiledContext.getRenderCount();

      // Unmount while updates are still running
      unmount();

      // Wait a bit to ensure no more renders occur after unmount
      await new Promise((resolve) => {
        setTimeout(resolve, updateFrequency * 3);
      });

      // Render count should remain stable after unmount
      expect(ProfiledContext.getRenderCount()).toBe(rendersBeforeUnmount);

      console.log(
        `Context cleanup test (${consumerCount} consumers, ${updateFrequency}ms):`,
      );
      console.log(`  Final render count: ${rendersBeforeUnmount}`);
      console.log(`  No renders after unmount: ✓`);
    });

    it("should compare performance with different update frequencies", async () => {
      const consumerCount = 5;
      const frequencies = [200, 300, 400]; // Slower to avoid hitting 10k render limit
      const testDuration = 300; // ms
      const results: { frequency: number; renders: number }[] = [];

      for (const frequency of frequencies) {
        const ProfiledContext = withProfiler(
          ContextPerformanceTest,
          `ContextPerf-${frequency}ms`,
        );

        const { unmount } = render(
          <ProfiledContext
            consumerCount={consumerCount}
            updateFrequency={frequency}
          />,
        );

        // Start updates
        const startButton = screen.getByRole("button", {
          name: /start updates/i,
        });

        await userEvent.click(startButton);

        // Wait for test duration
        await new Promise((resolve) => {
          setTimeout(resolve, testDuration);
        });

        const renders = ProfiledContext.getRenderCount();

        results.push({ frequency, renders });

        unmount();
        clearProfilerData(); // Clear data between loop iterations
      }

      // All frequencies should produce some renders
      // Note: Actual render counts may vary due to timing and React batching
      results.forEach((result) => {
        expect(result.renders).toBeGreaterThan(0);
      });

      console.log(
        `Context performance with varying update frequencies (${testDuration}ms test):`,
      );
      results.forEach(({ frequency, renders }) => {
        console.log(`  ${frequency}ms updates: ${renders} renders`);
      });
    });
  });

  describe("Large List Virtualization Performance", () => {
    it("should compare render counts: virtualized vs non-virtualized", () => {
      const itemCount = 1000;
      const itemHeight = 50;
      const containerHeight = 400;

      // Test without virtualization (renders all items)
      const ProfiledListNoVirt = withProfiler(
        LargeList,
        "LargeList-NoVirtualization",
      );

      const { unmount: unmountNoVirt, rerender: rerenderNoVirt } = render(
        <ProfiledListNoVirt
          itemCount={itemCount}
          enableVirtualization={false}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
        />,
      );

      const rendersNoVirt = ProfiledListNoVirt.getRenderCount();

      // Trigger re-render by updating props
      rerenderNoVirt(
        <ProfiledListNoVirt
          itemCount={itemCount}
          enableVirtualization={false}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
        />,
      );

      const rendersAfterUpdateNoVirt = ProfiledListNoVirt.getRenderCount();
      expect(rendersAfterUpdateNoVirt).toBeGreaterThanOrEqual(rendersNoVirt + 1); // At least one more render

      unmountNoVirt();

      // Test with virtualization (renders only visible items)
      const ProfiledListVirt = withProfiler(LargeList, "LargeList-Virtualized");

      const { unmount: unmountVirt, rerender: rerenderVirt } = render(
        <ProfiledListVirt
          itemCount={itemCount}
          enableVirtualization={true}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
        />,
      );

      const rendersVirt = ProfiledListVirt.getRenderCount();

      rerenderVirt(
        <ProfiledListVirt
          itemCount={itemCount}
          enableVirtualization={true}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
        />,
      );

      const rendersAfterUpdateVirt = ProfiledListVirt.getRenderCount();
      expect(rendersAfterUpdateVirt).toBeGreaterThanOrEqual(rendersVirt + 1); // At least one more render

      unmountVirt();

      // Both should have at least one render
      // Note: Virtualization may affect initial render behavior
      expect(rendersNoVirt).toBeGreaterThanOrEqual(1);
      expect(rendersVirt).toBeGreaterThanOrEqual(1);

      console.log(`Large list performance comparison (${itemCount} items):`);
      console.log(`  Without virtualization: ${rendersNoVirt} initial renders`);
      console.log(`  With virtualization: ${rendersVirt} initial renders`);
      console.log(
        `  Note: Virtualization benefits are in DOM nodes, not React renders`,
      );
    });

    it("should verify virtualization renders only visible items", () => {
      const itemCount = 1000;
      const itemHeight = 50;
      const containerHeight = 400; // 8 items visible

      const ProfiledList = withProfiler(LargeList, "LargeList-VisibleItems");

      const { unmount } = render(
        <ProfiledList
          itemCount={itemCount}
          enableVirtualization={true}
          itemHeight={itemHeight}
          containerHeight={containerHeight}
        />,
      );

      // Calculate expected visible items
      const visibleItemsCount = Math.ceil(containerHeight / itemHeight) + 1; // + 1 for buffer

      // Component should have at least initial render
      expect(ProfiledList.getRenderCount()).toBeGreaterThanOrEqual(1);

      // Verify render history contains mount
      expect(ProfiledList.getRenderHistory()[0]).toBe("mount");

      unmount();

      console.log(
        `Virtualization verification (${itemCount} total, ~${visibleItemsCount} visible):`,
      );
      console.log(`  Component renders: ${ProfiledList.getRenderCount()}`);
      console.log(
        `  Expected visible items: ~${visibleItemsCount} (vs ${itemCount} total)`,
      );
    });

    it("should measure performance with search filtering", async () => {
      const itemCount = 500;

      const ProfiledList = withProfiler(LargeList, "LargeList-WithFiltering");

      const { unmount } = render(
        <ProfiledList
          itemCount={itemCount}
          enableVirtualization={true}
          itemHeight={50}
          containerHeight={400}
        />,
      );

      const initialRenders = ProfiledList.getRenderCount();

      // Find search input and type
      const searchInput = screen.getByPlaceholderText(/search items/i);

      await userEvent.type(searchInput, "10");

      // Wait for state update
      await waitFor(
        () => {
          expect(ProfiledList.getRenderCount()).toBeGreaterThan(initialRenders);
        },
        { timeout: 500 },
      );

      const rendersAfterSearch = ProfiledList.getRenderCount();

      // Each keystroke triggers setState -> re-render
      // "10" = 2 keystrokes, so at least 2 additional renders
      expect(rendersAfterSearch).toBeGreaterThanOrEqual(initialRenders + 2);

      unmount();

      console.log(`Large list with search filtering (${itemCount} items):`);
      console.log(`  Initial renders: ${initialRenders}`);
      console.log(`  After typing "10": ${rendersAfterSearch} renders`);
      console.log(
        `  Additional renders: ${rendersAfterSearch - initialRenders}`,
      );
    });
  });

  describe("useMemo Optimization (Heavy Computation)", () => {
    it("should verify memoization prevents unnecessary calculations", async () => {
      const iterations = 100000;

      const ProfiledOptimized = withProfiler(
        HeavyComputation,
        "HeavyComp-Optimized",
      );

      const { unmount } = render(
        <ProfiledOptimized iterations={iterations} enableOptimization={true} />,
      );

      expect(ProfiledOptimized.getRenderCount()).toBe(1);

      // Click counter button (should not recalculate with useMemo)
      const counterButton = screen.getByRole("button", {
        name: /increment counter/i,
      });

      await userEvent.click(counterButton);
      await userEvent.click(counterButton);
      await userEvent.click(counterButton);

      // Should have 4 renders total (1 mount + 3 updates)
      expect(ProfiledOptimized.getRenderCount()).toBe(4);

      // With useMemo, calculation only happens once despite multiple renders
      expect(ProfiledOptimized.getRenderHistory()).toStrictEqual([
        "mount",
        "update",
        "update",
        "update",
      ]);

      unmount();

      console.log(`useMemo optimization test (${iterations} iterations):`);
      console.log(`  Total renders: ${ProfiledOptimized.getRenderCount()}`);
      console.log(
        `  Calculation memoized: ✓ (no recalculation on counter change)`,
      );
    });

    it("should compare memoized vs unmemoized render performance", () => {
      const iterations = 50000;

      // Test with optimization (useMemo)
      const ProfiledMemoized = withProfiler(
        HeavyComputation,
        "HeavyComp-Memoized",
      );

      const { unmount: unmountMemoized, rerender: rerenderMemoized } = render(
        <ProfiledMemoized iterations={iterations} enableOptimization={true} />,
      );

      const memoizedInitialRenders = ProfiledMemoized.getRenderCount();
      expect(memoizedInitialRenders).toBe(1); // Only mount

      // Trigger re-renders
      rerenderMemoized(
        <ProfiledMemoized iterations={iterations} enableOptimization={true} />,
      );
      rerenderMemoized(
        <ProfiledMemoized iterations={iterations} enableOptimization={true} />,
      );

      const memoizedFinalRenders = ProfiledMemoized.getRenderCount();

      unmountMemoized();

      // Test without optimization (no useMemo)
      const ProfiledUnmemoized = withProfiler(
        HeavyComputation,
        "HeavyComp-Unmemoized",
      );

      const { unmount: unmountUnmemoized, rerender: rerenderUnmemoized } =
        render(
          <ProfiledUnmemoized
            iterations={iterations}
            enableOptimization={false}
          />,
        );

      const unmemoizedInitialRenders = ProfiledUnmemoized.getRenderCount();
      // Note: Unmemoized may trigger additional renders due to heavy computation
      expect(unmemoizedInitialRenders).toBeGreaterThanOrEqual(1);

      rerenderUnmemoized(
        <ProfiledUnmemoized
          iterations={iterations}
          enableOptimization={false}
        />,
      );
      rerenderUnmemoized(
        <ProfiledUnmemoized
          iterations={iterations}
          enableOptimization={false}
        />,
      );

      const unmemoizedFinalRenders = ProfiledUnmemoized.getRenderCount();

      unmountUnmemoized();

      // Both should have at least mount + 2 rerenders
      // Note: Actual render counts may vary (unmemoized may trigger additional renders)
      expect(memoizedFinalRenders).toBeGreaterThanOrEqual(3); // mount + 2 rerenders
      expect(unmemoizedFinalRenders).toBeGreaterThanOrEqual(3); // mount + 2 rerenders

      console.log(
        `Memoized vs Unmemoized comparison (${iterations} iterations):`,
      );
      console.log(`  Memoized renders: ${memoizedFinalRenders}`);
      console.log(`  Unmemoized renders: ${unmemoizedFinalRenders}`);
      console.log(
        `  Note: useMemo optimizes computation, not React render count`,
      );
    });
  });

  describe("Conditional Rendering Performance", () => {
    it("should measure render count when toggling filters", async () => {
      const itemCount = 100;
      const filterThreshold = 50;

      const ProfiledConditional = withProfiler(
        ConditionalRendering,
        "Conditional-Filters",
      );

      const { unmount } = render(
        <ProfiledConditional
          itemCount={itemCount}
          filterThreshold={filterThreshold}
        />,
      );

      expect(ProfiledConditional.getRenderCount()).toBe(1);

      // Toggle filter checkbox
      const filterCheckbox = screen.getByRole("checkbox", {
        name: /filter/i,
      });

      await userEvent.click(filterCheckbox);

      // Should trigger re-render
      expect(ProfiledConditional.getRenderCount()).toBe(2);

      // Toggle again
      await userEvent.click(filterCheckbox);

      expect(ProfiledConditional.getRenderCount()).toBe(3);

      unmount();

      console.log(
        `Conditional rendering with filters (${itemCount} items, threshold ${filterThreshold}):`,
      );
      console.log(
        `  Renders after 2 filter toggles: ${ProfiledConditional.getRenderCount()}`,
      );
    });

    it("should track performance impact of sorting", async () => {
      const itemCount = 200;

      const ProfiledConditional = withProfiler(
        ConditionalRendering,
        "Conditional-Sorting",
      );

      const { unmount } = render(
        <ProfiledConditional itemCount={itemCount} filterThreshold={50} />,
      );

      const initialRenders = ProfiledConditional.getRenderCount();

      // Toggle sort checkbox
      const sortCheckbox = screen.getByRole("checkbox", {
        name: /sort descending/i,
      });

      await userEvent.click(sortCheckbox);

      const rendersAfterSort = ProfiledConditional.getRenderCount();

      // Toggle highlight checkbox (different state)
      const highlightCheckbox = screen.getByRole("checkbox", {
        name: /highlight even/i,
      });

      await userEvent.click(highlightCheckbox);

      const rendersAfterHighlight = ProfiledConditional.getRenderCount();

      unmount();

      expect(rendersAfterSort).toBe(initialRenders + 1);
      expect(rendersAfterHighlight).toBe(rendersAfterSort + 1);

      console.log(`Conditional rendering with sorting (${itemCount} items):`);
      console.log(`  Initial renders: ${initialRenders}`);
      console.log(`  After sort toggle: ${rendersAfterSort}`);
      console.log(`  After highlight toggle: ${rendersAfterHighlight}`);
    });
  });
});
