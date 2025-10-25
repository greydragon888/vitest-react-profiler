# Git Hooks

This directory contains Git hooks managed by [Husky](https://typicode.github.io/husky/).

## Available Hooks

### `pre-commit`

Runs **before** every commit to ensure code quality on staged files.

**Checks:**

- 📝 **Formatting and Linting** (via `lint-staged`)
  - Auto-fixes and formats only staged files
  - Runs ESLint with `--fix`
  - Runs Prettier with `--write`
- 🔷 **Type Checking** (`npm run typecheck`)
  - Validates TypeScript types across the entire project
- 🧪 **Tests** (`npm run test`)
  - Runs all tests without coverage (for speed)

**Purpose:** Fast checks to catch obvious issues before committing.

---

### `pre-push`

Runs **before** pushing to remote to ensure production-ready code.

**Checks:**

- 📝 **Format Check** (`npm run format -- --check`)
  - Verifies all files are properly formatted (doesn't auto-fix)
- 🔍 **Linting** (`npm run lint`)
  - Runs ESLint on the entire codebase
- 🔷 **Type Checking** (`npm run typecheck`)
  - Validates TypeScript types
- 🧪 **Tests with Coverage** (`npm run test:coverage`)
  - Runs all tests with coverage reporting
  - Ensures coverage thresholds are met
- 📦 **Build** (`npm run build`)
  - Verifies the project builds successfully
  - Ensures no build errors before pushing

**Purpose:** Comprehensive validation before sharing code with the team.

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

- **lint-staged config:** `.lintstagedrc.json`
- **commitlint config:** `commitlint.config.js`
- **husky hooks:** `.husky/`
