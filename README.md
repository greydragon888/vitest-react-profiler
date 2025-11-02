# vitest-react-profiler

<div align="center">

  <!-- Package Info -->

[![npm version](https://img.shields.io/npm/v/vitest-react-profiler.svg?style=flat-square)](https://www.npmjs.com/package/vitest-react-profiler)
[![npm downloads](https://img.shields.io/npm/dm/vitest-react-profiler.svg?style=flat-square)](https://www.npmjs.com/package/vitest-react-profiler)
[![CI](https://github.com/greydragon888/vitest-react-profiler/actions/workflows/ci.yml/badge.svg?style=flat-square)](https://github.com/greydragon888/vitest-react-profiler/actions/workflows/ci.yml)

  <!-- Framework & Testing Stack -->

[![React](https://img.shields.io/badge/React-16.8--19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![React Testing Library](https://img.shields.io/badge/RTL-16.3-E33332?style=flat-square&logo=testing-library&logoColor=white)](https://testing-library.com/react)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)

  <!-- Quality & Testing -->

[![Enterprise Grade Testing](https://img.shields.io/badge/testing-enterprise%20grade-brightgreen?style=flat-square)](https://dashboard.stryker-mutator.io/reports/github.com/greydragon888/vitest-react-profiler/master)
[![Coverage Status](https://codecov.io/gh/greydragon888/vitest-react-profiler/branch/master/graph/badge.svg)](https://codecov.io/gh/greydragon888/vitest-react-profiler)
[![Mutation testing badge](https://img.shields.io/endpoint?style=flat-square&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fgreydragon888%2Fvitest-react-profiler%2Fmaster)](https://dashboard.stryker-mutator.io/reports/github.com/greydragon888/vitest-react-profiler/master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=greydragon888_vitest-react-profiler&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=greydragon888_vitest-react-profiler)
[![Property-Based Testing](https://img.shields.io/badge/PBT-fast--check-FF4785?style=flat-square)](https://fast-check.dev/)

  <!-- Code Quality Tools -->

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Built with tsup](https://img.shields.io/badge/built%20with-tsup-blue?style=flat-square)](https://tsup.egoist.dev)
[![ESLint](https://img.shields.io/badge/eslint-9.38-4B32C3?style=flat-square&logo=eslint)](https://eslint.org/)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

  <!-- Community -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Engineered with Claude Code](https://img.shields.io/badge/Engineered%20with-Claude%20Code-5865F2?style=flat-square&logo=anthropic&logoColor=white)](https://claude.com/claude-code)

**React component render tracking and performance testing utilities for Vitest**

[Installation](#installation) • [Quick Start](#quick-start) • [API](#api) • [Examples](#examples) • [Contributing](#contributing)

</div>

## Features

- 🔍 **Precise Render Tracking** - Count exact number of renders with zero guesswork
- ⚡ **Performance Monitoring** - Measure and assert render durations
- 🎯 **Phase Detection** - Distinguish between mount, update, and nested update phases
- 📊 **Statistical Analysis** - Get average, min, max render times across multiple renders
- ⏱️ **Async Testing** - Wait for renders with async utilities and matchers
- 🧹 **True Automatic Cleanup** - Zero boilerplate! Components auto-clear between tests
- 💪 **Full TypeScript Support** - Complete type safety with custom Vitest matchers
- 🧬 **Battle-Tested Quality** - 90%+ mutation score, property-based testing, SonarCloud verified
- 🔬 **Mathematically Verified** - 70 property tests with 2,500+ randomized checks per run
- 🚀 **Zero Config** - Works out of the box with Vitest and React Testing Library

## Why vitest-react-profiler?

Testing React component performance and render behavior is crucial but challenging. This library makes it easy:

```typescript
// ❌ Without vitest-react-profiler - guessing and manual counting
let renderCount = 0;
const Component = () => {
  renderCount++;
  return <div />;
};

// ✅ With vitest-react-profiler - precise and clean
const ProfiledComponent = withProfiler(Component);
render(<ProfiledComponent />);
expect(ProfiledComponent).toHaveRenderedTimes(1);
```

## Requirements

- **Node.js** >= 18.0.0 (for ES2022 features)
- **npm** >= 8.0.0 (or equivalent yarn/pnpm versions)
- **React** >= 16.8.0 (Hooks and Profiler API support required)
- **React DOM** >= 16.8.0
- **Vitest** >= 1.0.0
- **@testing-library/react** >= 12.0.0 (v13.0.0+ required for React 18+, v16.0.0+ for React 19+)

## Installation

```bash
npm install --save-dev vitest-react-profiler
# or
yarn add -D vitest-react-profiler
# or
pnpm add -D vitest-react-profiler
```

## Quick Start

### 1. Setup Vitest

Add to your Vitest setup file:

```typescript
// vitest-setup.ts
import "vitest-react-profiler";
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest-setup.ts"],
  },
});
```

### 2. Start Testing

```typescript
import { render } from '@testing-library/react';
import { withProfiler } from 'vitest-react-profiler';
import { MyComponent } from './MyComponent';

describe('MyComponent performance', () => {
  it('should render only once on mount', () => {
    const ProfiledComponent = withProfiler(MyComponent);
    render(<ProfiledComponent />);

    expect(ProfiledComponent).toHaveRenderedTimes(1);
    expect(ProfiledComponent).toHaveMountedOnce();
  });

  // No cleanup needed - automatic between tests!
});
```

### 3. Simplified API (Alternative)

For a more streamlined experience, use `renderProfiled()` which combines `withProfiler()` and `render()` in one call:

```typescript
import { renderProfiled } from "vitest-react-profiler";
import { MyComponent } from "./MyComponent";

describe("MyComponent performance", () => {
  it("should render only once on mount", () => {
    const { component } = renderProfiled(MyComponent, { value: 42 });

    expect(component).toHaveRenderedTimes(1);
    expect(component).toHaveMountedOnce();
  });

  it("should handle prop updates correctly", () => {
    const { component, rerender } = renderProfiled(MyComponent, { value: 1 });

    expect(component).toHaveRenderedTimes(1);

    // rerender automatically merges props
    rerender({ value: 2 });

    expect(component).toHaveRenderedTimes(2);
  });
});
```

#### When to use which approach?

- **`withProfiler()` + `render()`**: More explicit, useful when you need fine-grained control or want to share the profiled component across tests
- **`renderProfiled()`**: More concise, great for quick tests and when you only need profiling for a single test

Both approaches are fully supported and work identically!

## API

### Core Functions

#### `withProfiler(Component, displayName?)`

Wraps a React component with profiling capabilities.

```typescript
const ProfiledComponent = withProfiler(MyComponent, "MyComponent");
```

**Parameters:**

- `Component`: React component to profile
- `displayName` (optional): Custom name for debugging

#### `renderProfiled(Component, props, options?)`

Simplified helper that combines `withProfiler()` and `render()` in one call.

```typescript
const { component, rerender, ...rtl } = renderProfiled(MyComponent, {
  value: 1,
});
```

**Parameters:**

- `Component`: React component to profile
- `props`: Initial props for the component
- `options` (optional):
  - `displayName`: Custom name for the profiled component
  - `renderOptions`: React Testing Library render options (e.g., `wrapper`)

**Returns:**

- `component`: The profiled component with all profiling methods
- `rerender`: Enhanced rerender function that accepts partial props
- All React Testing Library utilities (`container`, `unmount`, `debug`, etc.)

**Example with wrapper:**

```typescript
const { component } = renderProfiled(
  MyComponent,
  { value: 1 },
  {
    renderOptions: { wrapper: ThemeProvider },
  },
);
```

### Matchers

#### `toHaveRendered()`

Asserts that component has rendered at least once.

#### `toHaveRenderedTimes(count)`

Asserts exact number of renders.

#### `toHaveMountedOnce()`

Asserts that component mounted exactly once.

#### `toHaveNeverMounted()`

Asserts that component never mounted.

#### `toHaveOnlyUpdated()`

Asserts that component only updated (no mounts).

### Enhanced Error Messages

vitest-react-profiler provides detailed, actionable error messages to help you debug render issues faster.

#### Before and After

**Before (typical matcher):**

```
Expected component to render 3 time(s), but it rendered 5 time(s)
```

**After (vitest-react-profiler):**

```
Expected 3 renders, but got 5 (1 mount, 4 updates)

  #1 [mount phase]
  #2 [update phase]
  #3 [update phase]
  #4 [update phase]
  #5 [update phase]

  💡 Tip: Use Component.getRenderHistory() to inspect all render details
```

#### Unexpected Mount Detection

When component mounts multiple times unexpectedly:

```
Expected component to mount once, but it mounted 3 times

Mount renders:
  #1 [mount phase]
  #3 [mount phase]
  #7 [mount phase]

  💡 Tip: Use Component.getRenderHistory() to inspect all render details
```

These detailed messages help you:

- **Identify patterns** - See which renders are problematic
- **Understand timing** - Know when renders occur
- **Fix issues faster** - No more guessing what went wrong

### Async Testing Utilities

vitest-react-profiler provides async utilities and matchers for testing components with asynchronous state updates.

#### Async Utilities

**`waitForRenders(component, count, options?)`**

Wait for a component to reach an exact render count:

```typescript
import { withProfiler, waitForRenders } from "vitest-react-profiler";

it("should wait for async renders", async () => {
  const AsyncComponent = () => {
    const [count, setCount] = useState(0);

    // Trigger async re-render
    useEffect(() => {
      setTimeout(() => setCount(1), 100);
    }, []);

    return <div>{count}</div>;
  };

  const ProfiledComponent = withProfiler(AsyncComponent);
  render(<ProfiledComponent />);

  // Wait for 2 renders (mount + update)
  await waitForRenders(ProfiledComponent, 2);

  expect(ProfiledComponent.getRenderCount()).toBe(2);
});
```

**`waitForMinimumRenders(component, minCount, options?)`**

Wait for at least N renders (useful when exact count is uncertain):

```typescript
// Wait for at least 2 renders
await waitForMinimumRenders(ProfiledComponent, 2);

expect(ProfiledComponent.getRenderCount()).toBeGreaterThanOrEqual(2);
```

**`waitForPhase(component, phase, options?)`**

Wait for a specific render phase:

```typescript
// Wait for component to update
await waitForPhase(ProfiledComponent, "update");

expect(ProfiledComponent.getRendersByPhase("update").length).toBeGreaterThan(0);
```

#### Async Matchers

**`toEventuallyRenderTimes(count, options?)`**

Assert that component eventually renders exact number of times:

```typescript
// Default 1000ms timeout
await expect(ProfiledComponent).toEventuallyRenderTimes(3);

// Custom timeout
await expect(ProfiledComponent).toEventuallyRenderTimes(5, { timeout: 2000 });
```

**`toEventuallyRenderAtLeast(minCount, options?)`**

Assert that component eventually renders at least N times:

```typescript
await expect(ProfiledComponent).toEventuallyRenderAtLeast(2);

// With custom interval
await expect(ProfiledComponent).toEventuallyRenderAtLeast(3, {
  timeout: 2000,
  interval: 100,
});
```

**`toEventuallyReachPhase(phase, options?)`**

Assert that component eventually reaches a specific render phase:

```typescript
// Wait for component to update
await expect(ProfiledComponent).toEventuallyReachPhase("update");

// Or wait for mount
await expect(ProfiledComponent).toEventuallyReachPhase("mount", {
  timeout: 500,
});
```

#### Real-World Example

Testing a component with multiple async state updates:

```typescript
it("should handle complex async updates", async () => {
  const ComplexComponent = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
      }, 50);

      setTimeout(() => {
        setData({ result: "success" });
      }, 100);
    }, []);

    return <div>{loading ? "Loading..." : data?.result}</div>;
  };

  const ProfiledComponent = withProfiler(ComplexComponent);
  render(<ProfiledComponent />);

  // Wait for all updates to complete
  await expect(ProfiledComponent).toEventuallyRenderTimes(3);

  // Verify render phases
  expect(ProfiledComponent).toHaveMountedOnce();
  expect(ProfiledComponent.getRendersByPhase("update")).toHaveLength(2);

  // Check final state
  const history = ProfiledComponent.getRenderHistory();
  expect(history.length).toBe(3);
});
```

#### Options

All async utilities and matchers accept options:

```typescript
interface WaitOptions {
  timeout?: number; // Maximum wait time in ms (default: 1000)
  interval?: number; // Polling interval in ms (default: 50)
}
```

### Profiled Component API

```typescript
interface ProfiledComponent<P> {
  // Methods
  getRenderCount(): number;
  getRenderHistory(): readonly RenderInfo[];
  getLastRender(): RenderInfo | undefined;
  getRenderAt(index: number): RenderInfo | undefined;
  getRendersByPhase(phase: Phase): readonly RenderInfo[];
  hasMounted(): boolean;

  // Properties
  readonly OriginalComponent: FC<P>;
}

// Note: Cleanup is automatic between tests - no manual intervention needed!
```

## Hook Profiling ⚡

Profile React hooks to detect extra renders caused by improper state management.

### `profileHook(hook, initialProps?)`

Profile a React hook to track its render behavior.

```typescript
import { profileHook } from "vitest-react-profiler";

it("should not cause extra renders", () => {
  const { ProfiledHook } = profileHook(() => useMyHook());

  // Expect only 1 render on mount
  expect(ProfiledHook).toHaveRenderedTimes(1);
});
```

### Detecting Extra Renders

Common anti-pattern: using `useEffect` to sync state instead of deriving it.

```typescript
// ❌ Bad hook - causes extra render
function useBadHook(value: number) {
  const [state, setState] = useState(value);

  useEffect(() => {
    setState(value * 2); // Extra render!
  }, [value]);

  return state;
}

// Test it
const { ProfiledHook } = profileHook(({ value }) => useBadHook(value), {
  value: 1,
});

// Detected: mount + effect = 2 renders
expect(ProfiledHook).toHaveRenderedTimes(2); // ❌ Extra render detected!
```

**Fix:** Derive state directly instead of using effect:

```typescript
// ✅ Good hook - no extra renders
function useGoodHook(value: number) {
  const [multiplier] = useState(2);
  return value * multiplier; // Derived on each render
}

const { ProfiledHook } = profileHook(({ value }) => useGoodHook(value), {
  value: 1,
});

expect(ProfiledHook).toHaveRenderedTimes(1); // ✅ Perfect!
```

### Simplified API with `createHookProfiler`

For cleaner test code with built-in assertions:

```typescript
import { createHookProfiler } from "vitest-react-profiler";

it("should handle rerenders correctly", () => {
  const profiler = createHookProfiler(({ value }) => useMyHook(value), {
    value: 1,
  });

  profiler.expectRenderCount(1); // Throws if not 1

  profiler.rerender({ value: 2 });
  profiler.expectRenderCount(2);
});
```

### All Matchers Work!

Hook profiling reuses component profiling, so **all matchers work**:

```typescript
const { ProfiledHook } = profileHook(() => useMyHook());

expect(ProfiledHook).toHaveRendered();
expect(ProfiledHook).toHaveRenderedTimes(1);
expect(ProfiledHook).toHaveMountedOnce();
```

### Real-World Anti-Patterns

**Data Fetching Anti-Pattern:**

```typescript
// ❌ Multiple state updates = multiple renders
function useBadDataFetch(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true); // Render 1
    fetch(`/api/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setData(data); // Render 2
        setLoading(false); // Render 3
      });
  }, [id]);

  return { data, loading };
}

// Detected: 3+ renders!
const { ProfiledHook } = profileHook(() => useBadDataFetch("1"));
expect(ProfiledHook.getRenderCount()).toBeGreaterThanOrEqual(3);
```

**Fix:** Use single state object:

```typescript
// ✅ Single state update = single render per change
function useGoodDataFetch(id: string) {
  const [state, setState] = useState({ data: null, loading: false });

  useEffect(() => {
    setState({ data: null, loading: true }); // 1 render
    fetch(`/api/${id}`)
      .then((res) => res.json())
      .then((data) => setState({ data, loading: false })); // 1 render
  }, [id]);

  return state;
}
```

### Batch Testing

No special API needed - just use `forEach`:

```typescript
describe("useMyHook edge cases", () => {
  [0, -1, 10, 100, Number.MAX_SAFE_INTEGER].forEach((value) => {
    it(`should handle value ${value}`, () => {
      const { ProfiledHook } = profileHook(({ val }) => useMyHook(val), {
        val: value,
      });
      expect(ProfiledHook).toHaveRenderedTimes(1);
    });
  });
});
```

### React.StrictMode Behavior

⚠️ **Important:** In development mode, React.StrictMode causes components to render twice intentionally to detect side effects.

```typescript
// In StrictMode (development):
const { ProfiledHook } = profileHook(() => useState(0));
// May render 2 times instead of 1 (mount + strict mode re-render)

// In production or without StrictMode:
// Will render exactly once
```

**Note:** Hook profiling respects this behavior. If your test environment has StrictMode enabled, render counts will be doubled. This is expected and helps ensure your hooks work correctly in StrictMode.

## Examples

### Testing Memoization

```typescript
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});

it('should skip re-renders with memo', () => {
  const ProfiledComponent = withProfiler(ExpensiveComponent);
  const { rerender } = render(<ProfiledComponent data={data} />);

  // Same props - should not re-render
  rerender(<ProfiledComponent data={data} />);
  expect(ProfiledComponent).toHaveRenderedTimes(1);

  // Different props - should re-render
  rerender(<ProfiledComponent data={newData} />);
  expect(ProfiledComponent).toHaveRenderedTimes(2);
});
```

#### ⚠️ Important: Testing React.memo Components

When testing memoized components, wrap the ProfiledComponent with memo for accurate results:

```typescript
it('should verify memo prevents unnecessary renders', () => {
  const ProfiledComponent = withProfiler(MemoizedComponent);

  // ✅ Correct: Additional memo wrapper for ProfiledComponent
  const MemoProfiled = memo(ProfiledComponent);
  const { rerender } = render(<MemoProfiled data={data} />);

  rerender(<MemoProfiled data={data} />); // Same reference
  expect(ProfiledComponent).toHaveRenderedTimes(1); // memo worked!

  rerender(<MemoProfiled data={[...data]} />); // New reference
  expect(ProfiledComponent).toHaveRenderedTimes(2); // re-rendered
});
```

**Why?** React Profiler always triggers even when memo prevents re-render. The additional memo wrapper ensures accurate testing.

## Advanced Usage

### Custom Assertions

Create domain-specific assertions for render count patterns:

```typescript
// test-utils/custom-matchers.ts
expect.extend({
  toHaveRenderedOnlyOnMount(component: ProfiledComponent<any>) {
    const renderCount = component.getRenderCount();
    const pass = renderCount === 1 && component.hasMounted();
    return {
      pass,
      message: () =>
        pass
          ? `Expected component to render more than once`
          : `Expected component to render only on mount, but it rendered ${renderCount} times`,
    };
  },
});
```

### CI Render Count Monitoring

```typescript
// ci-render-tracking.test.ts
describe('Render Count Regression Tests', () => {
  const renderBudgets = {
    HomePage: 1,      // Should render only once
    Dashboard: 5,     // May render up to 5 times
    DataGrid: 10      // Complex component, up to 10 renders
  };

  Object.entries(renderBudgets).forEach(([name, maxRenders]) => {
    it(`${name} should not exceed ${maxRenders} renders`, () => {
      const Component = require(`./components/${name}`).default;
      const ProfiledComponent = withProfiler(Component);

      render(<ProfiledComponent />);

      const renderCount = ProfiledComponent.getRenderCount();
      expect(renderCount).toBeLessThanOrEqual(maxRenders);

      // Log for CI metrics
      console.log(`RENDER_COUNT:${name}:${renderCount}`);
    });
  });
});
```

## Best Practices

1. **Automatic Cleanup**: All profiled components are automatically cleared between tests - no manual cleanup needed!
2. **Use Descriptive Names**: `withProfiler(Component, 'UserDashboard')` for better debugging.
3. **Set Performance Budgets**: Define and test against realistic performance goals.
4. **Profile in Production Mode**: Use `NODE_ENV=production` for accurate measurements.
5. **Test With Real Data**: Use production-like data sizes for meaningful results.

## TypeScript

Full TypeScript support with type definitions included:

```typescript
import { withProfiler, ProfiledComponent, RenderInfo } from 'vitest-react-profiler';

const Component: React.FC<{ title: string }> = ({ title }) => <h1>{title}</h1>;
const Profiled: ProfiledComponent<{ title: string }> = withProfiler(Component);

// Full type safety
const render: RenderInfo | undefined = Profiled.getLastRender();
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Clone the repository
git clone https://github.com/greydragon888/vitest-react-profiler.git

# Install dependencies
npm install

# Run tests
npm test                    # Standard tests (245 tests)
npm run test:properties     # Property-based tests (38 tests)
npm run test:bench          # Performance benchmarks
npm run test:mutation       # Mutation testing

# Coverage
npm run test:coverage       # Generate coverage report

# Build the project
npm run build
```

### Property-Based Testing

This library uses **Property-Based Testing (PBT)** with [`@fast-check/vitest`](https://fast-check.dev/) to ensure mathematical correctness and catch edge cases across thousands of randomized test inputs.

**70 property tests** verify:

- 📐 Mathematical invariants (min ≤ avg ≤ max, sum consistency, etc.)
- 🔒 Cache behavior and invalidation
- ⚡ Async operations and race conditions
- 📝 String formatting edge cases

```bash
# Run property-based tests
npm run test:properties

# Run in watch mode
npm run test:properties:watch
```

**[📖 Complete Property-Based Testing Guide →](./docs/property-based-testing.md)**

Property tests run automatically in CI and execute **~2,500 randomized checks** per test run, providing extensive coverage beyond traditional example-based tests.

## License

MIT © [Oleg Ivanov](https://github.com/greydragon888)

## Acknowledgments

- Inspired by React DevTools Profiler
- Built on top of React's Profiler API
- Uses Vitest's powerful matcher system

---

<div align="center">

Made with ❤️ by the community

[Report Bug](https://github.com/greydragon888/vitest-react-profiler/issues) • [Request Feature](https://github.com/greydragon888/vitest-react-profiler/issues) • [Discussions](https://github.com/greydragon888/vitest-react-profiler/discussions)

</div>
