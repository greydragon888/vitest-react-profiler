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
import { toMeetRenderCountBudget } from "./sync/render-count-budget";
import { notToHaveRenderLoops } from "./sync/render-loops";

/**
 * Register all custom Vitest matchers for profiled components
 *
 * This combines:
 * - Render count (toHaveRendered, toHaveRenderedTimes, toMeetRenderCountBudget)
 * - Phase (toHaveMountedOnce, toHaveNeverMounted, toHaveOnlyMounted, toHaveOnlyUpdated)
 * - Render loops (notToHaveRenderLoops)
 * - Async render count (toEventuallyRenderTimes, toEventuallyRenderAtLeast)
 * - Async phase (toEventuallyReachPhase)
 */
expect.extend({
  // Synchronous render count matchers
  toHaveRendered,
  toHaveRenderedTimes,
  toMeetRenderCountBudget,
  // Synchronous phase matchers
  toHaveMountedOnce,
  toHaveNeverMounted,
  toHaveOnlyMounted,
  toHaveOnlyUpdated,
  // Render loop detection
  notToHaveRenderLoops,
  // Asynchronous render count matchers
  toEventuallyRenderTimes,
  toEventuallyRenderAtLeast,
  // Asynchronous phase matchers
  toEventuallyReachPhase,
});
