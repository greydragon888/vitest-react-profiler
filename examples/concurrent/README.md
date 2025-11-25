# React 18+ Concurrent Features Examples

This directory demonstrates how to test React components using **Concurrent Features** with vitest-react-profiler.

## Overview

React 18+ introduces Concurrent Rendering capabilities that allow React to interrupt, pause, and resume rendering work. This enables features like:

- **useTransition** - Mark state updates as non-urgent (can be interrupted)
- **useDeferredValue** - Defer rendering expensive updates
- **Concurrent rendering** - React can work on multiple state versions simultaneously

The profiler **automatically tracks all renders** from these features - no special configuration needed!

## Examples

### 1. TransitionExample.tsx

Demonstrates **useTransition** for search/filter UI:

```typescript
const [isPending, startTransition] = useTransition();

const handleSearch = (value: string) => {
  setInput(value); // Urgent: immediate UI feedback

  startTransition(() => {
    setResults(mockSearch(value)); // Non-urgent: can be interrupted
  });
};
```

**Use cases:**

- Search interfaces
- Filtering large lists
- Tab switching with expensive content
- Any UI where responsiveness > completeness

**Testing:**

```typescript
const ProfiledComponent = withProfiler(TransitionExample);
render(<ProfiledComponent />);

fireEvent.change(input, { target: { value: 'test' } });

// Wait for transition to settle
await waitFor(() => {
  expect(screen.getByTestId('status')).toHaveTextContent('Ready');
});

// Profiler tracked all renders automatically
expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);
```

### 2. DeferredExample.tsx

Demonstrates **useDeferredValue** for performance optimization:

```typescript
const [input, setInput] = useState('');
const deferredInput = useDeferredValue(input);

// Expensive component receives deferred value
<ExpensiveList query={deferredInput} />
```

**Use cases:**

- Large list rendering
- Expensive calculations
- Charts/visualizations
- Any component where rendering is costly

**Testing:**

```typescript
const ProfiledComponent = withProfiler(DeferredExample);
render(<ProfiledComponent />);

fireEvent.change(input, { target: { value: 'test' } });

// Deferred value updates later
await waitFor(() => {
  expect(screen.getByTestId('deferred-value')).toHaveTextContent('test');
});

// Profiler tracked: mount + input + deferred update
expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);
```

## Running Examples

```bash
cd examples/concurrent

# Install dependencies (from workspace root)
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Key Insights

### 1. Automatic Tracking

The profiler uses React's built-in `<Profiler>` API, which **automatically handles Concurrent mode**:

✅ No configuration needed
✅ Works transparently with transitions
✅ Tracks all render phases correctly
✅ Handles interrupted renders

### 2. React Batches Updates

React may batch multiple state updates into fewer renders:

```typescript
// 3 rapid updates...
fireEvent.change(input, { target: { value: "a" } });
fireEvent.change(input, { target: { value: "ab" } });
fireEvent.change(input, { target: { value: "abc" } });

// ...may produce 2-3 renders (React optimizes)
expect(component.getRenderCount()).toBeGreaterThanOrEqual(2);
```

Use `toBeGreaterThanOrEqual` instead of exact counts when testing Concurrent Features.

### 3. isPending Timing

`isPending` from `useTransition` creates additional renders:

```typescript
setInput(value); // Render 1: input changes, isPending = true
startTransition(() => {
  setResults(data); // Render 2: results update, isPending = false
});
```

The profiler tracks both renders.

### 4. Deferred Values

`useDeferredValue` delays updates during urgent work:

```typescript
const deferredValue = useDeferredValue(value);

// Typing quickly:
// - value updates immediately (urgent)
// - deferredValue lags behind (non-urgent)
// - Profiler tracks all intermediate renders
```

## Testing Best Practices

### Use Event-Based Matchers

Concurrent renders may take time to settle:

```typescript
// ❌ Synchronous matchers may fail
expect(component).toHaveRenderedTimes(3);

// ✅ Async matchers wait for renders
await expect(component).toEventuallyRenderAtLeast(2);
```

### Wait for Transitions

Always wait for `isPending` to settle:

```typescript
fireEvent.change(input, { target: { value: "test" } });

await waitFor(() => {
  expect(screen.getByTestId("status")).toHaveTextContent("Ready");
});

// Now safe to assert on render count
expect(component.getRenderCount()).toBeGreaterThanOrEqual(2);
```

### Test Behavior, Not Internals

Focus on **what users see**, not React's internal scheduling:

```typescript
// ✅ Good: Test user-visible behavior
expect(screen.getByTestId("results")).toHaveTextContent("Apple");

// ⚠️ Avoid: Exact render counts may vary
// expect(component).toHaveRenderedTimes(4); // Fragile!

// ✅ Better: Test minimum renders
expect(component.getRenderCount()).toBeGreaterThanOrEqual(2);
```

## Common Patterns

### Pattern 1: Search with Transitions

```typescript
const [query, setQuery] = useState("");
const [results, setResults] = useState([]);
const [isPending, startTransition] = useTransition();

const handleSearch = (value: string) => {
  setQuery(value); // Urgent: show in input

  startTransition(() => {
    setResults(expensiveSearch(value)); // Non-urgent: can wait
  });
};
```

### Pattern 2: Filter with Deferred Value

```typescript
const [filter, setFilter] = useState('');
const deferredFilter = useDeferredValue(filter);

return (
  <>
    <input value={filter} onChange={e => setFilter(e.target.value)} />
    <ExpensiveList filter={deferredFilter} />  {/* Re-renders are deferred */}
  </>
);
```

### Pattern 3: Combined Transitions + Deferred

```typescript
const [input, setInput] = useState("");
const [isPending, startTransition] = useTransition();
const deferredInput = useDeferredValue(input);

// Input updates urgently
// Deferred value + transition = double optimization
```

## Learn More

- **[React Docs: useTransition](https://react.dev/reference/react/useTransition)** - Official React documentation
- **[React Docs: useDeferredValue](https://react.dev/reference/react/useDeferredValue)** - Official React documentation
- **[Main README](../../README.md)** - vitest-react-profiler documentation
- **[API Reference](../../wiki/API-Reference)** - Complete API documentation

## Troubleshooting

### Issue: Render counts vary between test runs

**Cause:** React batches updates differently based on timing and concurrent work.

**Solution:** Use `toBeGreaterThanOrEqual` instead of exact counts:

```typescript
// ❌ Flaky
expect(component).toHaveRenderedTimes(3);

// ✅ Stable
expect(component.getRenderCount()).toBeGreaterThanOrEqual(2);
```

### Issue: Tests timeout waiting for renders

**Cause:** Transition or deferred value not settling.

**Solution:** Check `isPending` status or deferred value state:

```typescript
await waitFor(
  () => {
    expect(screen.getByTestId("status")).toHaveTextContent("Ready");
  },
  { timeout: 5000 },
);
```

### Issue: Components not re-rendering

**Cause:** State not actually changing, or memo/optimization blocking renders.

**Solution:** Check component logic and profiler data:

```typescript
console.log("Render history:", component.getRenderHistory());
console.log("Render count:", component.getRenderCount());
```

---

**Happy Testing with Concurrent React! ⚛️**
