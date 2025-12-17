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
[![ESLint](https://img.shields.io/badge/eslint-9.39-4B32C3?style=flat-square&logo=eslint)](https://eslint.org/)
[![Code Style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

  <!-- Community -->

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Engineered with Claude Code](https://img.shields.io/badge/Engineered%20with-Claude%20Code-5865F2?style=flat-square&logo=anthropic&logoColor=white)](https://claude.com/claude-code)

**React component render tracking and performance testing utilities for Vitest**

[📖 Documentation](../../wiki) • [🚀 Quick Start](../../wiki/Getting-Started) • [📚 API Reference](../../wiki/API-Reference) • [💬 Discussions](../../discussions)

</div>

---

## Features

- 🔍 **Precise Render Tracking** - Count exact number of renders with zero guesswork
- ⚡ **Performance Monitoring** - Detect unnecessary re-renders and track component behavior
- 🎯 **Phase Detection** - Distinguish between mount, update, and nested update phases
- 📸 **Snapshot API** - Create render baselines with `snapshot()` and measure deltas with Extended Matchers
- 🪝 **Hook Profiling** - Profile custom hooks with full Context support via `wrapper` option
- ⏱️ **Async Testing** - Subscribe to renders with `onRender()` and wait with `waitForNextRender()`
- 🔔 **Real-Time Notifications** - React to renders immediately with event-based subscriptions
- ⚛️ **React 18+ Concurrent Ready** - Full support for `useTransition` and `useDeferredValue`
- 🧹 **True Automatic Cleanup** - Zero boilerplate! Components auto-clear between tests
- 🚀 **Zero Config** - Works out of the box with Vitest and React Testing Library
- 🛡️ **Built-in Safety Mechanisms** - Automatic detection of infinite render loops and memory leaks
- 💪 **Full TypeScript Support** - Complete type safety with custom Vitest matchers
- 🧬 **Battle-Tested Quality** - 100% mutation score, property-based testing, stress tests, SonarCloud verified.
- 🔬 **Mathematically Verified** - 266 property tests with 140,000+ randomized scenarios per run
- 🏋️ **Stress-Tested** - 34 stress tests validate performance on 10,000-render histories
- 📊 **Performance Baselines** - 46 benchmarks establish regression detection metrics

## 👥 Who Is This For?

### 🎨 UI-Kit and Design System Developers

Building a UI-kit for your project or company? You need to **track, measure, and improve component performance**. This tool helps you:

- Catch unnecessary re-renders during development
- Set performance budgets for components
- Document performance characteristics in tests

### 📦 Open Source React Library Maintainers

Publishing React components? It's critical to **prove your solution is optimized** and won't degrade performance in user projects. With this tool, you can:

- Add performance tests to CI/CD pipelines
- Showcase performance metrics in documentation
- Track performance regressions between releases

### 📊 Teams with Strict Performance SLAs

Have **strict performance requirements** (fintech, healthcare, real-time systems)? The tool allows you to:

- Set thresholds for render counts
- Automatically verify SLA compliance in tests
- Track asynchronous state updates

---

## Quick Start

### Installation

```bash
npm install --save-dev vitest-react-profiler
# or
yarn add -D vitest-react-profiler
# or
pnpm add -D vitest-react-profiler
```

### Setup

```typescript
// vitest-setup.ts
import "vitest-react-profiler"; // Auto-registers afterEach cleanup
```

Configure Vitest:

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

### Your First Test

```typescript
import { render } from '@testing-library/react';
import { withProfiler } from 'vitest-react-profiler';
import { MyComponent } from './MyComponent';

it('should render only once on mount', () => {
  const ProfiledComponent = withProfiler(MyComponent);
  render(<ProfiledComponent />);

  expect(ProfiledComponent).toHaveRenderedTimes(1);
  expect(ProfiledComponent).toHaveMountedOnce();
});
```

---

## ⏱️ Async Testing

Test components with asynchronous state updates using event-based utilities.

```typescript
const AsyncComponent = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetchData().then(setData);
  }, []);
  return <div>{data ?? "Loading..."}</div>;
};

it('should handle async updates', async () => {
  const Profiled = withProfiler(AsyncComponent);
  render(<Profiled />);

  // Wait for mount + async update
  await expect(Profiled).toEventuallyRenderTimes(2);
});
```

### Key Matchers

- **`toEventuallyRenderTimes(n)`** - Wait for exact render count
- **`toEventuallyRenderAtLeast(n)`** - Wait for minimum renders
- **`toEventuallyReachPhase(phase)`** - Wait for specific phase

📚 **[Read the complete guide →](../../wiki/API-Reference#async-matchers)**

---

## 🎯 Stabilization API (v1.12.0)

Wait for components to "stabilize" - useful for virtualized lists, debounced search, and animations.

### Key Methods

- **`waitForStabilization(options)`** - Wait for renders to stop (debounce pattern)
- **`toEventuallyStabilize(options)`** - Matcher version for cleaner assertions

📚 **[Read the complete guide →](../../wiki/API-Reference#waitforstabilization)**

---

## 🪝 Hook Profiling

Profile custom hooks with full Context support.

```typescript
import { profileHook } from 'vitest-react-profiler';

const useCounter = (initial: number) => {
  const [count, setCount] = useState(initial);
  return { count, increment: () => setCount(c => c + 1) };
};

it('should track hook renders', () => {
  const { result, profiler } = profileHook(() => useCounter(0));

  expect(profiler).toHaveRenderedTimes(1);

  act(() => result.current.increment());

  expect(profiler).toHaveRenderedTimes(2);
  expect(result.current.count).toBe(1);
});
```

### With Context Support

```typescript
const { result, profiler } = profileHook(() => useTheme(), {
  wrapper: ({ children }) => (
    <ThemeProvider theme="dark">{children}</ThemeProvider>
  ),
});
```

📚 **[Read the complete guide →](../../wiki/Hook-Profiling)**

---

## ⚛️ React 18+ Concurrent Features

**Full support for React 18+ Concurrent rendering features** - no special configuration needed!

The library automatically tracks renders from:

### `useTransition` / `startTransition`

Test components using transitions for non-urgent updates

### `useDeferredValue`

Test components using deferred values for performance optimization

### How It Works

The library uses React's built-in `<Profiler>` API, which **automatically handles Concurrent mode**:

- ✅ Transitions are tracked as regular renders
- ✅ Deferred values trigger additional renders (as expected)
- ✅ Interrupted renders are handled correctly by React
- ✅ No special configuration or setup required

**Note:** The library tracks renders, not React's internal scheduling.
Concurrent Features work transparently - your tests verify component behavior, not React internals.

📚 **[Read the complete guide →](../../wiki/React-18-Concurrent-Features)**

---

## 📸 Snapshot API

Create render baselines and measure deltas for optimization testing.

### Testing Single Render Per Action

```typescript
const ProfiledCounter = withProfiler(Counter);
render(<ProfiledCounter />);

ProfiledCounter.snapshot();                    // Create baseline
fireEvent.click(screen.getByText('Increment'));
expect(ProfiledCounter).toHaveRerenderedOnce(); // Verify single rerender
```

### Testing React.memo Effectiveness

```typescript
const ProfiledList = withProfiler(MemoizedList);
const { rerender } = render(<ProfiledList items={items} theme="light" />);

ProfiledList.snapshot();
rerender(<ProfiledList items={items} theme="dark" />);
expect(ProfiledList).toNotHaveRerendered();    // Memo prevented rerender
```

### Extended Matchers 

```typescript
// Sync matchers
expect(ProfiledComponent).toHaveRerendered();     // At least one rerender
expect(ProfiledComponent).toHaveRerendered(3);    // Exactly 3 rerenders

// Async matchers - wait for rerenders
await expect(ProfiledComponent).toEventuallyRerender();
await expect(ProfiledComponent).toEventuallyRerenderTimes(2, { timeout: 2000 });
```

### Key Methods & Matchers

| Method/Matcher | Description |
|----------------|-------------|
| `snapshot()` | Mark baseline for render counting |
| `getRendersSinceSnapshot()` | Get number of renders since baseline |
| `toHaveRerenderedOnce()` | Assert exactly one rerender |
| `toNotHaveRerendered()` | Assert no rerenders |
| `toHaveRerendered()` | Assert at least one rerender |
| `toHaveRerendered(n)` | Assert exactly n rerenders |
| `toEventuallyRerender()` | Wait for rerender |
| `toEventuallyRerenderTimes(n)` | Wait for exact count |

📚 **[Read the complete guide →](../../wiki/Snapshot-API)**

---

## Documentation

📖 **Full documentation is available in the [Wiki](../../wiki)**

### Quick Links

- **[Architecture Documentation](ARCHITECTURE.md)** - 📐 Complete technical architecture (15 sections, ~14,000 lines)
- **[Getting Started Guide](../../wiki/Getting-Started)** - Installation and configuration
- **[API Reference](../../wiki/API-Reference)** - Complete API documentation
- **[Snapshot API](../../wiki/Snapshot-API)** - Extended matchers for optimization testing
- **[Hook Profiling](../../wiki/Hook-Profiling)** - Testing React hooks
- **[React 18+ Concurrent Features](../../wiki/React-18-Concurrent-Features)** - useTransition & useDeferredValue
- **[Examples](../../wiki/Examples)** - Real-world usage patterns
- **[Best Practices](../../wiki/Best-Practices)** - Tips and recommendations
- **[Troubleshooting](../../wiki/Troubleshooting)** - Common issues and solutions

---

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

```bash
# Run tests
npm test                    # Unit/integration tests (811 tests)
npm run test:properties     # Property-based tests (266 tests, 140k+ checks)
npm run test:stress         # Stress tests (34 tests, large histories)
npm run test:bench          # Performance benchmarks (46 benchmarks)
npm run test:mutation       # Mutation testing (100% score)

# Build
npm run build
```

---

## License

MIT © [Oleg Ivanov](https://github.com/greydragon888)

---

<div align="center">

Made with ❤️ by the community

[Report Bug](../../issues) • [Request Feature](../../issues) • [Discussions](../../discussions)

</div>
