import { render, waitFor } from "@testing-library/react";
import { withProfiler } from "../../src";
import { AnimationStressTest } from "./components/AnimationStressTest";

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

      const rafRenders = ProfiledRAF.getRenderCount();

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
      }
    });
  });
});
