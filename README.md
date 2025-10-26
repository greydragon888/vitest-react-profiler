# vitest-react-profiler

<div align="center">

[![npm version](https://img.shields.io/npm/v/vitest-react-profiler.svg?style=flat-square)](https://www.npmjs.com/package/vitest-react-profiler)
[![npm downloads](https://img.shields.io/npm/dm/vitest-react-profiler.svg?style=flat-square)](https://www.npmjs.com/package/vitest-react-profiler)
[![CI](https://github.com/greydragon888/vitest-react-profiler/actions/workflows/ci.yml/badge.svg)](https://github.com/greydragon888/vitest-react-profiler/actions/workflows/ci.yml)
[![Coverage Status](https://codecov.io/gh/greydragon888/vitest-react-profiler/branch/main/graph/badge.svg?token=YOUR_TOKEN)](https://codecov.io/gh/greydragon888/vitest-react-profiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

**React component render tracking and performance testing utilities for Vitest**

[Installation](#installation) • [Quick Start](#quick-start) • [API](#api) • [Examples](#examples) • [Contributing](#contributing)

</div>

## Features

- 🔍 **Precise Render Tracking** - Count exact number of renders with zero guesswork
- ⚡ **Performance Monitoring** - Measure and assert render durations
- 🎯 **Phase Detection** - Distinguish between mount, update, and nested update phases
- 📊 **Statistical Analysis** - Get average, min, max render times across multiple renders
- 🧹 **True Automatic Cleanup** - Zero boilerplate! Components auto-clear between tests
- 💪 **Full TypeScript Support** - Complete type safety with custom Vitest matchers
- 🚀 **Zero Config** - Works out of the box with Vitest and React Testing Library
- 📦 **Tiny Bundle** - Less than 10KB minified

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
expect(ProfiledComponent).toHaveRenderedWithin(16); // 60fps
```

## Requirements

- **Node.js** >= 20.0.0
- **npm** >= 9.0.0 (or equivalent yarn/pnpm versions)
- **React** >= 16.8.0 (with Hooks support)
- **React DOM** >= 16.8.0
- **Vitest** >= 1.0.0
- **@testing-library/react** >= 12.0.0

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

  it('should render quickly', () => {
    const ProfiledComponent = withProfiler(MyComponent);
    render(<ProfiledComponent />);

    expect(ProfiledComponent).toHaveRenderedWithin(16); // 60fps budget
  });

  // No cleanup needed - automatic between tests!
});
```

## API

### `withProfiler(Component, displayName?)`

Wraps a React component with profiling capabilities.

```typescript
const ProfiledComponent = withProfiler(MyComponent, "MyComponent");
```

### Matchers

#### `toHaveRendered()`

Asserts that component has rendered at least once.

#### `toHaveRenderedTimes(count)`

Asserts exact number of renders.

#### `toHaveRenderedWithin(ms)`

Asserts that the last render completed within specified milliseconds.

#### `toHaveMountedOnce()`

Asserts that component mounted exactly once.

#### `toHaveNeverMounted()`

Asserts that component never mounted.

#### `toHaveOnlyUpdated()`

Asserts that component only updated (no mounts).

#### `toHaveAverageRenderTime(ms)`

Asserts average render time across all renders.

### Profiled Component API

```typescript
interface ProfiledComponent<P> {
  // Methods
  getRenderCount(): number;
  getRenderHistory(): readonly RenderInfo[];
  getLastRender(): RenderInfo | undefined;
  getRenderAt(index: number): RenderInfo | undefined;
  getRendersByPhase(phase: Phase): readonly RenderInfo[];
  getAverageRenderTime(): number;
  hasMounted(): boolean;

  // Properties
  readonly OriginalComponent: FC<P>;
}

// Note: Cleanup is automatic between tests - no manual intervention needed!
```

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

### Performance Budget Testing

```typescript
it('should meet performance budget', () => {
  const ProfiledComponent = withProfiler(MyComponent);
  const { rerender } = render(<ProfiledComponent />);

  // Simulate multiple interactions
  for (let i = 0; i < 10; i++) {
    rerender(<ProfiledComponent key={i} />);
  }

  // Assert performance budget
  expect(ProfiledComponent).toHaveAverageRenderTime(10);

  // Check for performance regressions
  const slowRenders = ProfiledComponent.__renderHistory
    .filter(r => r.actualDuration > 16);
  expect(slowRenders).toHaveLength(0);
});
```

### Debug Slow Renders

```typescript
it('should identify performance bottlenecks', () => {
  const ProfiledComponent = withProfiler(SlowComponent);
  render(<ProfiledComponent />);

  const history = ProfiledComponent.__renderHistory;
  history.forEach((render, index) => {
    if (render.actualDuration > 16) {
      console.warn(`Slow render #${index + 1}:`, {
        phase: render.phase,
        duration: `${render.actualDuration.toFixed(2)}ms`,
        timestamp: new Date(render.timestamp).toISOString()
      });
    }
  });
});
```

## Advanced Usage

### Custom Assertions

Create domain-specific assertions:

```typescript
// test-utils/custom-matchers.ts
expect.extend({
  toRenderWithin60FPS(component: ProfiledComponent<any>) {
    const lastRender = component.getLastRender();
    const pass = lastRender ? lastRender.actualDuration <= 16.67 : false;
    return {
      pass,
      message: () =>
        pass
          ? `Expected render to exceed 60fps threshold`
          : `Expected 60fps (≤16.67ms), but took ${lastRender?.actualDuration.toFixed(2)}ms`,
    };
  },
});
```

### CI Performance Monitoring

```typescript
// ci-performance.test.ts
describe('Performance Regression Tests', () => {
  const performanceBudgets = {
    HomePage: 50,
    Dashboard: 100,
    DataGrid: 150
  };

  Object.entries(performanceBudgets).forEach(([name, budget]) => {
    it(`${name} should render within ${budget}ms`, () => {
      const Component = require(`./components/${name}`).default;
      const ProfiledComponent = withProfiler(Component);

      render(<ProfiledComponent />);

      expect(ProfiledComponent).toHaveRenderedWithin(budget);

      // Log for CI metrics
      console.log(`PERF_METRIC:${name}:${ProfiledComponent.getLastRender()?.actualDuration}`);
    });
  });
});
```

## Migration Guide

### From Jest to Vitest

```typescript
// Before (Jest)
import { renderHook } from "@testing-library/react-hooks";

// After (Vitest)
import { renderHook } from "@testing-library/react";
import { withProfiler } from "vitest-react-profiler";
```

### From Enzyme

```typescript
// Before (Enzyme)
const wrapper = mount(<Component />);
expect(wrapper.render.mock.calls.length).toBe(1);

// After (vitest-react-profiler)
const ProfiledComponent = withProfiler(Component);
render(<ProfiledComponent />);
expect(ProfiledComponent).toHaveRenderedTimes(1);
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
npm test

# Build the project
npm run build
```

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
