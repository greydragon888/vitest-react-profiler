import { isProfiledComponent } from "@/matchers/type-guards";
import { formatRenderHistory } from "@/utils/formatRenderHistory";

import type { MatcherResult } from "@/matchers/types";

/**
 * Assert that component rerendered exactly once since snapshot()
 *
 * @param received - The component to check (must be created with withProfiler)
 * @returns Matcher result
 * @example
 * ProfiledComponent.snapshot();
 * rerender(<ProfiledComponent newProp={value} />);
 * expect(ProfiledComponent).toHaveRerenderedOnce();
 */
export function toHaveRerenderedOnce(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const rendersSinceSnapshot = received.getRendersSinceSnapshot();
  const pass = rendersSinceSnapshot === 1;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected component not to rerender after snapshot, but it rerendered once`;
      }

      if (rendersSinceSnapshot === 0) {
        return `Expected component to rerender once after snapshot, but it did not rerender`;
      }

      // Show render history for debugging
      const history = received.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      return `Expected component to rerender once after snapshot, but it rerendered ${rendersSinceSnapshot} times\n\n${
        details
      }`;
    },
    actual: rendersSinceSnapshot,
    expected: 1,
  };
}

/**
 * Assert that component did not rerender since snapshot()
 *
 * @param received - The component to check (must be created with withProfiler)
 * @returns Matcher result
 * @example
 * ProfiledComponent.snapshot();
 * updateUnrelatedState();
 * expect(ProfiledComponent).toNotHaveRerendered();
 */
export function toNotHaveRerendered(received: unknown): MatcherResult {
  if (!isProfiledComponent(received)) {
    return {
      pass: false,
      message: () =>
        `Expected a profiled component created with withProfiler(), received ${typeof received}`,
    };
  }

  const rendersSinceSnapshot = received.getRendersSinceSnapshot();
  const pass = rendersSinceSnapshot === 0;

  return {
    pass,
    message: () => {
      if (pass) {
        return `Expected component to rerender after snapshot, but it did not`;
      }

      // Show render history for debugging
      const history = received.getRenderHistory();
      const details = formatRenderHistory(history, 10);

      const times = rendersSinceSnapshot === 1 ? "time" : "times";

      return `Expected component not to rerender after snapshot, but it rerendered ${rendersSinceSnapshot} ${times}\n\n${
        details
      }`;
    },
    actual: rendersSinceSnapshot,
    expected: 0,
  };
}
