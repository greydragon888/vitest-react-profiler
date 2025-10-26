# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-10-27

### Added

- **Hook profiling** - Profile React hooks to detect extra renders caused by improper state management
  - `profileHook()` - Main hook profiling function that wraps hooks for render tracking
  - `createHookProfiler()` - Simplified API with built-in assertion helpers
  - Type overloads for hooks with and without parameters
  - Full integration with existing matchers (toHaveRenderedTimes, etc.)
  - Automatic cleanup via existing registry system
  - Comprehensive documentation with real-world anti-pattern examples
  - 22 tests covering basic usage, edge cases, integration, and real-world scenarios

### Documentation

- Added "Hook Profiling" section to README.md with:
  - Basic usage examples
  - Common anti-pattern detection (useEffect state sync, data fetching)
  - Real-world fixes and best practices
  - Batch testing patterns
  - React.StrictMode behavior notes

## [1.1.0] - 2025-10-26

This version removes the need for manual cleanup code in tests by introducing an internal registry system that automatically clears component data between tests.

### Added

- Component registry system (`src/registry.ts`) - Internal tracking of all profiled components
- Auto-setup module (`src/auto-setup.ts`) - Automatically registers `afterEach` cleanup hook on import
- Automatic cleanup between tests - No manual intervention needed

### Removed

- `clearCounters()` method removed from `ProfiledComponent` public API. Cleanup now happens automatically via internal registry

### Changed

- All internal tests and examples updated to remove manual cleanup code
- Eliminates 3-5 lines of boilerplate per test file
- `sideEffects` in package.json now includes `auto-setup.ts` for proper tree-shaking

## [1.0.0] - 2025-10-26

### Added

- Initial release of vitest-react-profiler
- Core `withProfiler()` function to wrap React components with profiling capabilities
- **True automatic cleanup system** - Zero boilerplate! Components auto-clear between tests
  - Internal component registry (`src/registry.ts`) for tracking profiled components
  - Auto-setup module (`src/auto-setup.ts`) that registers `afterEach` cleanup hook on import
  - No manual `afterEach()` or `clearCounters()` calls needed in tests
- Custom Vitest matchers for performance testing:
  - `toHaveRendered()` - Assert component has rendered
  - `toHaveRenderedTimes(count)` - Assert exact number of renders
  - `toHaveRenderedWithin(ms)` - Assert render duration within budget
  - `toHaveMountedOnce()` - Assert component mounted exactly once
  - `toHaveNeverMounted()` - Assert component never mounted
  - `toHaveOnlyUpdated()` - Assert component only updated (no mounts)
  - `toHaveAverageRenderTime(ms)` - Assert average render time
- Profiled component API with methods:
  - `getRenderCount()` - Get total number of renders
  - `getRenderHistory()` - Get complete render history
  - `getLastRender()` - Get last render information
  - `getRenderAt(index)` - Get render at specific index
  - `getRendersByPhase(phase)` - Filter renders by phase
  - `getAverageRenderTime()` - Calculate average render time
  - `hasMounted()` - Check if component has mounted
  - `OriginalComponent` - Reference to original unwrapped component
- Full TypeScript support with complete type definitions
- Comprehensive documentation and examples
- Examples directory with:
  - Basic usage examples
  - Memoization testing examples
  - Performance testing examples

### Features

- **Zero boilerplate** - No manual cleanup code needed (no `afterEach` hooks!)
- Zero configuration setup - works out of the box with Vitest
- Precise render tracking using React Profiler API
- Phase detection (mount, update, nested update)
- Statistical analysis (average, min, max render times)
- True automatic test isolation with component registry system
- Tiny bundle size (< 10KB minified)
- Support for React 16.8+ (Hooks)
- Support for Vitest 1.0+
- Compatible with @testing-library/react

### Infrastructure

- Comprehensive test coverage (93 tests passing)
- ESLint configuration with strict TypeScript rules
- Prettier for code formatting
- Husky + lint-staged for pre-commit hooks
- Commitlint for conventional commits
- tsup for optimized build output (CJS + ESM)
- GitHub Actions CI/CD pipeline ready

[1.1.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.1.0
[1.0.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.0.0
