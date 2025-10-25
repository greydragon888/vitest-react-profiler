# Performance Testing Examples

This directory contains comprehensive performance testing examples using `vitest-react-profiler` to measure and validate React component performance under various scenarios.

## Overview

This example suite provides extensive performance testing scenarios for React applications, demonstrating how to use `vitest-react-profiler` to:

- Measure and validate component render performance
- Compare optimization techniques (memoization, virtualization)
- Track performance regressions
- Establish and enforce performance budgets
- Analyze memory-intensive operations
- Test animation frame rates
- Validate reconciliation strategies

## Test Structure

The test suite is organized into 8 main categories with **15 total test cases** covering various performance aspects:

### Test Categories

1. **Render Performance** (3 tests)
2. **Heavy Computation Performance** (2 tests)
3. **List Rendering Performance** (2 tests)
4. **Reconciliation Performance** (2 tests)
5. **Animation Performance** (2 tests)
6. **Conditional Rendering Performance** (1 test)
7. **Performance Budgets** (1 test)
8. **Memory and Cleanup** (2 tests)

## Components

### HeavyComputation.tsx

#### `HeavyComputation`

Tests performance impact of expensive calculations with and without memoization.

**Props:**

- `iterations: number` - Number of iterations for heavy calculation
- `enableOptimization?: boolean` - Toggle memoization (default: true)

**Features:**

- Heavy mathematical computations using Math.sqrt and Math.sin
- useMemo optimization comparison
- Counter state to test re-render performance
- Demonstrates memoization effectiveness

#### `LargeList`

Compares virtualized vs non-virtualized list rendering performance.

**Props:**

- `itemCount: number` - Number of items to render
- `enableVirtualization?: boolean` - Enable virtual scrolling (default: false)
- `itemHeight?: number` - Height of each item (default: 50px)
- `containerHeight?: number` - Container height (default: 500px)

**Features:**

- Virtual scrolling implementation
- Search/filter functionality with useMemo
- Performance comparison between rendering strategies
- Handles lists with thousands of items

#### `AnimationStressTest`

Evaluates animation performance with different rendering strategies.

**Props:**

- `particleCount: number` - Number of particles to animate
- `animationDuration?: number` - Animation duration in ms (default: 2000)
- `useRequestAnimationFrame?: boolean` - Use RAF vs setInterval (default: true)

**Features:**

- Particle system with position updates
- RequestAnimationFrame vs setInterval comparison
- Performance scaling with particle count
- Visual animation rendering

#### `RecursiveTree`

Tests deep component tree rendering performance.

**Props:**

- `depth: number` - Maximum tree depth
- `branching: number` - Number of children per node
- `currentDepth?: number` - Current depth (internal)
- `path?: string` - Node path (internal)

**Features:**

- Recursive component structure
- Expand/collapse functionality
- Deep tree reconciliation testing
- Mouse hover highlighting

### PerformanceTest.tsx

#### `FrequentUpdates`

Measures performance under rapid state changes.

**Props:**

- `updateInterval: number` - Milliseconds between updates
- `duration: number` - Total test duration
- `onUpdate?: (count: number) => void` - Update callback

**Features:**

- Configurable update frequency
- Start/stop controls
- Update counter
- Performance tracking under stress

#### `ExpensiveInitialRender`

Tests initial mount performance with complex initialization.

**Props:**

- `complexity: number` - Number of items to generate

**Features:**

- Complex data generation in useEffect
- Two-phase rendering (loading → loaded)
- Performance scaling with complexity
- Initialization timing measurements

#### `ReconciliationTest`

Analyzes React reconciliation performance.

**Props:**

- `itemCount: number` - Number of list items
- `shuffleOnUpdate?: boolean` - Shuffle items on update
- `useKeys?: boolean` - Use stable keys vs index keys

**Features:**

- Stable keys vs index keys comparison
- List manipulation operations (reverse, add, remove, update)
- Reconciliation performance measurement
- Key strategy impact demonstration

#### `ConditionalRendering`

Measures performance of conditional rendering patterns.

**Props:**

- `itemCount: number` - Number of items to render
- `filterThreshold: number` - Filter threshold value

**Features:**

- Dynamic filtering
- Sorting functionality
- Conditional styling (highlighting)
- Multiple rendering conditions

## Test Scenarios

### 1. Render Performance Tests

```typescript
// Track initial render performance
it("should track initial render performance");
// Measures mount and update phases separately
// Validates render completes within 1000ms

// Measure render time scaling
it("should measure render time scaling with complexity");
// Tests with complexities: [10, 50, 100, 200]
// Verifies performance scaling trend
// Ensures all renders < 1000ms

// Track frequent updates
it("should track frequent state updates performance");
// Update interval: 10ms, duration: 100ms
// Measures average render time
// Validates < 50ms average
```

### 2. Heavy Computation Tests

```typescript
// Optimization comparison
it("should optimize heavy calculations with memoization");
// 10,000 iterations
// Compares optimized vs unoptimized
// Validates memoization effectiveness

// Recursive rendering
it("should track recursive component performance");
// Tests depths: [3, 4, 5] with branching factor 3
// Validates < 500ms render time
```

### 3. List Rendering Tests

```typescript
// Virtualization comparison
it("should compare virtualized vs non-virtualized list performance");
// 1000 items
// Expects virtualized < non-virtualized render time

// Search performance
it("should measure search/filter performance in large lists");
// 500 items
// Validates search updates < 100ms
```

### 4. Reconciliation Tests

```typescript
// Key strategies
it("should measure reconciliation with stable vs index keys");
// 100 items reversed
// Compares stable keys vs index keys
// Expects stable keys ≤ 1.5x index keys time

// List manipulations
it("should track performance of list manipulations");
// Operations: Update, Reverse, Remove, Add
// All operations should be < 100ms
```

### 5. Animation Tests

```typescript
// RAF vs setInterval
it("should compare RAF vs setInterval animation performance");
// 50 particles, 100ms duration
// Expects RAF ≤ 1.5x setInterval time

// Performance scaling
it("should track animation performance scaling");
// Tests: [10, 25, 50] particles
// Validates < 33.34ms (30fps minimum)
```

### 6. Conditional Rendering Test

```typescript
it("should measure filtering and sorting performance");
// 200 items
// Tests: filter, sort, highlight operations
// All operations < 100ms
```

### 7. Performance Budget Test

```typescript
it("should validate performance budgets for all components");
// Budgets:
// - ExpensiveInitialRender: 200ms
// - FrequentUpdates: 10ms
// - HeavyComputation: 150ms
// - LargeList: 200ms
// - ReconciliationTest: 50ms
// - ConditionalRendering: 100ms
// - RecursiveTree: 100ms
```

### 8. Memory Tests

```typescript
// Cleanup test
it("should properly clean up after unmount");
// Validates counter reset after unmount

// Memory scaling
it("should track memory-intensive operations");
// Tests 1000 → 2000 items
// Expects reasonable scaling (< 3x)
```

## Performance Metrics

The tests track and validate various metrics:

- **Render Time**: `actualDuration` from React Profiler
- **Render Count**: Total number of renders
- **Average Render Time**: Mean time across all renders
- **Render Phases**: Distinguishes mount vs update phases
- **Performance Scaling**: How metrics change with complexity

## Running Tests

```bash
# Install dependencies
npm install

# Run all performance tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with UI for visual debugging
npm run test:ui

# Run specific test file
npm test PerformanceTest.test.tsx

# Run with coverage
npm run test:coverage
```

## Key Testing Patterns

### 1. Basic Performance Measurement

```tsx
const ProfiledComponent = withProfiler(MyComponent, "MyComponent");
render(<ProfiledComponent {...props} />);

// Check render occurred
expect(ProfiledComponent).toHaveRendered();

// Check render time
expect(ProfiledComponent).toHaveRenderedWithin(100); // ms

// Get specific metrics
const lastRender = ProfiledComponent.getLastRender();
console.log(`Render took ${lastRender?.actualDuration}ms`);
```

### 2. Comparing Optimizations

```tsx
const ProfiledOptimized = withProfiler(OptimizedComponent, "Optimized");
const ProfiledUnoptimized = withProfiler(UnoptimizedComponent, "Unoptimized");

render(<ProfiledOptimized />);
const optimizedTime = ProfiledOptimized.getLastRender()?.actualDuration ?? 0;

render(<ProfiledUnoptimized />);
const unoptimizedTime =
  ProfiledUnoptimized.getLastRender()?.actualDuration ?? 0;

expect(optimizedTime).toBeLessThan(unoptimizedTime);
```

### 3. Tracking Render Phases

```tsx
const ProfiledComponent = withProfiler(Component, "Component");
render(<ProfiledComponent />);

// Check mount phase
const renders = ProfiledComponent.getRenderHistory();
expect(renders[0]?.phase).toBe("mount");

// Check for updates
const updates = ProfiledComponent.getRendersByPhase("update");
expect(updates).toHaveLength(expectedUpdateCount);
```

### 4. Performance Scaling

```tsx
const complexities = [10, 50, 100, 200];
const renderTimes: number[] = [];

complexities.forEach((complexity) => {
  const Profiled = withProfiler(Component, `Component-${complexity}`);
  render(<Profiled complexity={complexity} />);

  const time = Profiled.getLastRender()?.actualDuration ?? 0;
  renderTimes.push(time);

  Profiled.clearCounters(); // Clean up for next iteration
});

// Verify scaling trend
expect(renderTimes[renderTimes.length - 1]).toBeGreaterThan(renderTimes[0]);
```

## Performance Optimization Tips

Based on the test scenarios, here are key optimization strategies:

### 1. Use Memoization Wisely

- Apply `React.memo()` to expensive components
- Use `useMemo()` for expensive computations
- Use `useCallback()` for stable function references

### 2. Implement Virtualization for Large Lists

- Virtual scrolling significantly improves performance
- Especially important for lists with 100+ items

### 3. Use Stable Keys for Lists

- Stable keys improve reconciliation performance
- Critical for reordering operations

### 4. Optimize Animation Rendering

- Prefer `requestAnimationFrame` over `setInterval`
- Batch DOM updates when possible

### 5. Set Performance Budgets

- Establish acceptable render time limits
- Monitor for performance regressions
- Fail tests when budgets are exceeded

## Debugging Performance Issues

When tests fail, use these strategies:

1. **Check Console Output**: Tests log performance metrics
2. **Isolate the Problem**: Run individual tests
3. **Profile in Browser**: Use React DevTools Profiler
4. **Compare with Baseline**: Check against known good performance
5. **Review Recent Changes**: Look for performance regressions

## CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Performance Tests
  run: npm test

- name: Upload Performance Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: performance-results
    path: coverage/
```

## Learn More

- [React Profiler API](https://react.dev/reference/react/Profiler)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools#profiling)
- [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [vitest-react-profiler documentation](../../README.md)

## Contributing

When adding new performance tests:

1. Follow the existing test structure
2. Add clear test descriptions
3. Include console.log for metrics visibility
4. Set appropriate performance budgets
5. Document expected behavior
6. Consider edge cases and scaling
