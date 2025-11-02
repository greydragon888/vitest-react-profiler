/**
 * vitest-react-profiler
 * React component render tracking and performance testing utilities for Vitest
 *
 * @packageDocumentation
 */

// Core functionality
// Matchers - auto-registered when imported
import "./matchers";

// Auto-setup - registers afterEach cleanup hook
import "./auto-setup";

export { withProfiler } from "./withProfiler";

// Hook profiling
export { profileHook, createHookProfiler } from "./hooks";

// Utilities
export {
  formatRenderHistory,
  formatRenderSummary,
} from "./utils/formatRenderHistory";

// Async utilities
export {
  waitForRenders,
  waitForMinimumRenders,
  waitForPhase,
} from "./utils/async";

export type { WaitOptions } from "./utils/async";

// Rendering utilities
export { renderProfiled } from "./utils/renderProfiled";

export type {
  RenderProfiledOptions,
  RenderProfiledResult,
} from "./utils/renderProfiled";

// Types
export type { ProfiledComponent, RenderInfo } from "./types";

// Version info
export const VERSION = process.env.npm_package_version ?? "0.0.0";
