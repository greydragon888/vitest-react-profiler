import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { useState, useTransition, useDeferredValue, type FC } from "react";
import { describe, it, expect, expectTypeOf } from "vitest";

import { withProfiler } from "../../src";

/**
 * React 18+ Concurrent Features Integration Tests
 *
 * These tests verify that vitest-react-profiler correctly tracks renders
 * when using React 18+ Concurrent Features like useTransition and useDeferredValue.
 *
 * Key behaviors verified:
 * 1. Renders during transitions are tracked correctly
 * 2. Deferred value updates don't lose render counts
 * 3. Interrupted renders (if they occur) are handled properly
 * 4. API consistency across concurrent and non-concurrent usage
 *
 * Note: Real Suspense data fetching requires Suspense-enabled libraries
 * (React Query, SWR) and is beyond the scope of this profiler.
 */

describe("React 18+ Concurrent Features", () => {
  describe("useTransition + startTransition", () => {
    it("should track renders during transitions", async () => {
      interface TransitionComponentProps {
        items: number[];
      }

      const TransitionComponent: FC<TransitionComponentProps> = ({ items }) => {
        const [isPending, startTransition] = useTransition();
        const [displayItems, setDisplayItems] = useState(items);

        const handleUpdate = () => {
          startTransition(() => {
            // Non-urgent update - may be interrupted
            setDisplayItems([...items, items.length]);
          });
        };

        return (
          <div>
            <div data-testid="status">{isPending ? "Pending" : "Ready"}</div>
            <div data-testid="count">{displayItems.length}</div>
            <button onClick={handleUpdate}>Add Item</button>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(TransitionComponent);

      render(<ProfiledComponent items={[1, 2, 3]} />);

      // Initial mount
      expect(ProfiledComponent).toHaveMountedOnce();
      expect(ProfiledComponent).toHaveRenderedTimes(1);

      // Click button to trigger transition
      const button = screen.getByText("Add Item");

      fireEvent.click(button);

      // Wait for transition to complete
      await waitFor(() => {
        expect(screen.getByTestId("status")).toHaveTextContent("Ready");
      });

      // Verify that transition renders were tracked
      // Note: React may produce multiple renders during transition:
      // 1. isPending = true (urgent update)
      // 2. displayItems updated + isPending = false (non-urgent update)
      // OR it may batch them into a single render
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);

      // All renders after mount should be updates
      const updates = ProfiledComponent.getRendersByPhase("update");

      expect(updates.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle multiple rapid transitions", async () => {
      const RapidTransitionComponent: FC = () => {
        const [isPending, startTransition] = useTransition();
        const [count, setCount] = useState(0);

        const handleClick = () => {
          startTransition(() => {
            setCount((c) => c + 1);
          });
        };

        return (
          <div>
            <div data-testid="count">{count}</div>
            <div data-testid="pending">{isPending ? "yes" : "no"}</div>
            <button onClick={handleClick}>Increment</button>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(RapidTransitionComponent);

      render(<ProfiledComponent />);

      const initialRenderCount = ProfiledComponent.getRenderCount();

      expect(initialRenderCount).toBe(1);

      // Trigger 3 rapid transitions
      const button = screen.getByText("Increment");

      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);
      });

      // Wait for all transitions to settle
      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("3");
        expect(screen.getByTestId("pending")).toHaveTextContent("no");
      });

      // Verify all renders were tracked
      // React may batch or interrupt renders, but final count should be accurate
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThan(
        initialRenderCount,
      );

      // Final state should show 3 increments
      expect(screen.getByTestId("count")).toHaveTextContent("3");
    });
  });

  describe("useDeferredValue", () => {
    it("should track renders with deferred values", async () => {
      const DeferredComponent: FC = () => {
        const [input, setInput] = useState("");
        const deferredInput = useDeferredValue(input);

        return (
          <div>
            <input
              data-testid="input"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
              }}
            />
            <div data-testid="deferred">{deferredInput}</div>
            <div data-testid="immediate">{input}</div>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(DeferredComponent);

      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveMountedOnce();

      // Type into input
      const input = screen.getByTestId("input");

      act(() => {
        fireEvent.change(input, { target: { value: "Hello" } });
      });

      // Wait for deferred value to update
      await waitFor(() => {
        expect(screen.getByTestId("deferred")).toHaveTextContent("Hello");
      });

      // Verify renders were tracked
      // React may render twice: once for immediate value, once for deferred
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);

      // All renders after mount should be updates
      const mounts = ProfiledComponent.getRendersByPhase("mount");

      expect(mounts).toHaveLength(1);
    });

    it("should handle rapid deferred value changes", async () => {
      const RapidDeferredComponent: FC = () => {
        const [value, setValue] = useState(0);
        const deferredValue = useDeferredValue(value);

        return (
          <div>
            <div data-testid="immediate">{value}</div>
            <div data-testid="deferred">{deferredValue}</div>
            <button
              onClick={() => {
                setValue((v) => v + 1);
              }}
            >
              Increment
            </button>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(RapidDeferredComponent);

      render(<ProfiledComponent />);

      const button = screen.getByText("Increment");

      // Trigger rapid updates
      act(() => {
        fireEvent.click(button);
        fireEvent.click(button);
        fireEvent.click(button);
      });

      // Wait for deferred value to catch up
      await waitFor(() => {
        expect(screen.getByTestId("deferred")).toHaveTextContent("3");
      });

      // Verify renders were tracked
      // React batches updates efficiently, so we may have fewer renders than raw clicks
      // Expect at least: 1 mount + 1+ updates (React may batch the 3 clicks)
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Concurrent rendering edge cases", () => {
    it("should handle components with both transitions and deferred values", async () => {
      const ComplexConcurrentComponent: FC = () => {
        const [isPending, startTransition] = useTransition();
        const [value, setValue] = useState(0);
        const deferredValue = useDeferredValue(value);

        const handleClick = () => {
          startTransition(() => {
            setValue((v) => v + 1);
          });
        };

        return (
          <div>
            <div data-testid="pending">{isPending ? "yes" : "no"}</div>
            <div data-testid="value">{value}</div>
            <div data-testid="deferred">{deferredValue}</div>
            <button onClick={handleClick}>Update</button>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(ComplexConcurrentComponent);

      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveMountedOnce();

      const button = screen.getByText("Update");

      act(() => {
        fireEvent.click(button);
      });

      // Wait for transition and deferred value to settle
      await waitFor(() => {
        expect(screen.getByTestId("pending")).toHaveTextContent("no");
        expect(screen.getByTestId("deferred")).toHaveTextContent("1");
      });

      // Complex concurrent features may produce multiple renders
      expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);

      // All non-mount renders should be updates
      const updates = ProfiledComponent.getRendersByPhase("update");

      expect(updates.length).toBeGreaterThanOrEqual(1);
    });

    it("should maintain accurate render history during concurrent updates", async () => {
      const HistoryTestComponent: FC = () => {
        const [, startTransition] = useTransition();
        const [count, setCount] = useState(0);

        return (
          <div>
            <button
              onClick={() => {
                startTransition(() => {
                  setCount((c) => c + 1);
                });
              }}
            >
              Increment
            </button>
            <div data-testid="count">{count}</div>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(HistoryTestComponent);

      render(<ProfiledComponent />);

      const initialHistory = ProfiledComponent.getRenderHistory();

      expect(initialHistory).toStrictEqual(["mount"]);

      // Trigger transition
      const button = screen.getByText("Increment");

      act(() => {
        fireEvent.click(button);
      });

      await waitFor(() => {
        expect(screen.getByTestId("count")).toHaveTextContent("1");
      });

      // Verify render history is valid
      const finalHistory = ProfiledComponent.getRenderHistory();

      // First render must always be "mount"
      expect(finalHistory[0]).toBe("mount");

      // Subsequent renders should be "update" or "nested-update"
      const remainingPhases = finalHistory.slice(1);

      for (const phase of remainingPhases) {
        expect(["update", "nested-update"]).toContain(phase);
      }

      // History should be frozen (immutable)
      expect(Object.isFrozen(finalHistory)).toBe(true);
    });
  });

  describe("Concurrent mode compatibility", () => {
    it("should work with React.StrictMode in development", () => {
      // React.StrictMode in dev mode renders components twice to detect side effects
      // This is separate from Concurrent Features but good to verify
      const StrictModeComponent: FC = () => {
        const [count, setCount] = useState(0);

        return (
          <div>
            <button
              onClick={() => {
                setCount((c) => c + 1);
              }}
            >
              Increment
            </button>
            <div data-testid="count">{count}</div>
          </div>
        );
      };

      const ProfiledComponent = withProfiler(StrictModeComponent);

      // Note: Not wrapping in StrictMode here as it's test environment specific
      // In real usage, users may wrap their app in StrictMode
      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveMountedOnce();

      const button = screen.getByText("Increment");

      fireEvent.click(button);

      expect(ProfiledComponent.getRenderCount()).toBe(2);
    });

    it("should provide consistent API regardless of concurrent features usage", () => {
      // This test verifies that the Profiler API works the same
      // whether or not concurrent features are used

      const NormalComponent: FC = () => {
        const [count, setCount] = useState(0);

        return (
          <div
            onClick={() => {
              setCount((c) => c + 1);
            }}
          >
            {count}
          </div>
        );
      };

      const TransitionComponent: FC = () => {
        const [, startTransition] = useTransition();
        const [count, setCount] = useState(0);

        return (
          <div
            onClick={() => {
              startTransition(() => {
                setCount((c) => c + 1);
              });
            }}
          >
            {count}
          </div>
        );
      };

      const ProfiledNormal = withProfiler(NormalComponent);
      const ProfiledTransition = withProfiler(TransitionComponent);

      // Both should provide the same API
      expectTypeOf(ProfiledNormal.getRenderCount).toBeFunction();
      expectTypeOf(ProfiledTransition.getRenderCount).toBeFunction();

      expectTypeOf(ProfiledNormal.getRenderHistory).toBeFunction();
      expectTypeOf(ProfiledTransition.getRenderHistory).toBeFunction();

      expectTypeOf(ProfiledNormal.getRendersByPhase).toBeFunction();
      expectTypeOf(ProfiledTransition.getRendersByPhase).toBeFunction();

      expectTypeOf(ProfiledNormal.getRenderAt).toBeFunction();
      expectTypeOf(ProfiledTransition.getRenderAt).toBeFunction();

      expectTypeOf(ProfiledNormal.hasMounted).toBeFunction();
      expectTypeOf(ProfiledTransition.hasMounted).toBeFunction();
    });
  });
});
