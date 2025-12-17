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
  toHaveLastRenderedWithPhase,
} from "./sync/phase";
import { toHaveRendered, toHaveRenderedTimes } from "./sync/render-count";
import { toMeetRenderCountBudget } from "./sync/render-count-budget";
import { notToHaveRenderLoops } from "./sync/render-loops";
import { toHaveRerenderedOnce, toNotHaveRerendered } from "./sync/rerender";

/**
 * Register all custom Vitest matchers for profiled components
 *
 * This combines:
 * - Render count (toHaveRendered, toHaveRenderedTimes, toMeetRenderCountBudget)
 * - Phase (toHaveMountedOnce, toHaveNeverMounted, toHaveOnlyMounted, toHaveOnlyUpdated, toHaveLastRenderedWithPhase)
 * - Snapshot delta (toHaveRerenderedOnce, toNotHaveRerendered)
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
  toHaveLastRenderedWithPhase,
  // Snapshot delta matchers (v1.10.0)
  toHaveRerenderedOnce,
  toNotHaveRerendered,
  // Render loop detection
  notToHaveRenderLoops,
  // Asynchronous render count matchers
  toEventuallyRenderTimes,
  toEventuallyRenderAtLeast,
  // Asynchronous phase matchers
  toEventuallyReachPhase,
});
