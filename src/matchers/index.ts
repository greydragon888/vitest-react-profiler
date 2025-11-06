import { expect } from "vitest";

import { toEventuallyReachPhase } from "@/matchers/async/phase";

import {
  toEventuallyRenderAtLeast,
  toEventuallyRenderTimes,
} from "./async/render-count";
import {
  toHaveMountedOnce,
  toHaveNeverMounted,
  toHaveOnlyMounted,
  toHaveOnlyUpdated,
} from "./sync/phase";
import { toHaveRendered, toHaveRenderedTimes } from "./sync/render-count";

/**
 * Register all custom Vitest matchers for profiled components
 *
 * This combines:
 * -  (toHaveRendered, toHaveRenderedTimes)
 * -  (toHaveMountedOnce, toHaveNeverMounted, toHaveOnlyMounted, toHaveOnlyUpdated)
 * -  (toEventuallyRenderTimes, toEventuallyRenderAtLeast)
 * -  (toEventuallyReachPhase)
 */
expect.extend({
  // Synchronous render count matchers
  toHaveRendered,
  toHaveRenderedTimes,
  // Synchronous phase matchers
  toHaveMountedOnce,
  toHaveNeverMounted,
  toHaveOnlyMounted,
  toHaveOnlyUpdated,
  // Asynchronous render count matchers
  toEventuallyRenderTimes,
  toEventuallyRenderAtLeast,
  // Asynchronous phase matchers
  toEventuallyReachPhase,
});
