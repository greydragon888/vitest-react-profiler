import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { withProfiler } from "../../src";
import { SimpleCounter } from "./components/SimpleCounter.tsx";
import { TodoList } from "./components/TodoList.tsx";
import { UserProfile } from "./components/UserProfile.tsx";
import { ConditionalComponent } from "./components/ConditionalComponent.tsx";

describe("Basic vitest-react-profiler Examples", () => {
  describe("SimpleCounter", () => {
    it("should track initial render", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");

      render(<ProfiledCounter initialCount={0} />);

      expect(ProfiledCounter).toHaveRendered();
      expect(ProfiledCounter).toHaveRenderedTimes(1);

      const lastRender = ProfiledCounter.getLastRender();

      expect(lastRender?.phase).toBe("mount");
      console.log(`Initial render took ${lastRender?.actualDuration}ms`);
    });

    it("should track re-renders on state changes", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");

      render(<ProfiledCounter initialCount={0} />);

      const incrementButton = screen.getByText("Increment");

      fireEvent.click(incrementButton);

      expect(ProfiledCounter).toHaveRenderedTimes(2);

      fireEvent.click(incrementButton);
      fireEvent.click(incrementButton);

      expect(ProfiledCounter).toHaveRenderedTimes(4);

      const renders = ProfiledCounter.getRenderHistory();

      expect(renders[0]?.phase).toBe("mount");
      expect(renders[1]?.phase).toBe("update");

      console.log(
        "Render history:",
        renders.map((r) => ({
          phase: r.phase,
          duration: r.actualDuration,
        })),
      );
    });

    it("should measure performance of multiple operations", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");

      render(<ProfiledCounter initialCount={10} />);

      const incrementButton = screen.getByText("Increment");
      const decrementButton = screen.getByText("Decrement");
      const resetButton = screen.getByText("Reset");

      fireEvent.click(incrementButton);
      fireEvent.click(decrementButton);
      fireEvent.click(resetButton);

      expect(ProfiledCounter).toHaveRenderedTimes(4);

      const avgRenderTime = ProfiledCounter.getAverageRenderTime();

      console.log(`Average render time: ${avgRenderTime}ms`);

      expect(ProfiledCounter).toHaveRenderedWithin(50);
    });

    it("should track render phases separately", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");

      render(<ProfiledCounter />);

      fireEvent.click(screen.getByText("Increment"));
      fireEvent.click(screen.getByText("Increment"));

      const mounts = ProfiledCounter.getRendersByPhase("mount");
      const updates = ProfiledCounter.getRendersByPhase("update");

      expect(mounts).toHaveLength(1);
      expect(updates).toHaveLength(2);

      console.log(`Mount phase: ${mounts[0]?.actualDuration}ms`);
      console.log(
        `Update phases: ${updates.map((u) => u.actualDuration).join(", ")}ms`,
      );
    });
  });

  describe("TodoList", () => {
    it("should track todo list rendering performance", () => {
      const ProfiledTodoList = withProfiler(TodoList, "TodoList");

      render(<ProfiledTodoList />);

      expect(ProfiledTodoList).toHaveRendered();
      expect(ProfiledTodoList).toHaveRenderedTimes(1);

      const input = screen.getByPlaceholderText("Add a todo...");
      const addButton = screen.getByText("Add");

      fireEvent.change(input, { target: { value: "First todo" } });
      fireEvent.click(addButton);

      expect(ProfiledTodoList).toHaveRenderedTimes(3);

      fireEvent.change(input, { target: { value: "Second todo" } });
      fireEvent.click(addButton);

      expect(ProfiledTodoList).toHaveRenderedTimes(5);

      const renders = ProfiledTodoList.getRenderHistory();

      console.log(
        "TodoList render times:",
        renders.map((r) => r.actualDuration),
      );
    });

    it("should measure performance of todo operations", () => {
      const ProfiledTodoList = withProfiler(TodoList, "TodoList");

      render(<ProfiledTodoList />);

      const input = screen.getByPlaceholderText("Add a todo...");
      const addButton = screen.getByText("Add");

      for (let i = 1; i <= 5; i++) {
        fireEvent.change(input, { target: { value: `Todo ${i}` } });
        fireEvent.click(addButton);
      }

      const todoItems = screen.getAllByText(/^Todo \d$/);

      fireEvent.click(todoItems[0]!);

      const removeButtons = screen.getAllByText("Remove");

      fireEvent.click(removeButtons[0]!);

      const totalRenders = ProfiledTodoList.getRenderCount();
      const avgTime = ProfiledTodoList.getAverageRenderTime();

      console.log(`Total renders: ${totalRenders}, Average time: ${avgTime}ms`);
      expect(ProfiledTodoList).toHaveRenderedWithin(100);
    });

    it("should track filtering performance", () => {
      const ProfiledTodoList = withProfiler(TodoList, "TodoList");

      render(<ProfiledTodoList />);

      const input = screen.getByPlaceholderText("Add a todo...");
      const addButton = screen.getByText("Add");

      const todos = ["Buy milk", "Write tests", "Review PR", "Fix bug"];

      todos.forEach((todo) => {
        fireEvent.change(input, { target: { value: todo } });
        fireEvent.click(addButton);
      });

      const renderCount = ProfiledTodoList.getRenderCount();

      console.log(
        `TodoList with ${todos.length} todos rendered ${renderCount} times total`,
      );

      expect(ProfiledTodoList.getAverageRenderTime()).toBeLessThan(50);
    });
  });

  describe("UserProfile", () => {
    it("should track loading and data fetching", async () => {
      const ProfiledUserProfile = withProfiler(UserProfile, "UserProfile");

      render(<ProfiledUserProfile userId="123" />);

      expect(ProfiledUserProfile).toHaveRendered();

      expect(screen.getByText("Loading user 123...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Name: User 123")).toBeInTheDocument();
      });

      expect(ProfiledUserProfile).toHaveRenderedTimes(2);

      const renders = ProfiledUserProfile.getRenderHistory();

      console.log("Loading phase:", renders[0]?.actualDuration, "ms");
      console.log("Loaded phase:", renders[1]?.actualDuration, "ms");
    });

    it("should measure edit mode performance", async () => {
      const ProfiledUserProfile = withProfiler(UserProfile, "UserProfile");
      let updateCount = 0;

      render(
        <ProfiledUserProfile userId="456" onUpdate={() => updateCount++} />,
      );

      await waitFor(() => {
        expect(screen.getByText("Name: User 456")).toBeInTheDocument();
      });

      const renderCountBeforeEdit = ProfiledUserProfile.getRenderCount();

      const editButton = screen.getByText("Edit");

      fireEvent.click(editButton);

      expect(ProfiledUserProfile.getRenderCount()).toBe(
        renderCountBeforeEdit + 1,
      );

      const nameInput = screen.getByDisplayValue("User 456");

      fireEvent.change(nameInput, { target: { value: "Updated User" } });

      const saveButton = screen.getByText("Save");

      fireEvent.click(saveButton);

      expect(updateCount).toBe(1);
      // Edit mode caused 3 additional renders after initial load
      expect(ProfiledUserProfile.getRenderCount()).toBe(
        renderCountBeforeEdit + 3,
      );

      const editRenders = ProfiledUserProfile.getRenderHistory();

      console.log(
        "Edit mode renders:",
        editRenders.map((r) => r.actualDuration),
      );
    });

    it("should track re-renders on prop changes", async () => {
      const ProfiledUserProfile = withProfiler(UserProfile, "UserProfile");

      const { rerender } = render(<ProfiledUserProfile userId="1" />);

      await waitFor(() => {
        expect(screen.getByText("Name: User 1")).toBeInTheDocument();
      });

      const initialRenders = ProfiledUserProfile.getRenderCount();

      rerender(<ProfiledUserProfile userId="2" />);

      await waitFor(() => {
        expect(screen.getByText("Name: User 2")).toBeInTheDocument();
      });

      const totalRenders = ProfiledUserProfile.getRenderCount();

      console.log(
        `Prop change caused ${totalRenders - initialRenders} additional renders`,
      );

      expect(ProfiledUserProfile.getAverageRenderTime()).toBeLessThan(100);
    });
  });

  describe("ConditionalComponent", () => {
    it("should track conditional rendering performance", () => {
      const ProfiledConditional = withProfiler(
        ConditionalComponent,
        "ConditionalComponent",
      );

      render(<ProfiledConditional showContent={true} renderCount={5} />);

      expect(ProfiledConditional).toHaveRendered();

      const toggleButton = screen.getByText("Hide Content");

      fireEvent.click(toggleButton);

      expect(ProfiledConditional).toHaveRenderedTimes(2);

      fireEvent.click(screen.getByText("Show Content"));

      expect(ProfiledConditional).toHaveRenderedTimes(3);

      const renders = ProfiledConditional.getRenderHistory();

      console.log(
        "Conditional renders:",
        renders.map((r) => ({
          phase: r.phase,
          duration: r.actualDuration,
        })),
      );
    });

    it("should measure tab switching performance", () => {
      const ProfiledConditional = withProfiler(
        ConditionalComponent,
        "ConditionalComponent",
      );

      render(<ProfiledConditional showContent={true} renderCount={10} />);

      const initialRenderCount = ProfiledConditional.getRenderCount();

      const tab2 = screen.getByText("Tab 2");
      const tab3 = screen.getByText("Tab 3");
      const tab1 = screen.getByText("Tab 1");

      fireEvent.click(tab2);
      expect(screen.getByText("Content for Tab 2")).toBeInTheDocument();

      fireEvent.click(tab3);
      expect(screen.getByText("Content for Tab 3")).toBeInTheDocument();

      fireEvent.click(tab1);
      expect(screen.getByText("Content for Tab 1")).toBeInTheDocument();

      // Tab switching caused 3 additional renders
      expect(ProfiledConditional.getRenderCount()).toBe(initialRenderCount + 3);

      const avgTime = ProfiledConditional.getAverageRenderTime();

      console.log(`Tab switching average render time: ${avgTime}ms`);

      expect(avgTime).toBeLessThan(50);
    });

    it("should validate performance with different content sizes", () => {
      const ProfiledConditional = withProfiler(
        ConditionalComponent,
        "ConditionalComponent",
      );

      const sizes = [1, 5, 10, 20];
      const renderTimes: number[] = [];

      sizes.forEach((size) => {
        const { unmount } = render(
          <ProfiledConditional showContent={true} renderCount={size} />,
        );

        const lastRender = ProfiledConditional.getLastRender();

        renderTimes.push(lastRender?.actualDuration ?? 0);

        console.log(
          `Render with ${size} items: ${lastRender?.actualDuration}ms`,
        );

        unmount();
      });

      expect(renderTimes[0]).toBeLessThan(renderTimes[3]!);
    });
  });

  describe("Performance Comparison", () => {
    it("should compare performance of different components", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
      const ProfiledTodoList = withProfiler(TodoList, "TodoList");
      const ProfiledConditional = withProfiler(
        ConditionalComponent,
        "ConditionalComponent",
      );

      render(
        <>
          <ProfiledCounter />
          <ProfiledTodoList />
          <ProfiledConditional />
        </>,
      );

      const counterTime = ProfiledCounter.getLastRender()?.actualDuration ?? 0;
      const todoTime = ProfiledTodoList.getLastRender()?.actualDuration ?? 0;
      const conditionalTime =
        ProfiledConditional.getLastRender()?.actualDuration ?? 0;

      console.log("Initial render comparison:");
      console.log(`  SimpleCounter: ${counterTime}ms`);
      console.log(`  TodoList: ${todoTime}ms`);
      console.log(`  ConditionalComponent: ${conditionalTime}ms`);

      expect(ProfiledCounter).toHaveRenderedWithin(100);
      expect(ProfiledTodoList).toHaveRenderedWithin(100);
      expect(ProfiledConditional).toHaveRenderedWithin(100);
    });

    it("should establish performance budgets", () => {
      const budgets = {
        SimpleCounter: 10,
        TodoList: 20,
        UserProfile: 50,
        ConditionalComponent: 30,
      };

      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
      const ProfiledTodoList = withProfiler(TodoList, "TodoList");
      const ProfiledConditional = withProfiler(
        ConditionalComponent,
        "ConditionalComponent",
      );

      render(<ProfiledCounter />);
      render(<ProfiledTodoList />);
      render(<ProfiledConditional />);

      expect(ProfiledCounter).toHaveRenderedWithin(budgets.SimpleCounter);
      expect(ProfiledTodoList).toHaveRenderedWithin(budgets.TodoList);
      expect(ProfiledConditional).toHaveRenderedWithin(
        budgets.ConditionalComponent,
      );

      console.log("Performance budget validation passed!");
    });
  });

  describe("Advanced Testing Patterns", () => {
    beforeEach(() => {
      // Clean up any previous profiling data
    });

    it("should detect performance regression", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");

      const baseline: number[] = [];

      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<ProfiledCounter initialCount={i} />);

        baseline.push(ProfiledCounter.getLastRender()?.actualDuration ?? 0);
        unmount();
      }

      const avgBaseline = baseline.reduce((a, b) => a + b, 0) / baseline.length;

      console.log(`Baseline average: ${avgBaseline}ms`);

      render(<ProfiledCounter initialCount={100} />);
      const currentTime = ProfiledCounter.getLastRender()?.actualDuration ?? 0;

      expect(currentTime).toBeLessThanOrEqual(avgBaseline * 2);
    });

    it("should track render counts across component lifecycle", () => {
      const ProfiledUserProfile = withProfiler(UserProfile, "UserProfile");

      const { unmount } = render(<ProfiledUserProfile userId="999" />);

      const initialRenderCount = ProfiledUserProfile.getRenderCount();

      expect(initialRenderCount).toBeGreaterThan(0);

      unmount();

      // After unmount, render count persists (cleanup happens between tests)
      expect(ProfiledUserProfile.getRenderCount()).toBe(initialRenderCount);

      const { unmount: unmount2 } = render(
        <ProfiledUserProfile userId="1000" />,
      );

      // New mount adds to the count
      expect(ProfiledUserProfile.getRenderCount()).toBeGreaterThan(
        initialRenderCount,
      );

      unmount2();
    });

    it("should measure render batch performance", () => {
      const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");

      render(<ProfiledCounter />);

      const startTime = performance.now();

      const button = screen.getByText("Increment");

      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const renders = ProfiledCounter.getRenderHistory();
      const totalRenderTime = renders.reduce(
        (sum, r) => sum + r.actualDuration,
        0,
      );

      console.log(`Batch operation time: ${totalTime}ms`);
      console.log(`Total render time: ${totalRenderTime}ms`);
      console.log(`Overhead: ${totalTime - totalRenderTime}ms`);

      expect(ProfiledCounter).toHaveRenderedTimes(12);
      expect(totalRenderTime).toBeLessThan(totalTime);
    });
  });
});
