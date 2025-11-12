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
- ⏱️ **Async Testing** - Subscribe to renders with `onRender()` and wait with `waitForNextRender()`
- 🔔 **Real-Time Notifications** - React to renders immediately with event-based subscriptions
- 🧹 **True Automatic Cleanup** - Zero boilerplate! Components auto-clear between tests
- 💪 **Full TypeScript Support** - Complete type safety with custom Vitest matchers
- 🧬 **Battle-Tested Quality** - 99%+ mutation score, property-based testing, SonarCloud verified
- 🔬 **Mathematically Verified** - 227 property tests with 130,000+ randomized checks per run
- 🚀 **Zero Config** - Works out of the box with Vitest and React Testing Library

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

### 🎯 Tech Leads and Staff Engineers

Making architectural decisions requires **data, not assumptions**. Use the tool to:

- Compare different state management approaches
- Evaluate architectural changes' performance impact
- Create performance guidelines for your team

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
import "vitest-react-profiler";
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

## Documentation

📖 **Full documentation is available in the [Wiki](../../wiki)**

### Quick Links

- **[Getting Started Guide](../../wiki/Getting-Started)** - Installation and configuration
- **[API Reference](../../wiki/API-Reference)** - Complete API documentation
- **[Hook Profiling](../../wiki/Hook-Profiling)** - Testing React hooks
- **[Examples](../../wiki/Examples)** - Real-world usage patterns
- **[Best Practices](../../wiki/Best-Practices)** - Tips and recommendations
- **[Troubleshooting](../../wiki/Troubleshooting)** - Common issues and solutions

---

## Contributing

We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md).

```bash
# Run tests
npm test                    # Unit/integration tests
npm run test:properties     # Property-based tests
npm run test:mutation       # Mutation testing

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
