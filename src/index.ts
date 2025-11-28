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

export { withProfiler } from "./profiler/components/withProfiler";

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

// Rendering utilities
export { renderProfiled } from "./utils/renderProfiled";

export type {
  RenderProfiledOptions,
  RenderProfiledResult,
} from "./utils/renderProfiled";

// Testing utilities
export { clearProfilerData, clearRegistry } from "./registry";

// Types
export type {
  PhaseType,
  ProfiledComponent,
  ProfiledComponentType,
  WaitOptions,
  RenderEventInfo,
} from "./types";

// Version info
/* v8 ignore next 3 -- @preserve */
export const VERSION = process.env.npm_package_version ?? "0.0.0";
