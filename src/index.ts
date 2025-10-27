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

// Types
export type { ProfiledComponent, RenderInfo } from "./types";

// Version info
export const VERSION = process.env.npm_package_version ?? "0.0.0";
