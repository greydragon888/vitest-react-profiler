# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-11-02

### BREAKING CHANGES

**vitest-react-profiler** now focuses exclusively on **render counting and phase tracking**, removing all time-based performance measurement features.

**Why this change?** Time-based metrics in test environments don't reflect real-world performance and provide unreliable, misleading data.
Instead of offering useful insights, they could lead to incorrect conclusions about component performance.
The library now focuses on what actually matters: **detecting unnecessary re-renders** through deterministic render counting and phase tracking.

**Removed from `RenderInfo` interface:**

- `actualDuration` - Time spent rendering the component
- `baseDuration` - Estimated time without memoization
- `startTime` - When React began rendering
- `commitTime` - When React committed the render

**Removed matchers:**

- `toHaveRenderedWithin(ms)` - Check last render duration
- `toHaveAverageRenderTime(ms)` - Check average render time across all renders

**Removed methods:**

- `getAverageRenderTime()` - Get average render duration

**Removed utilities:**

- `formatPerformanceMetrics()` - Format performance metrics for display

### Performance

- **Optimized `getRendersByPhase()` performance** - Added phase-specific caching
  - **Impact**: O(n) → O(1) for repeated calls with same phase
  - Cache invalidated automatically on new renders
  - Separate cache entries for "mount", "update", and "nested-update" phases
  - Frozen arrays returned for immutability

- **Optimized `hasMounted()` performance** - Added boolean result caching
  - **Impact**: O(n) → O(1) for repeated calls
  - Cache invalidated automatically on new renders
  - Eliminates redundant array traversal

- **Removed unused `historyVersion` field** - Simplified `ProfilerData` interface
  - Field was declared but never used in the codebase
  - Reduced memory footprint per component

### Fixed

- **Test execution memory exhaustion** - Tests no longer consume all available memory
  - **Impact**: Prevents IDE crashes during test runs
  - Limited concurrent test threads to 4 (via `poolOptions.maxThreads`)
  - Excluded stress tests and property-based tests from default test run
  - Separate npm scripts: `test:stress` and `test:properties` for targeted execution

- **Custom matchers not registered globally** - Fixed 17 failing unit tests
  - Added `import "../src/matchers"` to `tests/setup.ts`
  - Matchers now available in all test files without explicit import
  - Resolved "Invalid Chai property" errors

### Changed

- **Comprehensive documentation update** - README.md updated throughout
  - Removed all references to time-based matchers and methods
  - Updated error message examples to show timestamp-based format
  - Replaced "Performance Budget Testing" with "Render Count Monitoring"
  - Updated "CI Performance Monitoring" to "CI Render Count Monitoring"
  - Simplified API reference section
  - Updated all code examples to focus on render counting

- **Examples cleanup** - Removed 1,225 lines of time-based testing examples
  - Updated `examples/basic/Basic.test.tsx`
  - Updated `examples/hooks/*` (4 files)
  - Updated `examples/memoization/*` (2 files)
  - Updated `examples/performance/PerformanceTest.test.tsx`
  - All examples now focus on render counting and phase tracking

### Added

- **Enhanced caching tests** - Comprehensive test coverage for new cache optimizations
  - 6 new property-based tests in `tests/property/cache.properties.tsx`
  - `getRendersByPhase()` caching behavior tests
  - `hasMounted()` caching behavior tests
  - Cache invalidation tests
  - Cache isolation tests between components

- **Property descriptor tests** - Immutability verification
  - Tests for non-writable `displayName` property
  - Tests for non-writable and non-enumerable `OriginalComponent` property
  - Verification of Object.defineProperty descriptors

- **Edge-case test coverage**
  - `toHaveOnlyUpdated()` edge case: component with only updates (no mount)
  - Empty profiler data edge cases for all methods

### Infrastructure

- All 237 tests passing with optimized memory usage
- Codebase reduced by ~2,051 lines (-73% in affected files)

## [1.3.2] - 2025-11-01

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

[1.4.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.4.0
[1.3.2]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.2
[1.3.1]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.1
[1.3.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.0
[1.2.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.2.0
[1.1.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.1.0
[1.0.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.0.0
