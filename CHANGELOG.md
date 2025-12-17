# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2025-12-01

### Added

- **Snapshot API** - Create render baselines and measure deltas for optimization testing
  - **`snapshot()`** - Mark a baseline point for render counting
  - **`getRendersSinceSnapshot()`** - Get number of renders since last snapshot
  - **`toHaveRerenderedOnce()`** - Assert exactly one rerender after snapshot
  - **`toNotHaveRerendered()`** - Assert no rerenders after snapshot

  ```typescript
  const ProfiledCounter = withProfiler(Counter);
  render(<ProfiledCounter />);

  ProfiledCounter.snapshot();                    // Create baseline
  fireEvent.click(screen.getByText('Increment'));
  expect(ProfiledCounter).toHaveRerenderedOnce(); // Verify single rerender
  ```

  **Key Use Cases:**
  - Testing single render per user action
  - Testing `React.memo` effectiveness
  - Testing `useCallback`/`useMemo` stability
  - Performance budget testing for complex operations

- **Snapshot API property-based tests** (`tests/property/snapshot.properties.tsx`)
  - 6 invariants testing snapshot behavior under randomized conditions
  - Validates snapshot/delta consistency, reset behavior, and timing invariants

- **Snapshot API stress tests** (`tests/stress/snapshot.stress.tsx`)
  - Tests for snapshot behavior under extreme load (10,000+ renders)
  - Memory and performance validation

### Changed

- **CI/CD workflow optimizations** - Removed duplicate checks, saving ~25-30 seconds per run
  - `release.yml`: Removed explicit `typecheck`, `test`, `build` steps (already run by `prepublishOnly` hook)
  - `ci.yml`: `test-examples` job now downloads build artifacts instead of rebuilding

- **Bump size-limit to v12.0.0** - Bundle size monitoring dependency upgrade
  - Breaking changes in v12: Node.js 18 dropped (project uses Node.js 24), chokidar replaced with native fs.watch
  - No configuration changes required

## [1.9.0] - 2025-11-30

### Added

- **`wrapper` support for `profileHook` and `createHookProfiler`** - Profile hooks that depend on React Context
  - New `ProfileHookOptions` interface with `renderOptions` for passing RTL render options (wrapper, container, etc.)
  - 4 function overloads covering all use cases:
    - `profileHook(hook)` - Hook without parameters
    - `profileHook(hook, options)` - Hook without parameters, with context wrapper
    - `profileHook(hook, props)` - Hook with parameters
    - `profileHook(hook, props, options)` - Hook with parameters and context wrapper
  - Wrapper preserved during `rerender()` calls automatically
  - **Use case**: Testing hooks that use `useContext()`, `useRouter()`, `useTheme()`, etc.

  ```typescript
  // Before: ❌ Error - useRouter must be used within RouterProvider
  const { result } = profileHook(() => useRouter());

  // After: ✅ Works with wrapper option
  const { result } = profileHook(() => useRouter(), {
    renderOptions: { wrapper: RouterProvider }
  });
  ```

- **`ProfileHookOptions` type export** - Available from main package entry
  - Exported from `vitest-react-profiler` for TypeScript consumers
  - Consistent with `renderProfiled` API pattern

- **`isProfileHookOptions` type guard export** - Runtime type checking utility
  - Distinguishes between `ProfileHookOptions` and hook props
  - Exported from `profileHook` module for advanced use cases

- **Comprehensive context hook examples** (`examples/hooks/ContextHooks.test.tsx`)
  - Theme context hook profiling
  - Auth context with props and wrapper
  - Router-like context (real-world scenario)
  - Anti-pattern demonstration (missing provider error)

- **Integration tests for wrapper support** (`tests/hooks/profileHook-context.test.tsx`)
  - 308 lines covering all context scenarios
  - Tests for wrapper preservation during rerenders
  - Tests for nested context providers
  - Tests for `createHookProfiler` with wrapper

### Changed

- **Simplified `createHookProfiler` implementation** - Removed duplicate type guard
- **Optimized `profileHook` argument parsing** - Cleaner conditional flow
- **Examples vitest configs** - Added `vitest-react-profiler` alias

## [1.8.0] - 2025-11-29

### Added

- **`notToHaveRenderLoops()` matcher** - Detect suspicious render loop patterns before hitting circuit breaker
  - Catches render loops BEFORE `MAX_SAFE_RENDERS` (10,000) kicks in
  - Configurable thresholds: `maxConsecutiveUpdates` (default: 10), `maxConsecutiveNested`
  - Skip initialization renders: `ignoreInitialUpdates` option
  - Detailed diagnostics with loop location, potential causes, and render history
  - **Use cases**: Debug hanging tests, CI timeouts, useEffect→setState→useEffect cycles
  - Example: `expect(Component).notToHaveRenderLoops({ maxConsecutiveUpdates: 5 })`

- **`toMeetRenderCountBudget()` matcher** - Enforce render count constraints in tests
  - Check single constraint: `expect(Component).toMeetRenderCountBudget({ maxRenders: 3 })`
  - Check multiple constraints: `expect(Component).toMeetRenderCountBudget({ maxRenders: 5, maxMounts: 1, maxUpdates: 2 })`
  - Detailed error messages with emoji indicators (✅ pass / ❌ fail) and violation details
  - Supports `.not` modifier for negative assertions
  - Automatically counts `nested-update` phases alongside regular `update` phases

- **`clearProfilerData()` API** - Selective cleanup for benchmarks and test scenarios
  - Clears render data while keeping components registered for reuse
  - **vs `clearRegistry()`**: Data-only reset (keeps registration) vs full cleanup (removes components)
  - **Use cases**: `afterEach()` hooks, benchmark `setup()`, test iteration cleanup

- **Benchmark stability improvements** - 3x variance reduction (RME ±6-9% → ±2-5%)
  - Added `gc()` setup, increased warmup (100ms→300ms) and measurement time (1s→2s)
  - Fixed 11 benchmarks across cache-optimization, event-system, realistic-patterns files

- **Comprehensive test coverage for new matchers** - Enterprise-grade testing with 84 new tests
  - **Property-based tests** (`tests/property/matchers.properties.tsx`)
    - 17 invariant tests for `notToHaveRenderLoops` matcher

  - **Stress tests** (`tests/stress/matcher-render-loops.stress.tsx`)
    - 21 tests for `notToHaveRenderLoops` under extreme conditions

  - **Performance benchmarks** (`tests/benchmarks/`)
    - 28 benchmarks for `notToHaveRenderLoops` matcher
    - 18 benchmarks for `toMeetRenderCountBudget` matcher

  - **Performance baselines established** for regression detection in future versions

### Changed

- **Default benchmark script now uses gc()** - `npm run test:bench` enables `--expose-gc` by default

- **Benchmark architecture redesign** - Fixed "Infinite render loop" errors from iteration accumulation
  - vitest `bench()` iterations accumulate renders (100 renders × 100 iterations = 10K triggers circuit breaker)
  - Added `clearProfilerData()` + `cleanup()` to all benchmark loops (47 benchmarks across 4 files)

- **Simplified MAX_SAFE_RENDERS constant** - Removed dynamic calculation

- **Unified build constants** - Replaced `import.meta.env.INTERNAL_TESTS` with `__DEV__`
  - Reduced from 3 constants (`__TEST__`, `__DEV__`, `INTERNAL_TESTS`) to 1 (`__DEV__`)
  - Cleaner code: `if (__DEV__)` instead of `if (import.meta.env.INTERNAL_TESTS === "true")`
  - Same tree-shaking: esbuild string replacement removes dead code in production

### Removed

- **`BENCHMARK_TESTS` environment variable** - No longer needed

- **`test:bench:stable` npm script** - Merged into default `test:bench`

### Fixed

- **Benchmark stability and infinite loop errors** - 11 benchmarks fixed, RME >6% → <6%
  - Root causes: GC pauses, render accumulation, insufficient warmup, small sample size
  - Fixed with `gc()` setup, `clearProfilerData()` cleanup, increased warmup/measurement times

## [1.7.0] - 2025-11-25

### Added

- **Dependency Injection (DI) improvements** - Simplified and more maintainable DI interfaces
  - Extracted `ProfilerCacheInterface` and `ProfilerEventsInterface` for testability
  - Removed `getFrozenHistory` from cache interface (0% hit rate, dead code elimination)
  - Cleaner separation of concerns: `ProfilerData` handles history freezing directly
  - **Impact**: Smaller interface surface area, better testability, easier mocking
  - Updated test utilities: `createMockCache()`, `createSpyCache()`, `createNoOpCache()`
  - All examples updated to demonstrate phase cache usage instead frozen history

- **Automatic registry cleanup** - Zero-config memory management for stress tests
  - **Problem solved**: Prevents memory accumulation in `ComponentRegistry.activeComponents` Set (~353 KB for 2,100 components)
  - **Auto-setup enhancement**: Added `afterAll()` hook that calls `registry.reset()`
    - `afterEach`: Clears render data (keeps components for reuse in describe() blocks)
    - `afterAll`: **NEW** - Completely resets registry (prevents accumulation across tests)
  - **Implementation**: Added `reset()` method to `ComponentRegistry` class
    - Clears component data (like `clearAll()`) AND removes Set references (unlike `clearAll()`)
    - `clearAll()`: Between tests (keeps components for reuse) - called by `afterEach`
    - `reset()`: After all tests in file (prevents accumulation) - called by `afterAll`
  - **Public API**: `clearRegistry()` exported for edge cases (manual control if needed)
  - **Impact**: Fully automatic - no manual cleanup needed even in stress tests
  - **Files updated**: `src/auto-setup.ts` now registers both `afterEach` and `afterAll` hooks
  - **Documentation**: ARCHITECTURE.md sections updated with auto-setup behavior and memory analysis

- **Built-in safety mechanisms** - Infinite render loop (10K) & memory leak (100 listeners) detection
  - New constants: `MAX_SAFE_RENDERS`, `MAX_LISTENERS` in `src/profiler/core/constants.ts`

- **Parameter validation in async utilities** - Validates count/timeout parameters, catches NaN/Infinity/negative/zero values (20 new tests)

- **Enhanced error messages** - Component name context and `withProfiler()` usage hints (3 new tests)

- **Comprehensive benchmark suite** - 25 benchmarks in `tests/benchmarks/formatting.bench.ts` verifying O(n) scalability across different history sizes

### Changed

- **ESLint configuration for tests** - Centralized test-specific linting rules
  - Added dedicated stress test override (`**/tests/**/*.stress.ts?(x)`) with 20+ disabled rules for V8/GC profiling
  - Enhanced property test override with `cognitive-complexity: off` for generative testing logic
  - Enhanced unit test override with `expectTypeOf`/`expectType` support in `vitest/expect-expect` rule
  - **Impact**: Eliminated 60-80 inline `eslint-disable` comments from stress test files
  - Cleaner, more maintainable test code with rules centrally configured

- **`formatRenderSummary()` optimization** - 3x faster with O(3n) → O(n) single-loop implementation

- **Async matcher error messages** - Improved timeout validation with clear error messages for invalid values (3 new tests)

- **ProfilerCache optimization** - Removed `frozenHistory` cache (internal optimization, no breaking changes)
  - Investigation revealed 0% hit rate in real test patterns (cache invalidates on every render)
  - Simplified `ProfilerData.getHistory()` to direct `Object.freeze([...renderHistory])`
  - Removed `getFrozenHistory()` method from `ProfilerCacheInterface` (DI interface simplification)
  - Updated `CacheMetrics` type: `"phaseCache" | "closureCache"` (removed `"frozenHistory"`)
  - Performance improvement: Eliminated unnecessary caching overhead (0.96x-1.22x slowdown)
  - Retained `phaseCache` (95.7% hit rate) - still provides significant value
  - **DI Impact**: Cleaner interface contract, easier to implement custom cache strategies

### Fixed

- **Test helper type safety** - Fixed unsafe type errors in mock implementations
  - Removed invalid `getFrozenHistory` method from `createNoOpCache()` in `tests/helpers/mocks.ts`
  - Added proper type annotation for `emitSpy` parameter: `info: Parameters<RenderListener>[0]`
  - Removed unused `createSpyCache` import from `tests/unit/profiler-data-di.test.ts`

- **Mutation testing coverage gaps** - 99.4% → 100.00% (all 6 survived mutants eliminated)
  - Enhanced tests for error messages, string literals, and edge cases

### Infrastructure

- **Bundle size monitoring** - Automated bundle size tracking and enforcement
  - **size-limit** integration with strict size budgets
    - ESM bundle: 40 KB limit (with tree-shaking for `{ withProfiler }`)
    - CJS bundle: 45 KB limit (full package)
  - **New workflow**: `.github/workflows/size.yml`
    - Runs on every pull request
    - Reports ESM, CJS, and Types sizes (raw + gzipped)
    - Warnings at >50KB, errors at >100KB
    - Automatic PR comments with detailed size breakdown
  - **Script**: `npm run size` for local bundle size analysis

- **Dead code detection** - Automated unused code and dependency detection
  - **knip** integration for comprehensive dead code analysis
    - Detects unused exports, files, and dependencies
    - Configured entry points: auto-setup, tests, benchmarks, property tests
    - Ignores: examples, dist, coverage, reports, config files
  - **CI integration**: Runs on every PR in lint job
  - **Script**: `npm run lint:unused` for local dead code checks
  - **Configuration**: `knip.json` with project-specific rules

- **Package validation** - Automated package.json and exports validation
  - **publint** integration for npm package correctness
    - Validates package.json exports/imports
    - Checks dual package hazards (ESM/CJS)
    - Verifies TypeScript definitions
  - **CI integration**: Runs on every PR in lint job
  - **Script**: `npm run lint:package` for local validation

- **Pre-publish checks** - Automated quality gates before npm publish
  - Updated `prepublishOnly` script with comprehensive checks:
    - `npm run lint:package` - Package configuration validation
    - `npm run lint:unused` - Dead code detection
    - `npm run typecheck` - TypeScript validation
    - `npm run test:coverage` - Full test suite with coverage
    - `npm run build` - Production build
  - Prevents publishing packages with:
    - Invalid package.json configuration
    - Dead code or unused dependencies
    - TypeScript errors
    - Failing tests or low coverage
    - Build failures

- **Code quality metrics**
  - **Coverage**: 100% (maintained across all metrics)
  - **Mutation Score**: 100.00%
  - **Bundle Size**: Tracked and enforced (ESM + CJS < 85 KB combined)
  - **Dead Code**: Zero unused exports or dependencies

### Documentation

- **Comprehensive JSDoc for property-based tests** - All 12 property test files documented with detailed invariants
  - Added `@fileoverview` blocks with complete test descriptions
  - **72 invariants documented** across all property test files:
    - `profiler-data.properties.tsx` - ProfilerData core invariants (6 invariants)
    - `profiler-storage.properties.tsx` - WeakMap isolation patterns (6 invariants)
    - `cache-metrics.properties.tsx` - Cache performance metrics (6 invariants)
    - `withProfiler.properties.tsx` - HOC mathematical properties (7 invariants)
    - `stress.properties.tsx` - Extreme load testing (6 invariants)
    - `renderProfiled.properties.tsx` - Component testing utility (6 invariants)
    - `profileHook.properties.tsx` - Custom hook profiling (6 invariants)
    - `matchers.properties.tsx` - Vitest matcher contracts (6 invariants)
    - `events.properties.tsx` - Event system guarantees (6 invariants)
    - `api-events.properties.tsx` - API event methods (6 invariants)
    - `async.properties.tsx` - Async operation safety (6 invariants)
    - `formatting.properties.tsx` - Output formatting rules (6 invariants)
  - Each invariant includes:
    - Detailed description of what is tested
    - "Why important" rationale
    - Testing strategy (number of runs, generators used)
    - Technical implementation notes
    - Real-world use case examples
  - **Translated to English** for international audience
  - **Impact**: Comprehensive test documentation, easier onboarding for contributors

- **ESLint security plugins integration** - Enhanced code security analysis
  - Added `eslint-plugin-security` (20+ security rules)
    - Detects unsafe RegExp patterns, eval usage, command injection risks
    - Configured to ignore false positives (e.g., `security/detect-object-injection`)
  - Added `eslint-plugin-regexp` (200+ RegExp best practices)
    - Validates regular expression patterns
    - Detects performance issues and edge cases
  - Centralized configuration in `eslint.config.mjs`
  - **Impact**: Proactive security vulnerability detection during development

### Security

- **Safety limits** - Internal constants with 100x margin for legitimate use cases (10K renders, 100 listeners)

- **ESLint security rules** - Automated security vulnerability detection
  - Command injection detection
  - Unsafe RegExp pattern detection
  - Eval usage detection
  - Object injection pattern analysis
  - 80+ false positives resolved by targeted rule configuration

## [1.6.0] - 2025-11-11

### BREAKING CHANGES

**For 99% of users (using `withProfiler()`)**: No changes needed!

**1. Removed `interval` parameter from async operations**

The `interval` parameter has been removed from all async utilities and matchers as it's no longer needed with the new event-based architecture.

```typescript
// ❌ Before (v1.5.0)
await waitForRenders(component, 3, { timeout: 2000, interval: 10 });
await expect(component).toEventuallyRenderTimes(3, {
  timeout: 1000,
  interval: 50,
});

// ✅ After (v1.6.0)
await waitForRenders(component, 3, { timeout: 2000 });
await expect(component).toEventuallyRenderTimes(3, { timeout: 1000 });
```

**Migration:** Remove `interval` property from options objects (TypeScript will show errors if used).

**2. Custom wrappers require `onRender()` method**

All async operations now use event-based approach and require `onRender()` method.

```typescript
// ✅ Using withProfiler() - no changes needed
const ProfiledComponent = withProfiler(MyComponent);
await waitForRenders(ProfiledComponent, 3); // Works!

// ⚠️ Custom wrappers - must implement onRender()
class CustomWrapper {
  onRender(callback: (info: RenderEventInfo) => void): () => void {
    // Subscribe to renders
    return () => {}; // Unsubscribe function
  }
}
```

**Impact**: <1% of users (only those with custom wrappers not using withProfiler()).

### Added

- **New API methods** - Subscribe to renders and wait for async updates
  - `onRender(callback)` - Subscribe to component renders with real-time notifications
  - `waitForNextRender(options?)` - Promise-based helper to wait for next render
  - `RenderEventInfo` interface - Structured render event information

- **Comprehensive examples** - Real-world usage patterns
  - 21 event-based examples in `examples/async/`
  - Examples covering: subscriptions, async waits, cleanup, complex conditions, performance

### Changed

- **Async matchers and utilities** - Event-based implementation (**10x faster**)
  - Matchers: `toEventuallyRenderTimes`, `toEventuallyRenderAtLeast`, `toEventuallyReachPhase`
  - Utilities: `waitForRenders()`, `waitForMinimumRenders()`, `waitForPhase()`
  - Performance improvement: ~50ms → <5ms (typical operation)
  - Zero CPU overhead (no polling loops)
  - Race condition protection and immediate resolution when condition already met

- **Core methods performance** - Improved baseline and stability
  - `getRenderCount()`: 91-105% of baseline (was 17-40%)
  - `getRenderHistory()`: Optimized with lazy history evaluation
  - Relative Mean Error (RME): ±10% (was ±15-30% - **20-50% improvement**)
  - Better stability across all operations

### Fixed

- **Race conditions in async operations** - Proper synchronization in event-based code
  - Promise creation before action triggering prevents missed renders
  - Immediate condition check after subscription prevents race conditions
  - Timeout cleanup prevents memory leaks

- **Type safety improvements** - Better TypeScript integration
  - Removed unused generic parameters
  - Enhanced type guards for ProfiledComponent validation
  - Stricter null safety in event listeners

### Removed

- **`interval` parameter** - Removed from `WaitOptions` interface
  - No longer needed with event-based architecture
  - TypeScript will show errors if used (compile-time safety)

- **Polling implementation** - Replaced with event-based approach
  - All async matchers and utilities now use events
  - Dependency on `@testing-library/react` waitFor removed

## [1.5.0] - 2025-11-06

### BREAKING CHANGES

- **RenderInfo → PhaseType simplification**
  - `RenderInfo` interface removed (contained unused `timestamp` field)
  - Replaced with simple `PhaseType` union: `"mount" | "update" | "nested-update"`
  - Affected methods now return phase strings directly instead of objects:
    - `getRenderHistory()` - returns `PhaseType[]` instead of `RenderInfo[]`
    - `getLastRender()` - returns `PhaseType | undefined` instead of `RenderInfo | undefined`
    - `getRenderAt(index)` - returns `PhaseType | undefined` instead of `RenderInfo | undefined`
    - `getRendersByPhase(phase)` - returns `readonly PhaseType[]` instead of `readonly RenderInfo[]`

  **Migration:** Replace `.map(r => r.phase)` with direct array access, replace `render.phase` with direct string comparison.

### Architecture

- **Complete code reorganization** - Improved modularity and maintainability
  - **Impact**: 83 files changed, ~5,900 additions, ~5,477 deletions
  - Reorganized `src/matchers/` into logical structure:
    - `async/` - Async matchers (`toEventuallyRenderTimes`, `toEventuallyRenderAtLeast`, `toEventuallyReachPhase`)
    - `sync/` - Sync matchers (`toHaveRendered`, `toHaveRenderedTimes`, etc.)
    - `type-guards.ts` - Type validation utilities
    - `types.ts` - Shared matcher types
    - `index.ts` - Centralized exports
  - Reorganized `src/profiler/` for better separation of concerns:
    - `api/ProfilerAPI.ts` - Public profiling API
    - `components/` - React component profiling (`withProfiler`, `ProfiledComponent`, callbacks)
    - `core/` - Core data structures (`ProfilerData`, `ProfilerCache`, `ProfilerStorage`)
  - Removed monolithic files: `src/matchers.ts`, `src/withProfiler.tsx`
  - Clear separation between public API and internal implementation
  - Each module has single, well-defined responsibility

### Added

- **Enhanced test coverage for async matchers** - Comprehensive `.not` modifier support
  - Added 3 tests for negated async assertions:
    - `toEventuallyRenderTimes` - Verify failure when exact count IS reached
    - `toEventuallyRenderAtLeast` - Verify failure when minimum IS reached
    - `toEventuallyReachPhase` - Verify failure when phase IS reached
  - **Impact**: 100% code coverage (was 97.84% for async matchers)
  - **Result**: All 378 tests passing, 242/242 branches covered

- **Enhanced CI/CD infrastructure** - Production-grade automation and code quality
  - **SonarCloud integration improvements**
    - Type checking step before analysis
    - SonarCloud package caching for faster builds
    - Official `sonarcloud-github-action` for reliability
    - Centralized configuration in `sonar-project.properties`
    - NPM scripts: `sonar` and `sonar:local` for local analysis

  - **Project guidelines for AI** (`CLAUDE.md`)
    - Code conventions and TypeScript standards
    - Testing requirements (unit, integration, property-based)
    - Performance optimization guidelines
    - Security best practices
    - Documentation standards
    - Serves as context for Claude AI workflows

- **New test utilities** - Better test organization and reusability
  - Unit tests for new architecture:
    - `tests/unit/profiled-component.test.tsx` - ProfiledComponent behavior
    - `tests/unit/profiler-api.test.ts` - Public API contracts
    - `tests/unit/profiler-cache.test.ts` - Cache invalidation logic
    - `tests/unit/profiler-data.test.ts` - Data structure integrity
    - `tests/unit/profiler-storage.test.ts` - Component storage isolation
  - `tests/benchmarks/realistic-patterns.bench.tsx` - Real-world usage benchmarks

- **CI/CD infrastructure improvements**
  - SonarCloud integration with type checking and caching
  - Official `sonarcloud-github-action` for reliability
  - NPM scripts: `sonar` and `sonar:local` for local analysis
  - Codecov bundle analyzer integration

### Changed

- **Simplified render history API** - More intuitive and efficient
  - **Public API methods** (ProfiledComponent interface):
    - `getRenderHistory()` returns `PhaseType[]` instead of `RenderInfo[]`
    - `getLastRender()` returns `PhaseType | undefined` instead of `RenderInfo | undefined`
    - `getRenderAt(index)` returns `PhaseType | undefined` instead of `RenderInfo | undefined`
    - `getRendersByPhase(phase)` returns `readonly PhaseType[]` instead of `readonly RenderInfo[]`
  - **Internal utilities** (not documented, no breaking change):
    - `formatRenderHistory()` and `formatRenderSummary()` updated to work with `PhaseType[]`
    - Used only for matcher error messages
  - Direct string comparisons replace object property access
  - Better TypeScript type narrowing and inference

- **Optimized `withProfiler` initialization** - Removed redundant storage check
  - Eliminated unnecessary `globalStorage.has()` check before `getOrCreate()`
  - `createOnRenderCallback` already calls `getOrCreate()` internally
  - **Impact**: Cleaner code, identical functionality
  - Simplified from 9 steps to 8 steps in component wrapping flow

- **CI/CD workflow improvements** - Faster, more reliable automation
  - **All workflows enhanced** with:
    - Concurrency control - Cancel duplicate runs to save CI minutes
    - Full git history (`fetch-depth: 0`) - Accurate diff comparisons
    - Enhanced permissions - Granular access control
    - Latest actions versions - Security and performance improvements

  - **Coverage workflow** (`.github/workflows/coverage.yml`)
    - Threshold checking step - Fail CI if coverage < 90%
    - Step summary in Actions tab - Quick visibility
    - Improved PR comments with badges and links
    - Multiple file uploads for comprehensive reports

  - **SonarCloud workflow** (`.github/workflows/sonarcloud.yml`)
    - Type checking before analysis - Catch errors early
    - Official action for better reliability
    - Simplified configuration

  - **Claude workflows** (`.github/workflows/claude*.yml`)
    - Latest model (Sonnet 4.5) - Better code understanding
    - Sticky comments - Single updating comment vs spam
    - Progress tracking - Real-time visibility
    - Enhanced tool access - More capabilities

- **Test organization** - Better structure and maintainability
  - All property-based tests updated for `PhaseType`
  - Stress tests refactored to validate phase strings:
    - "timestamps remain monotonically increasing" → "phase types remain valid throughout history"
    - "all history entries have valid structure" → validates `PhaseType` strings
  - Removed 3 unused helper functions from `tests/property/helpers.tsx`:
    - `createComponentWithPhases()` - Not used in any tests
    - `createNestedUpdateComponent()` - Not used in any tests
    - `waitForRenderCount()` - Replaced by async utilities
  - File reduced from ~163 lines to 86 lines (-47%)
  - Cleaner, more maintainable test helpers

### Fixed

- **Bundle configuration for tree-shaking** - Matchers now correctly included in production builds
  - Updated `sideEffects` in package.json: `./src/matchers.ts` → `./src/matchers/index.ts`
  - Resolved esbuild warning: "Ignoring import because file was marked as having no side effects"
  - **Impact**: Bundle size increased from ~6.5KB to ~12KB (matchers properly included)
  - Fixed bundle:analyze command syntax for Codecov bundle analyzer

- **Frozen array edge case** - Empty arrays now consistently frozen
  - Added `EMPTY_FROZEN_ARRAY` constant in `ProfilerAPI.ts`
  - Methods return frozen empty array when no profiler data exists:
    - `getRenderHistory()` - was returning unfrozen `[]`
    - `getRendersByPhase()` - was returning unfrozen `[]`
  - **Impact**: API consistency - all arrays frozen regardless of component state
  - Fixed failing test: "should return empty array when no profiler data exists"

- **Property-based stress tests** - Updated for PhaseType API
  - Fixed "timestamps remain monotonically increasing" test
    - Now validates phase types instead of non-existent timestamps
    - Checks all entries are valid `PhaseType` values
  - Fixed "all history entries have valid structure" test
    - Updated from checking `Number.isFinite(entry)` to validating phase strings
    - Removed unnecessary falsy checks (strings are always truthy)
  - All 135 property-based tests now passing ✅

### Infrastructure

- **Test suite status** - Perfect test coverage achieved
  - **379 unit/integration tests** ✅ (was 367)
  - **135 property-based tests** ✅
  - **100% code coverage** - All lines, functions, branches, statements
  - Comprehensive benchmark suite
  - Property tests validate PhaseType invariants at scale (1,000-10,000 renders)

- **Code quality gates** - Multiple layers of verification
  - **Stryker Mutation Testing** - 96.31% score (improved from 93.40%)
    - 313 mutants killed
    - 12 mutants survived (all non-critical: formatting, timeout boundaries)
    - 3 mutants timeout (edge cases in async polling)
  - SonarCloud - Code quality and security analysis
  - Codecov - Coverage tracking and bundle analysis
  - ESLint - TypeScript strict mode
  - Prettier - Consistent formatting
  - Claude AI - Automated code review on PRs

- **Developer experience** - Improved workflow efficiency
  - Bundle analyzer for size monitoring
  - NPM scripts for local quality checks
  - Type-safe API with excellent IDE support
  - Consistent frozen arrays for immutability guarantees

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

[1.10.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.10.0
[1.9.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.9.0
[1.8.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.8.0
[1.7.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.7.0
[1.6.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.6.0
[1.5.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.5.0
[1.4.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.4.0
[1.3.2]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.2
[1.3.1]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.1
[1.3.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.3.0
[1.2.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.2.0
[1.1.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.1.0
[1.0.0]: https://github.com/greydragon888/vitest-react-profiler/releases/tag/v1.0.0
