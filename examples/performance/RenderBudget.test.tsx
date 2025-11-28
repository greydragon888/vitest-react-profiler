import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useState } from "react";
import { withProfiler } from "@/index";

/**
 * Examples demonstrating toMeetRenderCountBudget() matcher
 *
 * This matcher provides a DX convenience for checking multiple render
 * constraints in a single assertion instead of writing N separate asserts.
 *
 * @see https://github.com/greydragon888/vitest-react-profiler/blob/master/docs/reports/render-count-features-analysis.md#61-бюджеты-на-количество-рендеров
 */
describe("Render Budget Examples", () => {
  describe("DX Improvement: Before vs After", () => {
    function Dashboard() {
      const [count, setCount] = useState(0);
      const [filter, setFilter] = useState("");

      return (
        <div>
          <p>Count: {count}</p>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} />
          <button onClick={() => setCount((c) => c + 1)}>Increment</button>
        </div>
      );
    }

    it("OLD WAY: Multiple assertions (verbose)", () => {
      const ProfiledDashboard = withProfiler(Dashboard, "Dashboard");
      const { rerender } = render(<ProfiledDashboard />);

      // Trigger some updates
      rerender(<ProfiledDashboard />);
      rerender(<ProfiledDashboard />);

      // ❌ VERBOSE: Need 3 separate assertions
      expect(ProfiledDashboard).toHaveRenderedTimes(3);
      expect(ProfiledDashboard).toHaveMountedOnce();
      expect(ProfiledDashboard.getRendersByPhase("update")).toHaveLength(2);
    });

    it("NEW WAY: Single budget object (declarative)", () => {
      const ProfiledDashboard = withProfiler(Dashboard, "Dashboard");
      const { rerender } = render(<ProfiledDashboard />);

      // Trigger some updates
      rerender(<ProfiledDashboard />);
      rerender(<ProfiledDashboard />);

      // ✅ CONCISE: One assertion with budget object
      expect(ProfiledDashboard).toMeetRenderCountBudget({
        maxRenders: 3,
        maxMounts: 1,
        maxUpdates: 2,
        componentName: "Dashboard",
      });
    });
  });

  describe("Real-World Scenarios", () => {
    it("should enforce budget for complex component", () => {
      function DataTable({ rows }: { rows: number }) {
        const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
        const [page, setPage] = useState(0);

        return (
          <div>
            <p>
              Rows: {rows}, Sort: {sortOrder}, Page: {page}
            </p>
            <button onClick={() => setSortOrder("desc")}>Sort</button>
            <button onClick={() => setPage(1)}>Next</button>
          </div>
        );
      }

      const ProfiledTable = withProfiler(DataTable, "DataTable");
      render(<ProfiledTable rows={100} />);

      // Define performance budget
      expect(ProfiledTable).toMeetRenderCountBudget({
        maxRenders: 1, // Should mount only once
        maxMounts: 1,
        maxUpdates: 0,
        componentName: "DataTable",
      });
    });

    it("should track budget across user interactions", () => {
      function Counter() {
        const [count, setCount] = useState(0);

        return (
          <button onClick={() => setCount((c) => c + 1)}>{count}</button>
        );
      }

      const ProfiledCounter = withProfiler(Counter, "Counter");
      const { rerender } = render(<ProfiledCounter />);

      // Simulate 3 prop changes
      rerender(<ProfiledCounter />);
      rerender(<ProfiledCounter />);
      rerender(<ProfiledCounter />);

      // Budget allows up to 5 renders total
      expect(ProfiledCounter).toMeetRenderCountBudget({
        maxRenders: 5,
        componentName: "Counter",
      });
    });

    it("should fail when budget is exceeded", () => {
      function OverBudgetComponent({ value }: { value: number }) {
        return <div>Value: {value}</div>;
      }

      const Profiled = withProfiler(OverBudgetComponent, "OverBudget");
      const { rerender } = render(<Profiled value={0} />);

      // Create many updates by changing props
      rerender(<Profiled value={1} />);
      rerender(<Profiled value={2} />);
      rerender(<Profiled value={3} />);
      rerender(<Profiled value={4} />); // 5 total renders (1 mount + 4 updates)

      // This WILL FAIL because we exceeded the budget
      expect(() => {
        expect(Profiled).toMeetRenderCountBudget({
          maxRenders: 3, // Budget is 3, but we have 5
          componentName: "OverBudget",
        });
      }).toThrow(/Expected OverBudget to meet render count budget/);
    });
  });

  describe("Flexible Budget Constraints", () => {
    it("should check only total renders", () => {
      const Profiled = withProfiler(() => <div>Test</div>);
      render(<Profiled />);

      expect(Profiled).toMeetRenderCountBudget({
        maxRenders: 1, // Only care about total
      });
    });

    it("should check only mounts", () => {
      const Profiled = withProfiler(() => <div>Test</div>);
      const { rerender } = render(<Profiled />);
      rerender(<Profiled />);

      expect(Profiled).toMeetRenderCountBudget({
        maxMounts: 1, // Only care about mounts
        // Don't care about total renders or updates
      });
    });

    it("should check only updates", () => {
      const Profiled = withProfiler(() => <div>Test</div>);
      const { rerender } = render(<Profiled />);
      rerender(<Profiled />);
      rerender(<Profiled />);

      expect(Profiled).toMeetRenderCountBudget({
        maxUpdates: 2, // Only care about updates (2 updates happened)
      });
    });

    it("should combine multiple constraints", () => {
      const Profiled = withProfiler(() => <div>Test</div>);
      const { rerender } = render(<Profiled />);
      rerender(<Profiled />);

      // All constraints must pass
      expect(Profiled).toMeetRenderCountBudget({
        maxRenders: 3, // Total: 3 (1 mount + 2 updates)
        maxMounts: 1, // Mounts: 1
        maxUpdates: 2, // Updates: 2
        componentName: "Test",
      });
    });
  });

  describe("Error Messages", () => {
    it("should provide clear violation details", () => {
      const Profiled = withProfiler(() => <div>Test</div>, "MyComponent");
      const { rerender } = render(<Profiled />);
      rerender(<Profiled />);
      rerender(<Profiled />);
      rerender(<Profiled />);
      rerender(<Profiled />); // 5 total (1 mount + 4 updates)

      expect(() => {
        expect(Profiled).toMeetRenderCountBudget({
          maxRenders: 3,
          maxUpdates: 2,
          componentName: "MyComponent",
        });
      }).toThrow(/Total renders: 5.*budget: 3.*❌/);
    });
  });
});
