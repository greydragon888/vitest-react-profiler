import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { withProfiler } from "../../src";
import { SimpleCounter } from "./components/SimpleCounter";
import { TodoList } from "./components/TodoList";
import { UserProfile } from "./components/UserProfile";
import { ConditionalComponent } from "./components/ConditionalComponent";

describe("Basic vitest-react-profiler Examples", () => {
  describe("SimpleCounter", () => {
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

      expect(renders[0]).toBe("mount");
      expect(renders[1]).toBe("update");

      console.log("Render history:", renders);
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
    });
  });

  describe("Advanced Testing Patterns", () => {
    beforeEach(() => {
      // Clean up any previous profiling data
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
  });
});
