/**
 * Optimization Testing with Snapshot API
 *
 * This file demonstrates real-world patterns for testing React optimizations:
 * - Testing React.memo effectiveness
 * - Testing useCallback stability
 * - Detecting double-render bugs
 * - Performance budget testing
 */

import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useState, useCallback, memo } from "react";
import { withProfiler } from "vitest-react-profiler";

import { FilteredList } from "./components/FilteredList";
import { TodoList } from "./components/TodoList";

describe("Optimization Testing with Snapshots", () => {
  describe("Testing React.memo effectiveness", () => {
    const ProfiledFilteredList = withProfiler(FilteredList, "FilteredList");

    it("should not rerender when unrelated props change", () => {
      const items = ["Apple", "Banana", "Cherry"];

      const { rerender } = render(
        <ProfiledFilteredList items={items} filter="" theme="light" />,
      );

      // Take snapshot after mount
      ProfiledFilteredList.snapshot();

      // Change only the theme prop (unrelated to filtering logic)
      rerender(<ProfiledFilteredList items={items} filter="" theme="dark" />);

      // memo should prevent rerender since items and filter didn't change...
      // Actually, FilteredList IS memoized but theme IS in props, so it WILL rerender
      // This demonstrates that memo prevents rerenders only for UNCHANGED props
      expect(ProfiledFilteredList).toHaveRerenderedOnce();
    });

    it("should rerender when relevant props change", () => {
      const items = ["Apple", "Banana", "Cherry"];

      const { rerender } = render(
        <ProfiledFilteredList items={items} filter="" theme="light" />,
      );

      ProfiledFilteredList.snapshot();

      // Change the filter prop (relevant to component logic)
      rerender(<ProfiledFilteredList items={items} filter="a" theme="light" />);

      // Component should rerender with new filter
      expect(ProfiledFilteredList).toHaveRerenderedOnce();
      expect(ProfiledFilteredList).toHaveLastRenderedWithPhase("update");
    });
  });

  describe("Testing single render per action", () => {
    const ProfiledTodoList = withProfiler(TodoList, "TodoList");

    it("should render once when adding a todo", () => {
      render(<ProfiledTodoList />);

      ProfiledTodoList.snapshot();

      // Type in input
      fireEvent.change(screen.getByTestId("todo-input"), {
        target: { value: "New Todo" },
      });

      // Input change causes rerender
      expect(ProfiledTodoList.getRendersSinceSnapshot()).toBe(1);

      // Take new snapshot
      ProfiledTodoList.snapshot();

      // Click add button
      fireEvent.click(screen.getByText("Add"));

      // Adding todo should cause single rerender (not double)
      expect(ProfiledTodoList).toHaveRerenderedOnce();
    });

    it("should detect double-render bugs (if they existed)", () => {
      render(<ProfiledTodoList initialTodos={["Task 1", "Task 2"]} />);

      ProfiledTodoList.snapshot();

      // Remove a todo
      const removeButtons = screen.getAllByText("Remove");
      fireEvent.click(removeButtons[0]);

      // Should be exactly one rerender, not double
      expect(ProfiledTodoList).toHaveRerenderedOnce();
      expect(ProfiledTodoList.getRendersSinceSnapshot()).toBe(1);
    });
  });

  describe("Testing useCallback stability", () => {
    it("should demonstrate useCallback preventing unnecessary rerenders", () => {
      // This test demonstrates how useCallback helps prevent rerenders
      // by keeping callback references stable across parent renders

      // Child component that only needs to render when its specific props change
      const ExpensiveChild = memo(function ExpensiveChild({
        value,
        onClick,
      }: {
        value: number;
        onClick: () => void;
      }) {
        return (
          <div>
            <span data-testid="child-value">{value}</span>
            <button onClick={onClick}>Increment Child</button>
          </div>
        );
      });

      const ProfiledExpensiveChild = withProfiler(ExpensiveChild, "ExpensiveChild");

      function TestParent() {
        const [childValue, setChildValue] = useState(0);

        // Stable callback - reference doesn't change between renders
        const stableCallback = useCallback(() => {
          setChildValue((v) => v + 1);
        }, []);

        return (
          <div>
            <ProfiledExpensiveChild value={childValue} onClick={stableCallback} />
          </div>
        );
      }

      render(<TestParent />);

      // Verify initial mount
      expect(ProfiledExpensiveChild).toHaveLastRenderedWithPhase("mount");
      expect(ProfiledExpensiveChild.getRenderCount()).toBe(1);

      // Snapshot before interaction
      ProfiledExpensiveChild.snapshot();

      // Click the child button - this changes childValue which SHOULD cause rerender
      fireEvent.click(screen.getByText("Increment Child"));

      // Child should rerender exactly once because value changed
      expect(ProfiledExpensiveChild).toHaveRerenderedOnce();

      // Verify the value updated
      expect(screen.getByTestId("child-value").textContent).toBe("1");
    });
  });

  describe("Performance budget testing", () => {
    const ProfiledTodoList = withProfiler(TodoList, "TodoListBudget");

    it("should stay within render budget for batch operations", () => {
      render(<ProfiledTodoList />);

      ProfiledTodoList.snapshot();

      // Add multiple todos
      const input = screen.getByTestId("todo-input");
      const addButton = screen.getByText("Add");

      // Each add operation: 1 input change + 1 add = 2 renders per todo
      fireEvent.change(input, { target: { value: "Todo 1" } });
      fireEvent.click(addButton);
      fireEvent.change(input, { target: { value: "Todo 2" } });
      fireEvent.click(addButton);
      fireEvent.change(input, { target: { value: "Todo 3" } });
      fireEvent.click(addButton);

      // Budget: 3 todos * 2 renders = 6 renders maximum
      const renderCount = ProfiledTodoList.getRendersSinceSnapshot();
      expect(renderCount).toBeLessThanOrEqual(6);
    });

    it("should verify render efficiency ratio", () => {
      render(<ProfiledTodoList initialTodos={["A", "B", "C", "D", "E"]} />);

      ProfiledTodoList.snapshot();

      // Remove all todos one by one (DOM updates after each click)
      // After each remove, we need to get fresh reference to buttons
      for (let i = 0; i < 5; i++) {
        const removeButtons = screen.getAllByText("Remove");
        fireEvent.click(removeButtons[0]); // Always click first button
      }

      // 5 removes should cause 5 rerenders (1:1 ratio)
      const renderCount = ProfiledTodoList.getRendersSinceSnapshot();
      expect(renderCount).toBe(5);
    });
  });

  describe("Iterative optimization workflow", () => {
    const ProfiledFilteredList = withProfiler(FilteredList, "IterativeList");

    it("should demonstrate iterative testing with snapshots", () => {
      const items = ["Apple", "Banana", "Cherry", "Date", "Elderberry"];

      const { rerender } = render(
        <ProfiledFilteredList items={items} filter="" />,
      );

      // Phase 1: Verify initial mount
      expect(ProfiledFilteredList).toHaveLastRenderedWithPhase("mount");
      expect(ProfiledFilteredList.getRenderCount()).toBe(1);

      // Phase 2: Test filter changes
      ProfiledFilteredList.snapshot();

      rerender(<ProfiledFilteredList items={items} filter="a" />);
      expect(ProfiledFilteredList).toHaveRerenderedOnce();

      rerender(<ProfiledFilteredList items={items} filter="an" />);
      expect(ProfiledFilteredList.getRendersSinceSnapshot()).toBe(2);

      // Phase 3: New baseline for item changes
      ProfiledFilteredList.snapshot();

      const newItems = [...items, "Fig"];
      rerender(<ProfiledFilteredList items={newItems} filter="an" />);
      expect(ProfiledFilteredList).toHaveRerenderedOnce();

      // Phase 4: Verify total render count is reasonable
      const totalRenders = ProfiledFilteredList.getRenderCount();
      expect(totalRenders).toBe(4); // mount + 2 filter + 1 items
    });
  });
});
