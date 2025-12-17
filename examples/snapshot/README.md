# Snapshot API Examples

Examples demonstrating the Snapshot API for `vitest-react-profiler` (v1.10.0+).

## Overview

The Snapshot API provides a way to create baselines for render counting, allowing you to test optimization patterns and verify render behavior after specific actions.

## Key Concepts

### snapshot()

Creates a baseline for render counting. All subsequent `getRendersSinceSnapshot()` calls return the delta from this baseline.

```tsx
const ProfiledComponent = withProfiler(MyComponent);
render(<ProfiledComponent />);

ProfiledComponent.snapshot();  // Baseline created
// getRendersSinceSnapshot() now returns 0
```

### getRendersSinceSnapshot()

Returns the number of renders since the last `snapshot()` call.

```tsx
ProfiledComponent.snapshot();
rerender(<ProfiledComponent value={1} />);
rerender(<ProfiledComponent value={2} />);

expect(ProfiledComponent.getRendersSinceSnapshot()).toBe(2);
```

### Matchers

- **`toHaveRerenderedOnce()`** - Asserts exactly one rerender since snapshot
- **`toNotHaveRerendered()`** - Asserts no rerenders since snapshot
- **`toHaveLastRenderedWithPhase(phase)`** - Asserts the last render was "mount", "update", or "nested-update"

## Test Patterns

### 1. Single Render Per Action

Verify that user actions cause exactly one rerender:

```tsx
render(<ProfiledCounter />);

ProfiledCounter.snapshot();
fireEvent.click(screen.getByText("Increment"));

expect(ProfiledCounter).toHaveRerenderedOnce();
```

### 2. Testing React.memo Effectiveness

Verify memoized components don't rerender when props are unchanged:

```tsx
ProfiledComponent.snapshot();
rerender(<ProfiledComponent unrelatedProp="new" />);

expect(ProfiledComponent).toNotHaveRerendered();
```

### 3. Testing useCallback Stability

Verify memoized children don't rerender when parent state changes:

```tsx
ProfiledChild.snapshot();
fireEvent.click(screen.getByText("Update Parent"));

expect(ProfiledChild).toNotHaveRerendered();
```

### 4. Performance Budget Testing

Verify render count stays within budget:

```tsx
ProfiledComponent.snapshot();

// Perform batch operations
performOperations();

const renders = ProfiledComponent.getRendersSinceSnapshot();
expect(renders).toBeLessThanOrEqual(10);
```

### 5. Phase Verification

Verify component lifecycle phases:

```tsx
render(<ProfiledComponent />);
expect(ProfiledComponent).toHaveLastRenderedWithPhase("mount");

rerender(<ProfiledComponent value={2} />);
expect(ProfiledComponent).toHaveLastRenderedWithPhase("update");
```

## API Reference

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `snapshot()` | `void` | Creates baseline for render counting |
| `getRendersSinceSnapshot()` | `number` | Renders since last snapshot |

### Matchers

| Matcher | Description |
|---------|-------------|
| `toHaveRerenderedOnce()` | Exactly one rerender since snapshot |
| `toNotHaveRerendered()` | No rerenders since snapshot |
| `toHaveLastRenderedWithPhase(phase)` | Last render was specific phase |

## Best Practices

1. **Take snapshot immediately before action** - Ensures accurate delta counting
2. **Use descriptive test names** - Explain what optimization you're testing
3. **Reset baseline for multi-step tests** - Take new snapshots between test phases
4. **Combine with getRenderCount()** - Use absolute counts for overall verification

## Common Pitfalls

1. **Forgetting to call snapshot()** - Delta counting requires explicit baseline
2. **Testing unmounted components** - Snapshot API requires mounted component
3. **Expecting memo to skip all rerenders** - Memo only works when props are unchanged
4. **Not accounting for StrictMode** - Development mode may double-render

## Running Examples

```bash
cd examples/snapshot
npm install
npm test
```

## Files

- `SnapshotBasics.test.tsx` - Core API functionality examples
- `OptimizationTesting.test.tsx` - Real-world optimization patterns
- `components/` - Sample components for testing
