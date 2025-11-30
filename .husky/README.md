# Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Available Hooks

### `pre-commit`

Runs **before** every commit to ensure code quality on staged files.

**Checks:**

- 📝 **Formatting and Linting** (via `lint-staged`)
  - Auto-fixes and formats only staged files
  - Runs ESLint with `--fix` and Prettier
- 🔷 **Type Checking** (`npm run typecheck`)
  - Validates TypeScript types across the entire project
- 🧹 **Unused Code Check** (`npm run lint:unused`)
  - Detects unused exports, dependencies, and dead code via Knip
- 🧪 **Tests with Coverage** (`npm run test:coverage`)
  - Runs all unit/integration tests with 100% coverage threshold

**Purpose:** Comprehensive checks to catch issues before committing.

---

### `pre-push`

Runs **before** pushing to remote to ensure production-ready code.

**Checks:**

- 🔍 **Linting** (`npm run lint`)
  - Runs ESLint on the entire codebase
- 🔷 **Type Checking** (`npm run typecheck`)
  - Validates TypeScript types
- 🧹 **Unused Code Check** (`npm run lint:unused`)
  - Detects unused exports and dependencies
- 📦 **Package Validation** (`npm run lint:package`)
  - Validates package.json exports and configuration
- 🧪 **Tests with Coverage** (`npm run test:coverage`)
  - Runs all tests with coverage reporting
  - Ensures 100% coverage threshold is met
- 💪 **Stress Tests** (`npm run test:stress`)
  - Runs memory and performance stress tests
- 📝 **Examples** (`npm run test:examples`)
  - Validates all example tests pass
- 📦 **Build** (`npm run build`)
  - Verifies the project builds successfully

**Purpose:** Full validation before sharing code with the team.

---

### `commit-msg`

Runs **after** writing a commit message to validate format.

**Checks:**

- ✅ Validates commit message follows [Conventional Commits](https://www.conventionalcommits.org/)
- Uses `@commitlint/config-conventional`

**Valid formats:**

```
feat: add new feature
fix: resolve bug in component
docs: update README
chore: update dependencies
refactor: simplify argument parsing
test: add mutation killer tests
perf: optimize render tracking
```

---

## Skipping Hooks

⚠️ **Not recommended**, but you can skip hooks when necessary:

```bash
# Skip pre-commit hook
git commit --no-verify

# Skip pre-push hook
git push --no-verify
```

**Note:** All these checks run in CI anyway, so skipping hooks locally will only delay finding issues.

---

## Configuration

| Config | File |
|--------|------|
| lint-staged | `.lintstagedrc.json` |
| commitlint | `commitlint.config.js` |
| husky hooks | `.husky/` |
| knip (unused) | `knip.config.ts` |
| package lint | `package.json` (publint) |
