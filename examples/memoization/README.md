# Memoization Examples

This directory contains comprehensive examples demonstrating how to test React component memoization effectiveness using `vitest-react-profiler`.

## Overview

This example suite demonstrates:

- Testing React.memo effectiveness for preventing re-renders
- Measuring performance improvements with memoization
- Validating useMemo and useCallback optimizations
- Comparing memoized vs unmemoized component performance
- Real-world patterns for forms, lists, and data grids

## Test Files

### SimpleMemoization.test.tsx

Basic memoization patterns and testing fundamentals:

- React.memo prevention of re-renders
- useMemo for expensive computations
- useCallback for stable function references
- Performance tracking and phase detection
- Stable vs unstable prop references

### Memoization.test.tsx

Complex real-world scenarios:

- List components with filtering and item memoization
- Form fields with selective re-rendering
- Data grid with row/cell optimizations
- Performance budget testing
- Memoization best practices

## Components

### MemoizedList & UnmemoizedList

- Demonstrates `React.memo` for list components
- Shows `useMemo` for filtering operations
- Individual `ListItem` memoization
- Performance comparison between versions

### MemoizedForm & UnmemoizedForm

- Form with memoized field components
- `useCallback` for event handlers
- Selective field re-rendering
- Validation performance testing

### MemoizedDataGrid & UnmemoizedDataGrid

- Complex data table with row and cell memoization
- Sorting and filtering optimizations with `useMemo`
- Selection state management
- Nested component memoization (GridRow, GridCell)

## Installation

```bash
# From this directory
npm install

# Or from the root of the project
npm install --workspace=examples/memoization
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Important: Testing Memoized Components

⚠️ **Critical Pattern for Testing React.memo Components**

When testing memoized components with `withProfiler`, you need to wrap the ProfiledComponent with memo again for accurate results:

```tsx
// ✅ CORRECT - Additional memo wrapper for accurate testing
const ProfiledComponent = withProfiler(MemoizedComponent, "MemoizedComponent");
const MemoProfiled = memo(ProfiledComponent);

const { rerender } = render(<MemoProfiled data={data} />);
rerender(<MemoProfiled data={data} />); // Same props
expect(ProfiledComponent).toHaveRenderedTimes(1); // Memo prevents re-render!
```

```tsx
// ❌ INCORRECT - Will always show re-renders
const ProfiledComponent = withProfiler(MemoizedComponent, "MemoizedComponent");

const { rerender } = render(<ProfiledComponent data={data} />);
rerender(<ProfiledComponent data={data} />); // Same props
expect(ProfiledComponent).toHaveRenderedTimes(2); // Shows re-render despite memo!
```

**Why?** React Profiler (used internally by withProfiler) always triggers on re-render attempts, even when memo prevents the actual component re-render. The additional memo wrapper ensures accurate testing.

## Key Testing Patterns

### 1. Testing Memo Effectiveness

```tsx
// Test that memo prevents re-renders with same props
const ProfiledList = withProfiler(MemoizedList, "MemoizedList");
const MemoProfiled = memo(ProfiledList);

const { rerender } = render(<MemoProfiled items={items} />);
rerender(<MemoProfiled items={items} />); // Same reference

expect(ProfiledList).toHaveRenderedTimes(1); // No re-render
expect(ProfiledList.getRendersByPhase("mount")).toHaveLength(1);
```

### 2. Testing Without Memo

```tsx
// Unmemoized components always re-render
const ProfiledList = withProfiler(UnmemoizedList, "UnmemoizedList");

const { rerender } = render(<ProfiledList items={items} />);
rerender(<ProfiledList items={items} />); // Same reference

expect(ProfiledList).toHaveRenderedTimes(2); // Re-renders anyway
```

### 3. Measuring Performance Impact

```tsx
const ProfiledMemoized = withProfiler(MemoizedDataGrid);
const ProfiledUnmemoized = withProfiler(UnmemoizedDataGrid);

render(
  <>
    <ProfiledMemoized data={data} />
    <ProfiledUnmemoized data={data} />
  </>,
);

const memoizedTime = ProfiledMemoized.getLastRender()?.actualDuration ?? 0;
const unmemoizedTime = ProfiledUnmemoized.getLastRender()?.actualDuration ?? 0;

console.log(`Memoized: ${memoizedTime.toFixed(2)}ms`);
console.log(`Unmemoized: ${unmemoizedTime.toFixed(2)}ms`);
```

### 4. Testing Selective Re-renders

```tsx
// In forms, only changed fields should re-render
const ProfiledFormField = withProfiler(FormField, "FormField");

render(<TestForm />);
expect(ProfiledFormField).toHaveRenderedTimes(4); // 4 fields

fireEvent.change(firstNameInput, { target: { value: "John" } });

// Note: All fields re-render when parent state changes
// This is expected behavior without additional optimizations
expect(ProfiledFormField).toHaveRenderedTimes(8); // All 4 fields re-render
```

### 5. Testing useMemo Optimization

```tsx
let computationCount = 0;

const Component = ({ items, filter }) => {
  const filtered = useMemo(() => {
    computationCount++;
    return items.filter((item) => item.includes(filter));
  }, [items, filter]);

  return <div>{filtered.length}</div>;
};

const ProfiledComponent = withProfiler(Component);

const { rerender } = render(<ProfiledComponent items={items} filter="1" />);
expect(computationCount).toBe(1);

// Same deps - computation doesn't run
rerender(<ProfiledComponent items={items} filter="1" />);
expect(computationCount).toBe(1); // Still 1!

// Different deps - computation runs
rerender(<ProfiledComponent items={items} filter="2" />);
expect(computationCount).toBe(2);
```

### 6. Testing useCallback Stability

```tsx
const ChildComponent = memo(({ onClick }) => (
  <button onClick={onClick}>Click</button>
));

const ProfiledChild = withProfiler(ChildComponent);
const MemoProfiledChild = memo(ProfiledChild);

const Parent = () => {
  const [other, setOther] = useState(0);

  // Stable callback with useCallback
  const handleClick = useCallback(() => {}, []);

  return (
    <>
      <MemoProfiledChild onClick={handleClick} />
      <button onClick={() => setOther((o) => o + 1)}>Other</button>
    </>
  );
};

render(<Parent />);
fireEvent.click(screen.getByText("Other"));

expect(ProfiledChild).toHaveRenderedTimes(1); // No re-render!
```

## Test Scenarios Coverage

### SimpleMemoization.test.tsx (10 tests)

- ✅ React.memo prevents re-renders with same props
- ✅ Unmemoized components always re-render
- ✅ useMemo caches expensive computations
- ✅ useCallback prevents function recreation
- ✅ Performance time tracking
- ✅ Mount vs update phase detection
- ✅ Average render time calculation
- ✅ Stable references prevent re-renders
- ✅ Unstable references cause re-renders

### Memoization.test.tsx (18 tests)

- ✅ Memoized list prevents re-renders with same props
- ✅ Unmemoized list re-renders even with same props
- ✅ Filter operations optimized with useMemo
- ✅ Performance comparison between memoized/unmemoized lists
- ✅ ListItem individual memoization
- ✅ Form field re-rendering behavior
- ✅ Unmemoized form re-renders all fields
- ✅ Callback optimization with useCallback
- ✅ Form validation performance tracking
- ✅ DataGrid row rendering optimization
- ✅ Cell re-render prevention
- ✅ Sorting/filtering with useMemo
- ✅ Grid performance comparison
- ✅ Memo effectiveness demonstration
- ✅ Memo ineffectiveness with new references
- ✅ Tracking memo effectiveness over time
- ✅ Stable references with proper memoization
- ✅ Performance budget validation

## Performance Metrics

The tests track and validate:

- **Render count**: Total number of renders (`toHaveRenderedTimes`)
- **Render duration**: Time for each render (`toHaveRenderedWithin`)
- **Average render time**: Performance over multiple renders (`toHaveAverageRenderTime`)
- **Mount vs Update**: Different lifecycle phases (`getRendersByPhase`)
- **Render history**: Complete render timeline (`getRenderHistory`)

## Best Practices Demonstrated

1. **Always wrap ProfiledComponent with memo when testing memoized components**
2. **Use stable references for props (useState, useMemo, useCallback)**
3. **Measure before optimizing - identify actual bottlenecks**
4. **Apply memo to expensive components with complex render trees**
5. **Use useMemo for expensive computations, not simple operations**
6. **Use useCallback for event handlers passed to memoized children**

## Common Pitfalls to Avoid

### ❌ Testing memo without additional wrapper

```tsx
// Bad - won't show memo effectiveness
const ProfiledComponent = withProfiler(MemoComponent);
render(<ProfiledComponent />);
```

### ❌ Creating new objects/arrays in render

```tsx
// Bad - breaks memo
<MemoizedComponent data={[1, 2, 3]} />;

// Good - stable reference
const data = useMemo(() => [1, 2, 3], []);
<MemoizedComponent data={data} />;
```

### ❌ Inline functions as props

```tsx
// Bad - always new reference
<MemoizedComponent onClick={() => doSomething()} />;

// Good - memoized callback
const handleClick = useCallback(() => doSomething(), []);
<MemoizedComponent onClick={handleClick} />;
```

### ❌ Over-memoizing simple components

```tsx
// Bad - unnecessary overhead
const SimpleText = memo(({ text }) => <span>{text}</span>);

// Good - memo for complex components
const ComplexList = memo(({ items }) => {
  // Complex rendering logic
  return items.map((item) => <ExpensiveItem key={item.id} {...item} />);
});
```

## Performance Budget Example

```tsx
const performanceBudgets = {
  MemoizedList: 50, // Max 50ms
  MemoizedForm: 75, // Max 75ms
  MemoizedDataGrid: 100, // Max 100ms
};

// Test each component against budget
expect(ProfiledList).toHaveRenderedWithin(performanceBudgets.MemoizedList);
expect(ProfiledForm).toHaveRenderedWithin(performanceBudgets.MemoizedForm);
expect(ProfiledGrid).toHaveRenderedWithin(performanceBudgets.MemoizedDataGrid);
```

## Learn More

- [React.memo documentation](https://react.dev/reference/react/memo)
- [useMemo hook](https://react.dev/reference/react/useMemo)
- [useCallback hook](https://react.dev/reference/react/useCallback)
- [React Profiler API](https://react.dev/reference/react/Profiler)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [vitest-react-profiler documentation](../../README.md)
