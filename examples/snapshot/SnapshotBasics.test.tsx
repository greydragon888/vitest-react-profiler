/**
 * Snapshot API Basics
 *
 * This file demonstrates the core functionality of the Snapshot API:
 * - snapshot() - creates a baseline for render counting
 * - getRendersSinceSnapshot() - returns renders since last snapshot
 * - toHaveRerenderedOnce() - asserts single rerender after snapshot
 * - toNotHaveRerendered() - asserts no rerenders after snapshot
 * - toHaveLastRenderedWithPhase() - asserts last render phase
 */

import { render, fireEvent, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { withProfiler } from "vitest-react-profiler";

import { Counter } from "./components/Counter";

describe("Snapshot API Basics", () => {
  // Create a profiled version of the Counter component
  const ProfiledCounter = withProfiler(Counter, "Counter");

  describe("snapshot() and getRendersSinceSnapshot()", () => {
    it("should return 0 immediately after taking a snapshot", () => {
      render(<ProfiledCounter />);

      // Before snapshot: render count includes the initial mount
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      // Take a snapshot - this creates a baseline
      ProfiledCounter.snapshot();

      // Immediately after snapshot: delta should be 0
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(0);
    });

    it("should count renders after snapshot", () => {
      const { rerender } = render(<ProfiledCounter />);

      // Take baseline snapshot
      ProfiledCounter.snapshot();

      // First rerender - delta increases
      rerender(<ProfiledCounter initialCount={5} />);
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      // Second rerender - delta increases again
      rerender(<ProfiledCounter initialCount={10} />);
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
    });

    it("should allow multiple snapshots to reset baseline", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);
      rerender(<ProfiledCounter initialCount={10} />);
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);

      // Take new snapshot - resets delta to 0
      ProfiledCounter.snapshot();
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(0);

      // New renders counted from new baseline
      rerender(<ProfiledCounter initialCount={15} />);
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);
    });
  });

  describe("State-triggered rerenders", () => {
    it("should track renders caused by state changes", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      // Click increment - triggers state change and rerender
      fireEvent.click(screen.getByText("Increment"));
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(1);

      // Multiple clicks - multiple rerenders
      fireEvent.click(screen.getByText("Increment"));
      fireEvent.click(screen.getByText("Increment"));
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(3);
    });
  });

  describe("toHaveRerenderedOnce() matcher", () => {
    it("should pass when exactly one rerender occurs after snapshot", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      // Passes: exactly one rerender since snapshot
      expect(ProfiledCounter).toHaveRerenderedOnce();
    });

    it("should work with state-triggered rerenders", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      fireEvent.click(screen.getByText("Increment"));

      // Passes: single state change = single rerender
      expect(ProfiledCounter).toHaveRerenderedOnce();
    });

    it("should fail when multiple rerenders occur", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);
      rerender(<ProfiledCounter initialCount={10} />);

      // Multiple rerenders - toHaveRerenderedOnce would fail
      expect(ProfiledCounter.getRendersSinceSnapshot()).toBe(2);
      expect(ProfiledCounter).not.toHaveRerenderedOnce();
    });
  });

  describe("toNotHaveRerendered() matcher", () => {
    it("should pass when no rerenders occur after snapshot", () => {
      render(<ProfiledCounter />);

      ProfiledCounter.snapshot();

      // No actions taken - no rerenders
      expect(ProfiledCounter).toNotHaveRerendered();
    });

    it("should fail when any rerender occurs", () => {
      const { rerender } = render(<ProfiledCounter />);

      ProfiledCounter.snapshot();
      rerender(<ProfiledCounter initialCount={5} />);

      // One rerender occurred - toNotHaveRerendered would fail
      expect(ProfiledCounter).not.toNotHaveRerendered();
    });
  });

  describe("toHaveLastRenderedWithPhase() matcher", () => {
    it("should detect mount phase", () => {
      render(<ProfiledCounter />);

      // Initial render is always "mount"
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");
    });

    it("should detect update phase after rerender", () => {
      const { rerender } = render(<ProfiledCounter />);

      // First render is mount
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");

      // Rerender changes phase to update
      rerender(<ProfiledCounter initialCount={5} />);
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });

    it("should detect update phase after state change", () => {
      render(<ProfiledCounter />);

      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");

      fireEvent.click(screen.getByText("Increment"));
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");
    });
  });

  describe("Combined workflow example", () => {
    it("should demonstrate typical snapshot-based testing workflow", () => {
      render(<ProfiledCounter />);

      // Step 1: Verify initial mount
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("mount");

      // Step 2: Create baseline for interaction testing
      ProfiledCounter.snapshot();
      expect(ProfiledCounter).toNotHaveRerendered();

      // Step 3: Perform user action
      fireEvent.click(screen.getByText("Increment"));

      // Step 4: Verify single render per action
      expect(ProfiledCounter).toHaveRerenderedOnce();
      expect(ProfiledCounter).toHaveLastRenderedWithPhase("update");

      // Step 5: Create new baseline for next interaction
      ProfiledCounter.snapshot();
      expect(ProfiledCounter).toNotHaveRerendered();

      // Step 6: Verify another action
      fireEvent.click(screen.getByText("Decrement"));
      expect(ProfiledCounter).toHaveRerenderedOnce();
    });
  });
});
