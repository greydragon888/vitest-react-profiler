# Basic Examples

This directory contains foundational examples demonstrating how to use `vitest-react-profiler` for testing React component performance. These examples cover common patterns and serve as a starting point for performance testing.

## Overview

This example suite introduces the core concepts of performance profiling with `vitest-react-profiler`:

- Basic render tracking and measurement
- State change performance monitoring
- Component lifecycle phase detection
- Performance budgets and regression testing
- Memory cleanup validation
- Batch rendering performance

## Components

### SimpleCounter

A basic counter component demonstrating fundamental performance tracking.

**Features:**

- Increment/decrement functionality
- State management with `useState`
- Simple re-render tracking

**Key Patterns:**

- Initial render measurement
- State change impact on performance
- Render count validation

### TodoList

An interactive todo list showcasing real-world performance patterns.

**Features:**

- Add, toggle, and remove todos
- Filter by completion status (All/Active/Completed)
- Dynamic list rendering

**Performance Aspects:**

- List manipulation performance
- Filtering optimization
- Multiple state updates
- Dynamic content rendering

### UserProfile

Async data fetching component with loading states.

**Features:**

- Simulated data fetching
- Loading/loaded states
- Edit mode functionality
- Save/cancel operations

**Performance Testing:**

- Async operation handling
- Loading state transitions
- Form interaction performance
- Prop change re-renders

### ConditionalComponent

Multi-tab interface demonstrating conditional rendering patterns.

**Features:**

- Three tabs with different content
- Content visibility toggling
- Dynamic content sizing

**Test Scenarios:**

- Tab switching performance
- Conditional rendering overhead
- Content size impact on performance

## Test Structure

The test suite contains **19 test cases** organized into 6 categories:

### 1. SimpleCounter Tests (4 tests)

-  Track initial render
-  Track re-renders on state changes
-  Measure performance of multiple operations
-  Track render phases separately

### 2. TodoList Tests (3 tests)

-  Track todo list rendering performance
-  Measure performance of todo operations
-  Track filtering performance

### 3. UserProfile Tests (3 tests)

-  Track loading and data fetching
-  Measure edit mode performance
-  Track re-renders on prop changes

### 4. ConditionalComponent Tests (3 tests)

-  Track conditional rendering performance
-  Measure tab switching performance
-  Validate performance with different content sizes

### 5. Performance Comparison Tests (2 tests)

-  Compare performance of different components
-  Establish performance budgets

### 6. Advanced Testing Patterns (4 tests)

-  Detect performance regression
-  Track memory cleanup
-  Measure render batch performance

## Installation

```bash
# From this directory
npm install

# Or from the root of the project
npm install --workspace=examples/basic
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI for visual debugging
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Key Testing Patterns

### 1. Basic Render Tracking

```tsx
const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
render(<ProfiledCounter />);

// Verify initial render
expect(ProfiledCounter).toHaveRendered();
expect(ProfiledCounter).toHaveRenderedTimes(1);
expect(ProfiledCounter).toHaveMountedOnce();
```

### 2. State Change Performance

```tsx
const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
const { getByText } = render(<ProfiledCounter />);

// Trigger state change
fireEvent.click(getByText("Increment"));

// Verify re-render
expect(ProfiledCounter).toHaveRenderedTimes(2);
expect(ProfiledCounter).toHaveOnlyUpdated(); // After clearing initial mount
```

### 3. Performance Measurements

```tsx
const ProfiledComponent = withProfiler(TodoList, "TodoList");
render(<ProfiledComponent />);

// Get render metrics
const lastRender = ProfiledComponent.getLastRender();
console.log(`Render duration: ${lastRender?.actualDuration}ms`);

// Validate performance
expect(ProfiledComponent).toHaveRenderedWithin(50); // 50ms budget
```

### 4. Async Operations

```tsx
const ProfiledProfile = withProfiler(UserProfile, "UserProfile");
render(<ProfiledProfile userId={1} />);

// Wait for async data
await waitFor(() => {
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
});

// Check render phases
const renders = ProfiledProfile.getRenderHistory();
expect(renders[0]?.phase).toBe("mount"); // Initial mount
expect(renders[1]?.phase).toBe("update"); // After data loaded
```

### 5. Performance Comparison

```tsx
const components = [
  { Component: SimpleCounter, name: "SimpleCounter" },
  { Component: TodoList, name: "TodoList" },
  { Component: UserProfile, name: "UserProfile" },
];

components.forEach(({ Component, name }) => {
  const Profiled = withProfiler(Component, name);
  render(<Profiled />);

  const duration = Profiled.getLastRender()?.actualDuration ?? 0;
  console.log(`${name}: ${duration.toFixed(2)}ms`);
});
```

### 6. Performance Budgets

```tsx
const performanceBudgets = {
  SimpleCounter: 10, // Max 10ms
  TodoList: 30, // Max 30ms
  UserProfile: 50, // Max 50ms
  ConditionalComponent: 20, // Max 20ms
};

Object.entries(performanceBudgets).forEach(([name, budget]) => {
  const Component = getComponentByName(name);
  const Profiled = withProfiler(Component, name);
  render(<Profiled />);

  expect(Profiled).toHaveRenderedWithin(budget);
});
```

### 7. Regression Detection

```tsx
const baselinePerformance = 5; // Previous known good performance
const toleranceMultiplier = 1.5;

const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
render(<ProfiledCounter />);

const currentPerformance = ProfiledCounter.getLastRender()?.actualDuration ?? 0;
const threshold = baselinePerformance * toleranceMultiplier;

expect(currentPerformance).toBeLessThanOrEqual(threshold);
```

### 8. Memory Cleanup

```tsx
const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
const { unmount } = render(<ProfiledCounter />);

expect(ProfiledCounter).toHaveRenderedTimes(1);

// Unmount and clean up
unmount();
ProfiledCounter.clearCounters();

// Verify cleanup
expect(ProfiledCounter).toHaveRenderedTimes(0);
expect(ProfiledCounter.getRenderHistory()).toHaveLength(0);
```

### 9. Batch Rendering

```tsx
const ProfiledCounter = withProfiler(SimpleCounter, "SimpleCounter");
const { getByText } = render(<ProfiledCounter />);

// Batch multiple state updates
act(() => {
  fireEvent.click(getByText("Increment"));
  fireEvent.click(getByText("Increment"));
  fireEvent.click(getByText("Increment"));
});

// React batches updates in event handlers
expect(ProfiledCounter).toHaveRenderedTimes(2); // Initial + 1 batch update
```

## Performance Metrics

The tests track various performance metrics:

- **Render Count**: Total number of component renders
- **Render Duration**: Time taken for each render (actualDuration)
- **Render Phases**: Mount vs Update phase detection
- **Average Render Time**: Mean performance across renders
- **Render History**: Complete timeline of all renders

## Best Practices Demonstrated

1. **Start Simple**: Begin with basic render tracking before complex scenarios
2. **Establish Baselines**: Set performance budgets based on actual measurements
3. **Test User Interactions**: Measure performance of real user actions
4. **Handle Async Operations**: Properly test loading states and data fetching
5. **Compare Alternatives**: Test different implementation approaches
6. **Monitor Regressions**: Detect performance degradation over time
7. **Clean Up Properly**: Reset counters between tests for isolation

## Common Use Cases

### Testing Initial Render Performance

```tsx
expect(ProfiledComponent).toHaveRendered();
expect(ProfiledComponent).toHaveMountedOnce();
expect(ProfiledComponent).toHaveRenderedWithin(50);
```

### Testing Re-render Performance

```tsx
// Trigger state change
fireEvent.click(button);

expect(ProfiledComponent).toHaveRenderedTimes(2);
expect(ProfiledComponent.getLastRender()?.phase).toBe("update");
```

### Testing List Performance

```tsx
// Add multiple items
items.forEach((item) => addItem(item));

// Check performance doesn't degrade
expect(ProfiledComponent).toHaveAverageRenderTime(30);
```

### Testing Conditional Rendering

```tsx
// Switch between different views
fireEvent.click(tab1);
expect(ProfiledComponent).toHaveRenderedWithin(20);

fireEvent.click(tab2);
expect(ProfiledComponent).toHaveRenderedWithin(20);
```

## Debugging Tips

When tests fail:

1. **Check Console Output**: Tests log performance metrics for debugging
2. **Review Render History**: Use `getRenderHistory()` to see all renders
3. **Inspect Phases**: Distinguish between mount and update phases
4. **Compare with Baseline**: Check if performance has regressed
5. **Isolate the Issue**: Run individual tests to identify problems

## Integration with CI/CD

```yaml
# Example GitHub Actions workflow
name: Performance Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: coverage/
```

## Next Steps

After mastering these basic examples:

1. Explore the [Memoization Examples](../memoization/README.md) for optimization techniques
2. Check the [Performance Examples](../performance/README.md) for advanced scenarios
3. Implement performance testing in your own projects
4. Establish project-specific performance budgets
5. Set up continuous performance monitoring

## Learn More

- [vitest-react-profiler documentation](../../README.md)
- [React Profiler API](https://react.dev/reference/react/Profiler)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [React Performance](https://react.dev/learn/render-and-commit)

## Contributing

When adding new examples:

1. Keep examples simple and focused
2. Add clear comments explaining the pattern
3. Include console.log for visibility
4. Write comprehensive test descriptions
5. Update this README with new patterns
