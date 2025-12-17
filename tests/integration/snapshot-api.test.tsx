import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { withProfiler } from "../../src";
import { Counter } from "../fixtures/Counter";

describe("Snapshot API Integration", () => {
  const ProfiledCounter = withProfiler(Counter, "Counter");

  describe("snapshot() and getRendersSinceSnapshot()", () => {
    it("should return 0 immediately after snapshot", () => {
      render(<ProfiledCounter />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      ProfiledCounter.snapshot();

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(0);
    });

    it("should count renders after snapshot", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      rerender(<ProfiledCounter initialCount={10} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
    });

    it("should work with state changes", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      const button = screen.getByText("Increment");

      fireEvent.click(button);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      fireEvent.click(button);
      fireEvent.click(button);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(3);
    });

    it("should allow multiple snapshots to reset baseline", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);
      rerender(<ProfiledCounter initialCount={10} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);

      // Take new snapshot - resets to 0
      ProfiledCounter.snapshot();

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(0);

      rerender(<ProfiledCounter initialCount={15} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);
    });
  });

  describe("toHaveRerenderedOnce matcher", () => {
    it("should pass for single rerender after snapshot", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveRerenderedOnce();
    });

    it("should fail for multiple rerenders", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);
      rerender(<ProfiledCounter initialCount={10} />);

      expect(() => {
        expect(ProfiledCounter).toHaveRerenderedOnce();
      }).toThrowError(/rerendered 2 times/);
    });

    it("should work with state-triggered rerenders", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRerenderedOnce();
    });
  });

  describe("toNotHaveRerendered matcher", () => {
    it("should pass when no rerenders after snapshot", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      expect(ProfiledCounter).toNotHaveRerendered();
    });

    it("should fail when rerender occurs", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      expect(() => {
        expect(ProfiledCounter).toNotHaveRerendered();
      }).toThrowError(/rerendered 1 time/);
    });
  });

  describe("toHaveRerendered matcher (v1.11.0)", () => {
    describe("without argument (at least 1)", () => {
      it("should pass when component rerendered once", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        expect(ProfiledCounter).toHaveRerendered();
      });

      it("should pass when component rerendered multiple times", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);
        rerender(<ProfiledCounter initialCount={15} />);

        expect(ProfiledCounter).toHaveRerendered();
      });

      it("should fail when no rerenders", () => {
        render(<ProfiledCounter />);

        ProfiledCounter.snapshot();

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered();
        }).toThrowError(
          /Expected component to rerender after snapshot, but it did not/,
        );
      });

      it("should work with .not modifier", () => {
        render(<ProfiledCounter />);

        ProfiledCounter.snapshot();

        expect(ProfiledCounter).not.toHaveRerendered();
      });

      it("should fail .not when component rerendered once (singular)", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        expect(() => {
          expect(ProfiledCounter).not.toHaveRerendered();
        }).toThrowError(
          /Expected component not to rerender after snapshot, but it rerendered 1 time/,
        );
      });

      it("should use singular 'time' not 'times' for exactly 1 rerender", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        let errorMessage = "";

        try {
          expect(ProfiledCounter).not.toHaveRerendered();
        } catch (error) {
          errorMessage = (error as Error).message;
        }

        // Must contain "1 time" (singular), not "1 times" (plural)
        expect(errorMessage).toContain("1 time");
        expect(errorMessage).not.toContain("1 times");
      });

      it("should fail .not when component rerendered multiple times (plural)", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);

        expect(() => {
          expect(ProfiledCounter).not.toHaveRerendered();
        }).toThrowError(
          /Expected component not to rerender after snapshot, but it rerendered 2 times/,
        );
      });
    });

    describe("with argument (exact count)", () => {
      it("should pass when exact count matches", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);
        rerender(<ProfiledCounter initialCount={15} />);

        expect(ProfiledCounter).toHaveRerendered(3);
      });

      it("should fail when count is less", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(3);
        }).toThrowError(
          /Expected component to rerender 3 times after snapshot, but it rerendered 1 time/,
        );
      });

      it("should fail when count is more", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);
        rerender(<ProfiledCounter initialCount={15} />);

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(2);
        }).toThrowError(
          /Expected component to rerender 2 times after snapshot, but it rerendered 3 times/,
        );
      });

      it("should accept 0 as valid expected count", () => {
        render(<ProfiledCounter />);

        ProfiledCounter.snapshot();

        expect(ProfiledCounter).toHaveRerendered(0);
      });

      it("should work with .not modifier", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        expect(ProfiledCounter).not.toHaveRerendered(3);
      });

      it("should fail .not when exact count matches", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);

        expect(() => {
          expect(ProfiledCounter).not.toHaveRerendered(2);
        }).toThrowError(
          /Expected component not to rerender 2 times after snapshot, but it did/,
        );
      });

      it("should use singular 'time' in .not message when expected is 1", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        expect(() => {
          expect(ProfiledCounter).not.toHaveRerendered(1);
        }).toThrowError(
          /Expected component not to rerender 1 time after snapshot, but it did/,
        );
      });

      it("should use singular 'time' in failure message for expectedTimes=1", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(1);
        }).toThrowError(
          /Expected component to rerender 1 time after snapshot, but it rerendered 2 times/,
        );
      });

      it("should use singular 'time' in failure message for actualTimes=1", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(3);
        }).toThrowError(
          /Expected component to rerender 3 times after snapshot, but it rerendered 1 time/,
        );
      });

      it("should reject negative numbers", () => {
        render(<ProfiledCounter />);

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(-1);
        }).toThrowError(
          /Invalid expected value: -1. Must be a non-negative integer/,
        );
      });

      it("should reject non-integers", () => {
        render(<ProfiledCounter />);

        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(1.5);
        }).toThrowError(
          /Invalid expected value: 1.5. Must be a non-negative integer/,
        );
      });

      it("should reject non-numbers", () => {
        render(<ProfiledCounter />);

        expect(() => {
          // @ts-expect-error - Testing invalid parameter
          expect(ProfiledCounter).toHaveRerendered("three");
        }).toThrowError(
          /Invalid expected value: three. Must be a non-negative integer/,
        );
      });

      it("should reject null", () => {
        render(<ProfiledCounter />);

        expect(() => {
          // @ts-expect-error - Testing invalid parameter
          expect(ProfiledCounter).toHaveRerendered(null);
        }).toThrowError(
          /Invalid expected value: null. Must be a non-negative integer/,
        );
      });

      it("should reject undefined when passed explicitly", () => {
        render(<ProfiledCounter />);

        // When undefined is passed explicitly, it's treated as "at least 1" mode
        // This is by design - undefined means no exact count check
        ProfiledCounter.snapshot();

        // Should work like toHaveRerendered() without arg
        expect(() => {
          expect(ProfiledCounter).toHaveRerendered(undefined);
        }).toThrowError(
          /Expected component to rerender after snapshot, but it did not/,
        );
      });

      it("should use singular 'time' in failure message when actual is 1 (explicit check)", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);

        let errorMessage = "";

        try {
          expect(ProfiledCounter).toHaveRerendered(3);
        } catch (error) {
          errorMessage = (error as Error).message;
        }

        // Must contain "1 time" for actual, not "1 times"
        expect(errorMessage).toMatch(/but it rerendered 1 time[^s]/);
      });

      it("should show render history on failure", () => {
        const { rerender } = render(<ProfiledCounter />);

        ProfiledCounter.snapshot();
        rerender(<ProfiledCounter initialCount={5} />);
        rerender(<ProfiledCounter initialCount={10} />);

        let error: unknown;

        try {
          expect(ProfiledCounter).toHaveRerendered(5);

          throw new Error("Should have thrown");
        } catch (error_) {
          error = error_;
        }

        expect(error).toMatchObject({
          message: expect.stringContaining("#"),
        });
      });
    });

    describe("with non-profiled component", () => {
      it("should fail with appropriate message", () => {
        expect(() => {
          expect("not-a-component").toHaveRerendered();
        }).toThrowError(
          /Expected a profiled component created with withProfiler/,
        );
      });
    });
  });

  describe("toHaveLastRenderedWithPhase matcher", () => {
    it("should detect mount phase", () => {
      render(<ProfiledCounter />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");
    });

    it("should detect update phase", () => {
      const { rerender } = render(<ProfiledCounter />);

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });

    it("should update after each render", () => {
      const { rerender } = render(<ProfiledCounter />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");

      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });
  });

  describe("Real-world optimization testing", () => {
    it("should track renders through state updates", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      // Click multiple times
      fireEvent.click(screen.getByText("Increment"));
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
      expect(ProfiledCounter).not.toHaveRerenderedOnce();
    });

    it("should verify single render per action", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRerenderedOnce();
    });
  });

  describe("Workflow: testing optimization patterns", () => {
    it("should test snapshot-based optimization workflow", () => {
      // Test typical workflow: snapshot -> action -> verify no unintended renders
      render(<ProfiledCounter />);

      // Record baseline
      ProfiledCounter.snapshot();

      // Verify no renders happened without action
      expect(ProfiledCounter).toNotHaveRerendered();

      // Trigger single render
      fireEvent.click(screen.getByText("Increment"));

      expect(ProfiledCounter).toHaveRerenderedOnce();
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });

    it("should support iterative optimization testing", () => {
      const { rerender } = render(<ProfiledCounter />);

      // Initial state
      expect(ProfiledCounter.getRenderCount()).toBe(1);

      // First iteration: check prop change causes rerender
      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      expect(ProfiledCounter).toHaveRerenderedOnce();

      // Second iteration: multiple prop changes
      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={10} />);
      rerender(<ProfiledCounter initialCount={15} />);
      rerender(<ProfiledCounter initialCount={20} />);

      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(3);
    });
  });
});
