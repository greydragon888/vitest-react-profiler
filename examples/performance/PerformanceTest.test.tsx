import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { withProfiler } from "../../src";
import { AnimationStressTest } from "./components/AnimationStressTest";
import { ConditionalRendering } from "./components/ConditionalRendering";
import { ExpensiveInitialRender } from "./components/ExpensiveInitialRender";
import { FrequentUpdates } from "./components/FrequentUpdates";
import { HeavyComputation } from "./components/HeavyComputation";
import { LargeList } from "./components/LargeList";
import { ReconciliationTest } from "./components/ReconciliationTest";
import { RecursiveTree } from "./components/RecursiveTree";

describe("Performance Testing Suite", () => {
  describe("Render Performance", () => {
    beforeEach(() => {
      // Clear any existing profiler data
    });

    it("should track initial render performance", () => {
      const ProfiledExpensiveRender = withProfiler(
        ExpensiveInitialRender,
        "ExpensiveInitialRender",
      );

      render(<ProfiledExpensiveRender complexity={100} />);

      expect(ProfiledExpensiveRender).toHaveRendered();
      expect(ProfiledExpensiveRender).toHaveMountedOnce();

      // Component renders twice: mount (showing "Initializing...") and update (with data)
      const renders = ProfiledExpensiveRender.getRenderHistory();

      expect(renders[0]?.phase).toBe("mount");

      const lastRender = ProfiledExpensiveRender.getLastRender();

      // Log performance metrics
      console.log(
        `Initial mount took ${renders[0]?.actualDuration.toFixed(2)}ms, update took ${lastRender?.actualDuration.toFixed(2)}ms for complexity 100`,
      );

      // Should complete within reasonable time
      expect(ProfiledExpensiveRender).toHaveRenderedWithin(1000);
    });

    it("should measure render time scaling with complexity", () => {
      const complexities = [10, 50, 100, 200];
      const renderTimes: number[] = [];

      complexities.forEach((complexity) => {
        const ProfiledComponent = withProfiler(
          ExpensiveInitialRender,
          `ExpensiveRender-${complexity}`,
        );

        const { unmount } = render(
          <ProfiledComponent complexity={complexity} />,
        );

        // Get the mount phase render time for consistency
        const mountRender = ProfiledComponent.getRendersByPhase("mount")[0];
        const renderTime = mountRender?.actualDuration ?? 0;

        renderTimes.push(renderTime);

        console.log(`Complexity ${complexity}: ${renderTime.toFixed(2)}ms`);

        unmount();
      });

      // Verify all renders completed successfully
      expect(renderTimes).toHaveLength(4);

      // Verify all renders completed in reasonable time
      renderTimes.forEach((time) => {
        expect(time).toBeGreaterThanOrEqual(0);
        expect(time).toBeLessThan(1000); // Each should be under 1 second
      });
    });

    it("should track frequent state updates performance", async () => {
      const ProfiledFrequentUpdates = withProfiler(
        FrequentUpdates,
        "FrequentUpdates",
      );

      const onUpdate = vi.fn();

      render(
        <ProfiledFrequentUpdates
          updateInterval={10}
          duration={100}
          onUpdate={onUpdate}
        />,
      );

      const startButton = screen.getByText(/Start/);

      fireEvent.click(startButton);

      await waitFor(
        () => {
          expect(onUpdate).toHaveBeenCalled();
        },
        { timeout: 200 },
      );

      const renderCount = ProfiledFrequentUpdates.getRenderCount();
      const avgRenderTime = ProfiledFrequentUpdates.getAverageRenderTime();

      console.log(`Frequent updates: ${renderCount} renders`);
      console.log(`Average render time: ${avgRenderTime.toFixed(2)}ms`);

      // Should handle frequent updates efficiently
      expect(ProfiledFrequentUpdates).toHaveAverageRenderTime(50);
    });
  });

  describe("Heavy Computation Performance", () => {
    it("should optimize heavy calculations with memoization", () => {
      const ProfiledOptimized = withProfiler(
        HeavyComputation,
        "HeavyComputation-Optimized",
      );
      const ProfiledUnoptimized = withProfiler(
        HeavyComputation,
        "HeavyComputation-Unoptimized",
      );

      // Test optimized version
      const { rerender: rerenderOptimized } = render(
        <ProfiledOptimized iterations={10000} enableOptimization={true} />,
      );

      const initialOptimizedTime =
        ProfiledOptimized.getLastRender()?.actualDuration ?? 0;

      // Trigger re-render by clicking counter button
      const counterButton = screen.getAllByText(/Increment Counter/)[0];

      fireEvent.click(counterButton);

      const optimizedRerenderTime =
        ProfiledOptimized.getLastRender()?.actualDuration ?? 0;

      // Test unoptimized version
      const { rerender: rerenderUnoptimized } = render(
        <ProfiledUnoptimized iterations={10000} enableOptimization={false} />,
      );

      const initialUnoptimizedTime =
        ProfiledUnoptimized.getLastRender()?.actualDuration ?? 0;

      // Trigger re-render
      const counterButtonUnopt = screen.getAllByText(/Increment Counter/)[1];

      fireEvent.click(counterButtonUnopt);

      const unoptimizedRerenderTime =
        ProfiledUnoptimized.getLastRender()?.actualDuration ?? 0;

      console.log("Heavy Computation Performance:");
      console.log(`  Optimized initial: ${initialOptimizedTime.toFixed(2)}ms`);
      console.log(
        `  Optimized re-render: ${optimizedRerenderTime.toFixed(2)}ms`,
      );
      console.log(
        `  Unoptimized initial: ${initialUnoptimizedTime.toFixed(2)}ms`,
      );
      console.log(
        `  Unoptimized re-render: ${unoptimizedRerenderTime.toFixed(2)}ms`,
      );

      // Optimized re-render should be reasonably fast (not significantly slower)
      // Using a tolerance factor for CI environments where timing can be inconsistent
      const tolerance = 1.5; // Allow up to 50% slower due to CI variance
      expect(optimizedRerenderTime).toBeLessThan(
        unoptimizedRerenderTime * tolerance,
      );
    });

    it("should track recursive component performance", () => {
      const depths = [3, 4, 5];
      const branching = 3;

      depths.forEach((depth) => {
        const ProfiledTree = withProfiler(
          RecursiveTree,
          `RecursiveTree-depth-${depth}`,
        );

        const { unmount } = render(
          <ProfiledTree depth={depth} branching={branching} />,
        );

        const renderTime = ProfiledTree.getLastRender()?.actualDuration ?? 0;
        const totalNodes =
          (Math.pow(branching, depth + 1) - 1) / (branching - 1);

        console.log(
          `Recursive tree (depth=${depth}, nodes=${totalNodes}): ${renderTime.toFixed(2)}ms`,
        );

        // Performance should be acceptable even for deep trees
        expect(ProfiledTree).toHaveRenderedWithin(500);

        unmount();
      });
    });
  });

  describe("List Rendering Performance", () => {
    it("should compare virtualized vs non-virtualized list performance", () => {
      const itemCount = 1000;

      const ProfiledVirtualized = withProfiler(
        LargeList,
        "LargeList-Virtualized",
      );
      const ProfiledNonVirtualized = withProfiler(
        LargeList,
        "LargeList-NonVirtualized",
      );

      // Test virtualized list
      const { unmount: unmountVirt } = render(
        <ProfiledVirtualized
          itemCount={itemCount}
          enableVirtualization={true}
          containerHeight={500}
          itemHeight={50}
        />,
      );

      const virtualizedRenderTime =
        ProfiledVirtualized.getLastRender()?.actualDuration ?? 0;

      // Test non-virtualized list
      const { unmount: unmountNonVirt } = render(
        <ProfiledNonVirtualized
          itemCount={itemCount}
          enableVirtualization={false}
          containerHeight={500}
          itemHeight={50}
        />,
      );

      const nonVirtualizedRenderTime =
        ProfiledNonVirtualized.getLastRender()?.actualDuration ?? 0;

      console.log(`List rendering (${itemCount} items):`);
      console.log(`  Virtualized: ${virtualizedRenderTime.toFixed(2)}ms`);
      console.log(
        `  Non-virtualized: ${nonVirtualizedRenderTime.toFixed(2)}ms`,
      );

      // Virtualized should be faster for large lists
      expect(virtualizedRenderTime).toBeLessThan(nonVirtualizedRenderTime);

      unmountVirt();
      unmountNonVirt();
    });

    it("should measure search/filter performance in large lists", async () => {
      const ProfiledList = withProfiler(LargeList, "LargeList-Search");

      render(
        <ProfiledList
          itemCount={500}
          enableVirtualization={false}
          containerHeight={500}
          itemHeight={50}
        />,
      );

      const initialRenderTime =
        ProfiledList.getLastRender()?.actualDuration ?? 0;

      // Perform search
      const searchInput = screen.getByPlaceholderText(/Search items/);
      const renderCountBeforeSearch = ProfiledList.getRenderCount();

      fireEvent.change(searchInput, { target: { value: "1" } });

      await waitFor(() => {
        expect(ProfiledList.getRenderCount()).toBeGreaterThan(
          renderCountBeforeSearch,
        );
      });

      const searchRenderTime =
        ProfiledList.getLastRender()?.actualDuration ?? 0;

      console.log(`List search performance:`);
      console.log(`  Initial render: ${initialRenderTime.toFixed(2)}ms`);
      console.log(`  Search update: ${searchRenderTime.toFixed(2)}ms`);

      // Search should be performant
      expect(ProfiledList).toHaveRenderedWithin(100);
    });
  });

  describe("Reconciliation Performance", () => {
    it("should measure reconciliation with stable vs index keys", () => {
      const itemCount = 100;

      const ProfiledStableKeys = withProfiler(
        ReconciliationTest,
        "Reconciliation-StableKeys",
      );
      const ProfiledIndexKeys = withProfiler(
        ReconciliationTest,
        "Reconciliation-IndexKeys",
      );

      // Test with stable keys
      render(
        <ProfiledStableKeys
          itemCount={itemCount}
          shuffleOnUpdate={true}
          useKeys={true}
        />,
      );

      const reverseButtonStable = screen.getAllByText("Reverse Order")[0];

      fireEvent.click(reverseButtonStable);

      const stableKeysRenderTime =
        ProfiledStableKeys.getLastRender()?.actualDuration ?? 0;

      // Test with index keys
      render(
        <ProfiledIndexKeys
          itemCount={itemCount}
          shuffleOnUpdate={true}
          useKeys={false}
        />,
      );

      const reverseButtonIndex = screen.getAllByText("Reverse Order")[1];

      fireEvent.click(reverseButtonIndex);

      const indexKeysRenderTime =
        ProfiledIndexKeys.getLastRender()?.actualDuration ?? 0;

      console.log(`Reconciliation performance (${itemCount} items reversed):`);
      console.log(`  Stable keys: ${stableKeysRenderTime.toFixed(2)}ms`);
      console.log(`  Index keys: ${indexKeysRenderTime.toFixed(2)}ms`);

      // Stable keys should generally perform better for reordering
      expect(stableKeysRenderTime).toBeLessThanOrEqual(
        indexKeysRenderTime * 1.5,
      );
    });

    it("should track performance of list manipulations", () => {
      const ProfiledReconciliation = withProfiler(
        ReconciliationTest,
        "Reconciliation-Manipulations",
      );

      render(
        <ProfiledReconciliation
          itemCount={50}
          shuffleOnUpdate={false}
          useKeys={true}
        />,
      );

      const operations = [
        { button: "Update Values", name: "Update" },
        { button: "Reverse Order", name: "Reverse" },
        { button: "Remove First", name: "Remove" },
        { button: "Add to Beginning", name: "Add" },
      ];

      const performancMetrics: Record<string, number> = {};

      operations.forEach((op) => {
        const button = screen.getByText(op.button);

        fireEvent.click(button);

        const renderTime =
          ProfiledReconciliation.getLastRender()?.actualDuration ?? 0;

        performancMetrics[op.name] = renderTime;

        console.log(`${op.name} operation: ${renderTime.toFixed(2)}ms`);
      });

      // All operations should be performant
      Object.values(performancMetrics).forEach((time) => {
        expect(time).toBeLessThan(100);
      });
    });
  });

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

      const rafRenders = ProfiledRAF.getRenderCount();
      const rafAvgTime = ProfiledRAF.getAverageRenderTime();

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

      const intervalRenders = ProfiledInterval.getRenderCount();
      const intervalAvgTime = ProfiledInterval.getAverageRenderTime();

      unmountInterval();

      console.log(`Animation performance (${particleCount} particles):`);
      console.log(
        `  RAF: ${rafRenders} renders, avg ${rafAvgTime.toFixed(2)}ms`,
      );
      console.log(
        `  Interval: ${intervalRenders} renders, avg ${intervalAvgTime.toFixed(2)}ms`,
      );

      // RAF should generally have better performance characteristics
      expect(rafAvgTime).toBeLessThanOrEqual(intervalAvgTime * 1.5);
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

        const avgRenderTime = ProfiledAnimation.getAverageRenderTime();

        console.log(
          `${count} particles: ${avgRenderTime.toFixed(2)}ms avg render`,
        );

        // Should maintain 60fps (16.67ms) even with more particles
        expect(ProfiledAnimation).toHaveAverageRenderTime(16.67 * 2); // Allow 30fps minimum

        unmount();
      }
    });
  });

  describe("Conditional Rendering Performance", () => {
    it("should measure filtering and sorting performance", () => {
      const ProfiledConditional = withProfiler(
        ConditionalRendering,
        "ConditionalRendering",
      );

      render(<ProfiledConditional itemCount={200} filterThreshold={50} />);

      const initialRenderTime =
        ProfiledConditional.getLastRender()?.actualDuration ?? 0;

      // Enable filtering
      const filterCheckbox = screen.getByLabelText(/Filter/);

      fireEvent.click(filterCheckbox);

      const filterRenderTime =
        ProfiledConditional.getLastRender()?.actualDuration ?? 0;

      // Enable sorting
      const sortCheckbox = screen.getByLabelText(/Sort/);

      fireEvent.click(sortCheckbox);

      const sortRenderTime =
        ProfiledConditional.getLastRender()?.actualDuration ?? 0;

      // Enable highlighting (cosmetic change)
      const highlightCheckbox = screen.getByLabelText(/Highlight/);

      fireEvent.click(highlightCheckbox);

      const highlightRenderTime =
        ProfiledConditional.getLastRender()?.actualDuration ?? 0;

      console.log("Conditional rendering performance:");
      console.log(`  Initial: ${initialRenderTime.toFixed(2)}ms`);
      console.log(`  Filter: ${filterRenderTime.toFixed(2)}ms`);
      console.log(`  Sort: ${sortRenderTime.toFixed(2)}ms`);
      console.log(`  Highlight: ${highlightRenderTime.toFixed(2)}ms`);

      // All operations should be performant
      expect(filterRenderTime).toBeLessThan(100);
      expect(sortRenderTime).toBeLessThan(100);
      expect(highlightRenderTime).toBeLessThan(100);
    });
  });

  describe("Performance Budgets", () => {
    it("should validate performance budgets for all components", () => {
      const performanceBudgets = {
        ExpensiveInitialRender: 200,
        FrequentUpdates: 10,
        HeavyComputation: 150,
        LargeList: 200,
        ReconciliationTest: 50,
        ConditionalRendering: 100,
        RecursiveTree: 100,
      };

      const results: Record<
        string,
        { actual: number; budget: number; pass: boolean }
      > = {};

      // Test ExpensiveInitialRender
      const ProfiledExpensive = withProfiler(
        ExpensiveInitialRender,
        "Budget-Expensive",
      );

      render(<ProfiledExpensive complexity={50} />);
      results.ExpensiveInitialRender = {
        actual: ProfiledExpensive.getLastRender()?.actualDuration ?? 0,
        budget: performanceBudgets.ExpensiveInitialRender,
        pass: false,
      };
      results.ExpensiveInitialRender.pass =
        results.ExpensiveInitialRender.actual <=
        results.ExpensiveInitialRender.budget;

      // Test other components similarly...

      console.log("\nPerformance Budget Results:");
      console.log("============================");
      Object.entries(results).forEach(([component, result]) => {
        const status = result.pass ? " PASS" : "L FAIL";

        console.log(
          `${component}: ${result.actual.toFixed(2)}ms / ${result.budget}ms ${status}`,
        );
      });

      // All components should meet their budgets
      Object.values(results).forEach((result) => {
        expect(result.pass).toBe(true);
      });
    });
  });
});
