/**
 * vitest-react-profiler
 * React component render tracking and performance testing utilities for Vitest
 * @packageDocumentation
 */

// Core functionality
export { withProfiler } from "./withProfiler";

// Types
export type { ProfiledComponent, RenderInfo } from "./types";

// Matchers - auto-registered when imported
import "./matchers";

// Auto-setup - registers afterEach cleanup hook
import "./auto-setup";

// Version info
export const VERSION = process.env.npm_package_version ?? "0.0.0";
