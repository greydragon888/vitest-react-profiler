# Event-Based API Examples (v1.6.0)

This directory contains comprehensive examples demonstrating the **event-based API** introduced in v1.6.0 of `vitest-react-profiler`.

## 📚 What's Inside

The [`event-based.test.tsx`](./event-based.test.tsx) file contains **21 real-world examples** organized into 6 categories:

### 1. Basic onRender Usage (4 examples)

Learn how to subscribe to render events and track component behavior in real-time.

- **Simple event listener** - Track renders without polling
- **Render count tracking** - Count renders during user interactions
- **Detailed logging** - Access render information (phase, count, duration)
- **Conditional handling** - Filter events by phase or other criteria

### 2. waitForNextRender Usage (4 examples)

Master async testing patterns for components with delayed state updates.

- **Async state updates** - Wait for setTimeout/async operations
- **Data fetching** - Handle loading → success state transitions
- **Sequential renders** - Chain multiple render waits
- **Timeout handling** - Gracefully fail if render doesn't occur

### 3. Basic Cleanup Patterns (4 examples)

Ensure proper cleanup to prevent memory leaks in tests.

- **Manual unsubscribe** - Remove listeners when done
- **Automatic cleanup** - Use beforeEach/afterEach hooks
- **Cleanup after unmount** - Handle component lifecycle
- **Multiple subscriptions** - Manage multiple listeners

### 4. Complex Conditions with onRender (4 examples)

Advanced filtering and conditional logic for event handling.

- **Phase filtering** - Track only mount or update phases
- **Form validation tracking** - Monitor validation state changes
- **Render thresholds** - Alert on excessive re-renders
- **Phase-specific logic** - Different actions for mount vs update

### 5. Performance Benchmarks (3 examples)

Measure and assert on render performance.

- **Async operation timing** - Ensure operations complete within budget (< 20ms)
- **Slow render detection** - Identify performance bottlenecks
- **Regression detection** - Compare against baseline render counts

### 6. Multiple Subscribers (2 examples)

Separate concerns with multiple independent event listeners.

- **Logging + analytics** - Multiple subsystems listening independently
- **Independent lifecycles** - Add/remove listeners independently

## 🚀 Running the Examples

```bash
# Run all examples
npm test

# Run with UI
npm run test:ui

# Run specific test file
npm test event-based.test.tsx

# Run in watch mode
npm run test:watch
```

## 📖 Key Concepts

### Event-Based API (v1.6.0)

The event-based API provides a **reactive, zero-polling** approach to testing React components:

```typescript
const ProfiledComponent = withProfiler(MyComponent);
render(<ProfiledComponent />);

// Subscribe to render events
const unsubscribe = ProfiledComponent.onRender((info) => {
  console.log(`Rendered: ${info.phase}, count: ${info.count}`);
});

// Wait for next render
const info = await ProfiledComponent.waitForNextRender({ timeout: 1000 });

// Cleanup
unsubscribe();
```

### Why Event-Based?

**Before (polling-based):**

```typescript
// ❌ Inefficient polling
await waitFor(() => {
  expect(component.getRenderCount()).toBe(2);
});
```

**After (event-based):**

```typescript
// ✅ Instant notification
const info = await ProfiledComponent.waitForNextRender();
expect(info.count).toBe(2);
```

**Benefits:**

- ⚡ **Faster tests** - No polling delays
- 🎯 **More accurate** - Catch exact render timing
- 🧹 **Cleaner code** - No waitFor() wrappers
- 💪 **More powerful** - Access full render information

## 🧩 Example Components

Three reusable components are provided in [`components/`](./components/):

### AsyncCounter

Demonstrates async state updates with `setTimeout`.

```typescript
<AsyncCounter />
// - Sync increment (immediate render)
// - Async increment (delayed render with loading state)
```

### DataFetcher

Simulates data fetching with loading/success/error states.

```typescript
<DataFetcher userId="123" shouldFail={false} />
// - Shows loading spinner
// - Fetches user data (150ms delay)
// - Displays user profile or error
```

### FormValidator

Email validation with debounced input (300ms).

```typescript
<FormValidator />
// - Real-time email input
// - Debounced validation
// - Shows validation status and errors
```

## 📋 Best Practices

### 1. Subscribe BEFORE Triggering Action

```typescript
// ✅ Correct
const promise = ProfiledComponent.waitForNextRender();
fireEvent.click(button);
await promise;

// ❌ Wrong (may miss the render)
fireEvent.click(button);
const promise = ProfiledComponent.waitForNextRender();
await promise;
```

### 2. Always Clean Up Listeners

```typescript
const unsubscribe = ProfiledComponent.onRender(() => {
  // handle event
});

// ✅ Clean up when done
unsubscribe();
```

### 3. Use Timeouts for Async Operations

```typescript
// ✅ Prevent hanging tests
const info = await ProfiledComponent.waitForNextRender({ timeout: 1000 });
```

### 4. Filter Events by Phase

```typescript
ProfiledComponent.onRender((info) => {
  if (info.phase === "update") {
    // Only track updates, ignore mount
  }
});
```

## 🔗 Related Documentation

- [Main README](../../README.md) - Full library documentation
- [API Reference](../../README.md#api-reference) - Complete API docs
- [Basic Examples](../basic/) - Synchronous API examples
- [GitHub Issues](https://github.com/greydragon888/vitest-react-profiler/issues) - Report bugs or request features

## 💡 Tips

- **Start with Section 1 & 2** - Master basic onRender and waitForNextRender patterns
- **Study Section 3** - Proper cleanup is essential for test stability
- **Explore Sections 4-6** - Advanced patterns for complex scenarios
- **Copy-paste ready** - All examples can be copied directly into your tests

## 🤝 Contributing

Found an issue or have a suggestion? Please [open an issue](https://github.com/greydragon888/vitest-react-profiler/issues) or submit a pull request.

## 📄 License

MIT - See [LICENSE](../../LICENSE) for details.

---

**Happy Testing!** 🎉

_Generated for vitest-react-profiler v1.6.0_
