# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2025-11-01

### Performance

- **Metrics caching optimization** - Significantly improved performance of `getAverageRenderTime()` method
  - **Impact**: Up to 35x faster for repeated calls (17-35x benchmarked improvement)
  - O(1) performance for cached calls vs O(n) recalculation
  - 35x speedup on small histories (10 renders), 17-20x on large (100-200 renders)
  - Benchmarked with 100 consecutive calls: 0.4ms (cached) vs 15ms (uncached) for 10 renders
  - Fixed stack overflow bug with `Math.min(...array)` on 200+ render histories
  - Introduced `metricsCache` in `ProfilerData` interface storing average, min, max, total
  - Cache invalidation on new renders via `historyVersion` tracking
  - All metrics (average, min, max, total) computed in single-pass for-loop (no array operations)
  - Cache automatically cleared between tests
  - 100% backward compatible - no breaking changes to public API

### Code Quality

- **Enhanced TypeScript type safety**
  - Replaced `ComponentType<any>` with `ComponentType<Record<string, unknown>>`
  - Created type-safe helper functions for WeakMap access:
    - `getProfilerData()` - get component profiler data
    - `setProfilerData()` - set component profiler data
    - `hasProfilerData()` - check if component has profiler data
  - Fixed TypeScript error with readonly `displayName` property
  - Removed one eslint-disable comment from top-level code
  - `any` usage now limited to 3 internal helper functions (documented)
  - Better IDE autocompletion and type inference
  - Reduced risk of type-related bugs

### Added

- 13 comprehensive tests for metrics caching (`tests/unit/metrics-cache.test.tsx`, `tests/property/metrics-cache.properties.tsx`)
  - **8 unit tests**:
    - Cache behavior on unchanged history
    - Cache invalidation on new renders
    - Efficient caching for large histories (1000 renders)
    - Multiple consecutive calls return cached values
    - Consistent values across repeated calls
    - Edge case: zero renders
    - Edge case: single render
    - Component isolation (independent caches)
  - **5 property-based tests** (using fast-check):
    - Cache after N renders (1-100 randomized)
    - Cache invalidation after additional renders
    - M consecutive calls caching (2-20 randomized)
    - Performance improvement on large histories (10-200 randomized)
    - Interleaved renders and reads (randomized patterns)

### Infrastructure

- All 261 tests passing (+13 new for metrics caching)
- Code coverage: 98.35% (+0.04%)

## [1.3.1] - 2025-11-01

### Fixed

- **Critical memory leak in ComponentRegistry** - Components were never removed from registry, causing memory accumulation in large test suites
  - **Impact**: 99% memory reduction (from ~14 MB to ~0.3 MB overhead in 10,000 test scenarios)
  - Introduced `WeakSet` for automatic garbage collection of unused components
  - Added `activeComponents` Set for managing active component lifecycle
  - Added `unregister()` method for explicit component cleanup
  - `clearAll()` now properly clears render data while preserving reusable components from `describe()` blocks
  - 100% backward compatible - no breaking changes to public API

### Added

- 7 comprehensive unit tests for `ComponentRegistry` (`tests/unit/registry.test.tsx`)
  - Verifies render data cleanup between tests
  - Confirms no memory accumulation across 1,000+ test iterations
  - Validates component reusability from `describe()` blocks
  - Tests render history memory deallocation

### Infrastructure

- **CI/CD reliability improvements**
  - Fixed property-based test timeouts by limiting worker pool to 2 threads
  - Removed duplicate "Check formatting" task from GitHub Actions workflow
  - Improved test stability in CI environment
- All 252 tests passing with enhanced memory efficiency

## [1.3.0] - 2025-10-28

### Added

- **Async testing support** - Test components with asynchronous state updates
  - `waitForRenders(component, count)` - Wait for exact render count
  - `waitForMinimumRenders(component, minCount)` - Wait for at least N renders
  - `waitForPhase(component, phase)` - Wait for specific render phase
  - `toEventuallyRenderTimes(count)` - Async matcher for exact render count
  - `toEventuallyRenderAtLeast(minCount)` - Async matcher for minimum renders
  - `toEventuallyReachPhase(phase)` - Async matcher for render phase
  - Configurable timeout and polling intervals for all async utilities

- **Simplified API** - More concise testing experience
  - `renderProfiled(Component, props, options)` - Combines `withProfiler()` + `render()` in one call
  - Enhanced `rerender()` function with automatic prop merging
  - Support for React Testing Library options (wrapper, container, etc.)

- **Enhanced error messages** - Detailed, actionable failure information
  - Visual render history table showing phase, timing, and duration
  - Slow render detection with aggregate statistics
  - Unexpected mount detection with detailed breakdown
  - Contextual tips for debugging render issues

- **Performance benchmarking** - Track library performance over time
  - Benchmarks for `getRenderHistory()` operations
  - Memory optimization benchmarks
  - Stable benchmark configuration for consistent CI results

### Changed

- Improved documentation with:
  - Complete async testing guide with real-world examples
  - `renderProfiled()` usage patterns and best practices
  - Enhanced error message examples showing before/after comparison
  - Integration testing patterns for complex scenarios

### Fixed

- Flaky performance tests in CI environment with tolerance adjustments
- SonarCloud security hotspots and quality gate issues

### Infrastructure

- **Mutation testing with Stryker** - Advanced test quality analysis (93.40% mutation score)
  - Automated detection of weak test cases and untested edge cases
  - 245 comprehensive tests covering critical logic paths
  - Incremental mode for fast CI/CD integration
- **SonarCloud integration** - Automated code quality and security analysis
- **Codecov integration** - Visual coverage tracking and reporting
- Quality gate badges for project health monitoring
- Improved CI/CD pipeline reliability

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

[1.3.2]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.2
[1.3.1]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.1
[1.3.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.0
[1.2.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.2.0
[1.1.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.1.0
[1.0.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.0.0
