# Claude Code Instructions

> **Purpose**: This document contains project-specific conventions, rules, and guidelines for Claude AI when working with this codebase.
>
> **Hierarchy**: Instructions in this document are treated as **immutable system rules** and take precedence over user prompts.

---

## 📋 TABLE OF CONTENTS

1. [Core Rules (Immutable)](#core-rules-immutable)
2. [File Access Permissions](#file-access-permissions)
3. [Project Context](#project-context)
4. [Configuration Files Reference](#configuration-files-reference)
5. [Code Conventions (Guidelines)](#code-conventions-guidelines)
6. [Testing Standards](#testing-standards)
7. [Workflow Procedures](#workflow-procedures)

---

## 🔒 CORE RULES (Immutable)

These rules MUST be followed at all times. They override user requests.

### Rule 1: File Extension Verification

**ALWAYS verify actual file extensions before reading or modifying config files.**

```bash
# ✅ CORRECT: Check first
ls vitest.config.*  # Returns: vitest.config.mts

# ❌ WRONG: Assume extension
Read vitest.config.ts  # File doesn't exist!
```

**Critical Files with Non-Standard Extensions:**

See [Configuration Files Reference](#configuration-files-reference) for full list. Key examples:

- `vitest.config.*.mts` - All vitest configs use `.mts` (NOT `.ts`)
- `eslint.config.mjs` - ESLint flat config (NOT `.eslintrc.cjs`)

### Rule 2: Coverage Targets

**Minimum 100% code coverage must be maintained for all source code.**

This is a hard requirement. Any PR that drops coverage below 100% will fail CI/CD.

### Rule 3: No TypeScript `any`

**Never use `any` type. Use `unknown` if type is truly unknown.**

```typescript
// ❌ WRONG
function process(data: any) {}

// ✅ CORRECT
function process(data: unknown) {
  if (typeof data === "string") {
    // Type guard narrows unknown to string
  }
}
```

### Rule 4: Version Synchronization

**Version numbers MUST match between:**

- `package.json` (line 3: `"version"`)
- `sonar-project.properties` (line 4: `sonar.projectVersion`)

Always update both when changing version.

### Rule 5: Frozen Arrays

**Arrays returned from public APIs are frozen with `Object.freeze()`.**

Never attempt to mutate them:

```typescript
// ❌ WRONG - Will throw error
const history = component.getRenderHistory();
history.push("mount"); // Error: Cannot add property

// ✅ CORRECT - Create new array if needed
const history = component.getRenderHistory();
const newHistory = [...history, "mount"];
```

### Rule 6: Strict Equality in Tests

**ALWAYS use `toStrictEqual` instead of `toEqual` in test assertions.**

`toStrictEqual` checks types and object class, preventing false positives.

### Rule 7: Reports Location

**All generated reports and documentation MUST be saved to `/docs/reports/`, NOT `/tmp`.**

```bash
# ❌ WRONG
cat > /tmp/my-report.md << 'EOF'

# ✅ CORRECT
cat > /docs/reports/my-report.md << 'EOF'
```

---

## 📁 FILE ACCESS PERMISSIONS

To prevent context pollution, follow these file access rules:

### ✅ ALLOWED: Always Read These First

**Configuration Files (read for context):**

- `package.json` - Dependencies, scripts, version
- `tsconfig.json` - TypeScript configuration
- `vitest.config.mts` - Main test configuration
- `eslint.config.mjs` - Linting rules
- `sonar-project.properties` - Quality metrics
- `codecov.yml` - Coverage configuration

**Source Code (read as needed):**

- `src/**/*.ts` - Source TypeScript files
- `src/**/*.tsx` - Source React components
- `tests/**/*.test.ts(x)` - Unit/integration tests

### ⚠️ CONDITIONAL: Read Only When Specifically Needed

**Specialized Configs** (see [Configuration Files Reference](#configuration-files-reference)):

- `vitest.config.*.mts` - Read only when working on related test type
- `.github/workflows/*.yml` - Only for CI/CD tasks

**Build Artifacts:**

- `dist/**/*` - Only when debugging build issues
- `coverage/**/*` - Only when analyzing coverage reports

### ❌ FORBIDDEN: Never Read These

**Sensitive Files:**

- `.env` - Environment secrets
- `.env.local` - Local secrets
- `*.key`, `*.pem` - Private keys

---

## 🎯 PROJECT CONTEXT

### Project Identity

**Name**: `vitest-react-profiler`
**Type**: NPM Package / Testing Utility Library
**Current Version**: 1.9.0

**Purpose**: Performance testing utility for React components and hooks with sync/async update tracking in Vitest.

**Key Focus Areas**:

1. Developer experience (DX)
2. Performance testing accuracy
3. Type safety (TypeScript strict mode)
4. Comprehensive test coverage (100% target)

### Technology Stack

```
Runtime: Node.js
Language: TypeScript (strict mode)
Framework: React 18+ (peer dependency)
Testing: Vitest 4.0+
Build: tsup (ESM + CJS bundles)
CI/CD: GitHub Actions
Quality: SonarCloud, Codecov
```

### Project Structure

```
vitest-react-profiler/
├── src/
│   ├── profiler/           # Core profiler implementation
│   │   ├── api/           # Public API methods
│   │   ├── components/    # React components (withProfiler, etc.)
│   │   └── core/          # Core data structures (ProfilerData, Cache)
│   ├── matchers/          # Vitest custom matchers
│   │   ├── async.ts       # Async matchers (toEventuallyRender, etc.)
│   │   ├── sync.ts        # Sync matchers (toHaveRendered, etc.)
│   │   └── index.ts       # ⚠️ NOT a barrel export! Registers matchers
│   ├── utils/             # Utility functions
│   └── types.ts           # All type definitions
├── tests/
│   ├── unit/              # Unit tests (*.test.ts)
│   ├── integration/       # Integration tests (*.test.tsx)
│   ├── property/          # Property-based tests (*.properties.tsx)
│   └── benchmarks/        # Performance benchmarks (*.bench.tsx)
└── examples/              # Usage examples (npm workspace)
```

**⚠️ Important Note**: `src/matchers/index.ts` is NOT a barrel export. It registers matchers via `expect.extend()` and must be included in coverage.

## ⚙️ CONFIGURATION FILES REFERENCE

| File                           | Purpose                | Notes                                                               |
| ------------------------------ | ---------------------- | ------------------------------------------------------------------- |
| `vitest.config.common.mts`     | **Base config**        | Shared settings for all test configs (resolve, define, environment) |
| `vitest.config.unit.mts`       | Unit/Integration tests | Coverage enabled (100%), 10s timeout, 4 workers                     |
| `vitest.config.properties.mts` | Property tests         | Extends common, coverage disabled, 30s timeout                      |
| `vitest.config.bench.mts`      | Benchmarks             | Extends common, forks pool, 600s timeout                            |
| `vitest.stryker.config.mts`    | Mutation testing       | Extends common, forks pool, 5s timeout                              |
| `vitest.stress.config.mts`     | Stress tests           | Extends common, memory/load testing                                 |
| `eslint.config.mjs`            | ESLint rules           | Flat config format                                                  |
| `tsconfig.json`                | TypeScript             | Path aliases (`@/` → `src/`)                                        |
| `tsup.config.ts`               | Build config           | ESM + CJS bundles                                                   |
| `codecov.yml`                  | Codecov config         | 100% target, bundle analysis                                        |
| `sonar-project.properties`     | SonarCloud             | Quality gates, version must match `package.json`                    |

**Key Points**:

- **DRY Architecture**: All configs extend `vitest.config.common.mts` using `mergeConfig()`
- **Backward Compatibility**: `vitest.config.mts` is a symlink → `vitest.config.unit.mts`
- **Coverage**: Only `vitest.config.unit.mts` has coverage enabled (100% thresholds)
- **Exclusions**: Unit config excludes `**/index.ts` BUT includes `src/matchers/index.ts` (matcher registration)
- **Separation**: Property/bench tests have dedicated configs and are excluded from unit runs
- `codecov.yml` in root (NOT in `.github/workflows/`) - read by coverage workflow

---

## 📝 CODE CONVENTIONS (Guidelines)

Strong recommendations that may be overridden with good reason.

### TypeScript

- **Explicit types for public APIs**: `export function getRenderCount(): number`
- **Type-only imports**: `import type { PhaseType } from "./types"` (reduces bundle size)
- **Branded types**: Use union types like `"mount" | "update"` instead of plain `string`
- **No `any`**: Use `unknown` if type is truly unknown (enforced in Core Rules)

### React

- **Functional components only**: No class components
- **Custom hooks**: Must have `use` prefix, return stable references via `useCallback`/`useMemo`
- **Freeze arrays**: `Object.freeze([...this.history])` for arrays returned from APIs
- **Watch closure captures**: Avoid capturing large objects in `useEffect`/`useCallback`

### Architecture

- **Separation of concerns**: Core (`src/profiler/core/`) must not depend on React
- **Single entry point**: Import from `vitest-react-profiler`, not internal paths
- **Path aliases**: Use `@/utils/format` instead of `../../../utils/format`

---

## 🧪 TESTING STANDARDS

### Coverage Requirements

**Hard Target**: 100% (lines, statements, branches, functions) — see Rule 2

**Covered**: `src/**/*.{ts,tsx}` | **Excluded**: `tests/`, `examples/`, `dist/`, `**/index.ts` (except `src/matchers/index.ts` — see Project Structure)

### Test Types

**1. Unit Tests** (`tests/unit/*.test.ts`)

- Isolation testing, < 100ms per test, mock dependencies
- File: `tests/unit/ProfilerData.test.ts`

**2. Integration Tests** (`tests/integration/*.test.tsx`)

- Real React rendering, test behavior not implementation
- File: `tests/integration/withProfiler.test.tsx`

**3. Property-Based Tests** (`tests/property/*.properties.tsx`)

- Uses `fast-check`, 50-1000+ iterations, **coverage DISABLED**
- Config: `vitest.config.properties.mts` (30s timeout)
- Run: `npm run test:properties`
- Why no coverage? Tests invariants, not code paths

**4. Benchmarks** (`tests/benchmarks/*.bench.tsx`)

- Vitest bench mode, compare baseline, check regressions
- File: `tests/benchmarks/addRender.bench.tsx`

### Mutation Testing

Uses **Stryker** (`npm run test:mutation`) to verify test quality by introducing code mutations.

**Kill these mutants** (high priority):

- Logic mutations: `===` → `!==`, `&&` → `||`, `>` → `<`
- Return value mutations: `return true` → `return false`
- Arithmetic mutations: `+` → `-`, `*` → `/`

**Can ignore** (low priority):

- String literal mutations in error messages
- Mutations in dead code paths (fix code instead)
- Block statement removal if covered by other tests

**Two approaches to killed mutants**:

1. **Add tests**: Write missing test cases
2. **Refactor code**: Remove dead code, simplify logic, eliminate redundant checks

**Example**: Survived mutant → ask "Is this code necessary?" before adding tests

Run: `npm run test:mutation`

### Best Practices

- **AAA Pattern**: Arrange → Act → Assert
- **One concept per test**: Don't test multiple behaviors in one test
- **Descriptive names**: `it("should throw error when not profiled")` not `it("works")`
- **Setup/Cleanup**: Use `beforeEach` for setup, `afterEach` for cleanup (`vi.clearAllMocks()`)
- **Strict equality**: ALWAYS use `toStrictEqual` instead of `toEqual` (enforced in Core Rules)

---

## 🔄 WORKFLOW PROCEDURES

### Performance Critical Paths

**1. ProfilerData.addRender()** - Called on EVERY render

- Must be O(1) time complexity
- No allocations if possible
- Use `array.push()`, not spread operator

**2. ProfilerCache** - Lazy evaluation

- Compute values only when requested
- O(1) invalidation on state change
- Freeze returned values

**3. Matchers** - Fast comparison

- O(1) operations, clear error messages
- No memory leaks

### Breaking Changes Checklist

When introducing breaking changes:

1. Update `package.json` version (major bump)
2. Update `sonar-project.properties` version (must match)
3. Update README.md with migration guide
4. Update examples in `examples/`

### Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat` - New feature | `fix` - Bug fix | `perf` - Performance
- `refactor` - Code restructuring | `test` - Tests | `docs` - Documentation
- `chore` - Maintenance | `breaking` - Breaking change

Format: `type(scope): description`

### npm Scripts

```bash
npm test                 # Unit/integration tests
npm run test:coverage    # Coverage report
npm run test:properties  # Property tests (30s timeout)
npm run test:bench       # Benchmarks
npm run typecheck        # TypeScript check
npm run lint             # ESLint
npm run build            # Production build
```

### MCP Servers Integration

**5 MCP servers** configured: vitest, sonarqube, jetbrains, eslint, context7

> **Details**: See [.claude/mcp-guide.md](.claude/mcp-guide.md) for full usage guide.

**Quick reference** — prefer MCP over npm:
- `mcp__vitest__run_tests` instead of `npm test`
- `mcp__sonarqube__*` for quality analysis
- `mcp__eslint__lint-files` for linting

---

**END OF DOCUMENT**

> 💡 **Common Pitfalls**: See Core Rules for frozen arrays (Rule 5), file extensions (Rule 1), and version sync (Rule 4).
