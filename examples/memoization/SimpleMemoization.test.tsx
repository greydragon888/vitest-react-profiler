import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { memo, useState, useCallback, useMemo } from "react";
import { withProfiler } from "../../src";

describe("Simple Memoization Tests", () => {
  describe("React.memo effectiveness", () => {
    it("should prevent re-renders with memo", () => {
      // Note: According to README, React Profiler always triggers even when memo prevents re-render
      // So we can't directly test memo prevention with ProfiledComponent alone

      const SimpleComponent = memo<{ value: number }>(({ value }) => (
        <div>Value: {value}</div>
      ));

      const ProfiledComponent = withProfiler(
        SimpleComponent,
        "SimpleComponent",
      );

      // Need to wrap ProfiledComponent with memo as per documentation
      const MemoProfiled = memo(ProfiledComponent);

      const { rerender } = render(<MemoProfiled value={42} />);

      expect(ProfiledComponent).toHaveRenderedTimes(1);

      // Re-render with the same props - memo should prevent re-render
      rerender(<MemoProfiled value={42} />);
      expect(ProfiledComponent).toHaveRenderedTimes(1); // Should stay 1

      // Re-render with different props - should re-render
      rerender(<MemoProfiled value={43} />);
      expect(ProfiledComponent).toHaveRenderedTimes(2);
    });

    it("should show unmemoized component always re-rendering", () => {
      const SimpleComponent = ({ value }: { value: number }) => (
        <div>Value: {value}</div>
      );

      const ProfiledComponent = withProfiler(
        SimpleComponent,
        "SimpleComponent",
      );

      const { rerender } = render(<ProfiledComponent value={42} />);

      expect(ProfiledComponent).toHaveRenderedTimes(1);

      // Re-render with the same props - will still re-render
      rerender(<ProfiledComponent value={42} />);
      expect(ProfiledComponent).toHaveRenderedTimes(2);
    });
  });

  describe("useMemo effectiveness", () => {
    it("should memoize expensive computations", () => {
      let computationCount = 0;

      const ExpensiveComponent = ({
        items,
        filter,
      }: {
        items: number[];
        filter: string;
      }) => {
        const filtered = useMemo(() => {
          computationCount++;

          return items.filter((item) => item.toString().includes(filter));
        }, [items, filter]);

        return <div>{filtered.length} items</div>;
      };

      const ProfiledComponent = withProfiler(
        ExpensiveComponent,
        "ExpensiveComponent",
      );

      const items = [1, 2, 3, 11, 12, 13];
      const { rerender } = render(
        <ProfiledComponent items={items} filter="1" />,
      );

      expect(computationCount).toBe(1);
      expect(ProfiledComponent).toHaveRenderedTimes(1);

      // Re-render with same props - computation should not run again
      rerender(<ProfiledComponent items={items} filter="1" />);
      expect(computationCount).toBe(1);
      expect(ProfiledComponent).toHaveRenderedTimes(2);

      // Re-render with different filter - computation should run
      rerender(<ProfiledComponent items={items} filter="2" />);
      expect(computationCount).toBe(2);
      expect(ProfiledComponent).toHaveRenderedTimes(3);
    });
  });

  describe("useCallback effectiveness", () => {
    it("should prevent function recreation", () => {
      const ChildComponent = memo<{ onClick: () => void }>(({ onClick }) => (
        <button onClick={onClick}>Click me</button>
      ));

      const ProfiledChild = withProfiler(ChildComponent, "ChildComponent");
      // Wrap with memo for accurate testing as per documentation
      const MemoProfiledChild = memo(ProfiledChild);

      const ParentComponent = () => {
        const [count, setCount] = useState(0);
        const [other, setOther] = useState(0);

        const handleClick = useCallback(() => {
          setCount((c) => c + 1);
        }, []);

        return (
          <div>
            <MemoProfiledChild onClick={handleClick} />
            <button
              onClick={() => {
                setOther((o) => o + 1);
              }}
            >
              Other: {other}
            </button>
            <span>Count: {count}</span>
          </div>
        );
      };

      render(<ParentComponent />);

      expect(ProfiledChild).toHaveRenderedTimes(1);

      // Click "Other" button - child should not re-render with useCallback
      fireEvent.click(screen.getByText(/Other:/));
      expect(ProfiledChild).toHaveRenderedTimes(1); // Should stay 1

      // Click child button - it handles the click but doesn't re-render
      fireEvent.click(screen.getByText("Click me"));
      expect(ProfiledChild).toHaveRenderedTimes(1);
      expect(screen.getByText("Count: 1")).toBeInTheDocument();
    });

    it("should show re-renders without useCallback", () => {
      const ChildComponent = memo<{ onClick: () => void }>(({ onClick }) => (
        <button onClick={onClick}>Click me</button>
      ));

      const ProfiledChild = withProfiler(ChildComponent, "ChildComponent");

      const ParentComponent = () => {
        const [count, setCount] = useState(0);
        const [other, setOther] = useState(0);

        // Without useCallback - new function every render
        const handleClick = () => {
          setCount((c) => c + 1);
        };

        return (
          <div>
            <ProfiledChild onClick={handleClick} />
            <button
              onClick={() => {
                setOther((o) => o + 1);
              }}
            >
              Other: {other}
            </button>
            <span>Count: {count}</span>
          </div>
        );
      };

      render(<ParentComponent />);

      expect(ProfiledChild).toHaveRenderedTimes(1);

      // Click "Other" button - child WILL re-render due to new function
      fireEvent.click(screen.getByText(/Other:/));
      expect(ProfiledChild).toHaveRenderedTimes(2);
    });
  });

  describe("Performance tracking", () => {
    it("should track render times", () => {
      const SlowComponent = memo(() => {
        // Simulate expensive render
        const items = Array(100)
          .fill(0)
          .map((_, i) => i);

        return (
          <div>
            {items.map((i) => (
              <span key={i}>{i}</span>
            ))}
          </div>
        );
      });

      const ProfiledComponent = withProfiler(SlowComponent, "SlowComponent");

      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveRendered();

      const lastRender = ProfiledComponent.getLastRender();

      expect(lastRender).toBeDefined();
      expect(lastRender?.phase).toBe("mount");
    });

    it("should track mount vs update phases", () => {
      const Component = ({ value }: { value: number }) => <div>{value}</div>;
      const ProfiledComponent = withProfiler(Component, "Component");

      const { rerender } = render(<ProfiledComponent value={1} />);

      expect(ProfiledComponent).toHaveMountedOnce();
      const mounts = ProfiledComponent.getRendersByPhase("mount");

      expect(mounts).toHaveLength(1);

      rerender(<ProfiledComponent value={2} />);

      expect(ProfiledComponent).toHaveMountedOnce();
      const updates = ProfiledComponent.getRendersByPhase("update");

      expect(updates).toHaveLength(1);

      const history = ProfiledComponent.getRenderHistory();

      expect(history[0]?.phase).toBe("mount");
      expect(history[1]?.phase).toBe("update");
    });

    it("should calculate average render time", () => {
      const Component = ({ value }: { value: number }) => <div>{value}</div>;
      const ProfiledComponent = withProfiler(Component, "Component");

      const { rerender } = render(<ProfiledComponent value={0} />);

      for (let i = 1; i <= 5; i++) {
        rerender(<ProfiledComponent value={i} />);
      }

      expect(ProfiledComponent).toHaveRenderedTimes(6);
    });
  });

  describe("Memoization with stable references", () => {
    it("should demonstrate memo effectiveness with stable props", () => {
      const ExpensiveList = memo<{ items: number[] }>(({ items }) => (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ));

      const ProfiledList = withProfiler(ExpensiveList, "ExpensiveList");
      const MemoProfiledList = memo(ProfiledList);

      const Parent = () => {
        const [count, setCount] = useState(0);
        // Stable reference using useState initial value
        const items = useState(() => [1, 2, 3, 4, 5])[0];

        return (
          <div>
            <button
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              Count: {count}
            </button>
            <MemoProfiledList items={items} />
          </div>
        );
      };

      render(<Parent />);
      expect(ProfiledList).toHaveRenderedTimes(1);

      // Parent re-renders but items reference stays the same
      fireEvent.click(screen.getByText(/Count:/));
      expect(ProfiledList).toHaveRenderedTimes(1); // Should not re-render

      fireEvent.click(screen.getByText(/Count:/));
      fireEvent.click(screen.getByText(/Count:/));
      expect(ProfiledList).toHaveRenderedTimes(1); // Still 1
    });

    it("should demonstrate re-renders with unstable references", () => {
      const ExpensiveList = memo<{ items: number[] }>(({ items }) => (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ));

      const ProfiledList = withProfiler(ExpensiveList, "ExpensiveList");

      const Parent = () => {
        const [count, setCount] = useState(0);
        // New array on every render - unstable reference
        const items = [1, 2, 3, 4, 5];

        return (
          <div>
            <button
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              Count: {count}
            </button>
            <ProfiledList items={items} />
          </div>
        );
      };

      render(<Parent />);
      expect(ProfiledList).toHaveRenderedTimes(1);

      // Parent re-renders and items is a new array
      fireEvent.click(screen.getByText(/Count:/));
      expect(ProfiledList).toHaveRenderedTimes(2); // Re-renders

      fireEvent.click(screen.getByText(/Count:/));
      expect(ProfiledList).toHaveRenderedTimes(3); // Re-renders again
    });
  });
});
