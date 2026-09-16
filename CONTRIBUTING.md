# Contributing to vitest-react-profiler

First off, thank you for considering contributing to vitest-react-profiler! It's people like you that make it a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** including code samples
- **Describe the behavior you observed** and what behavior you expected
- **Include screenshots** if applicable
- **Include your environment details** (OS, Node version, React version, Vitest version)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Provide specific examples** to demonstrate the steps
- **Describe the current behavior** and explain why the enhancement would be useful
- **List any alternatives** you've considered

### Your First Code Contribution

Unsure where to begin? You can start by looking through these issues:

- Issues labeled `good first issue` - should only require a few lines of code
- Issues labeled `help wanted` - these are issues we'd really like help with

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/vitest-react-profiler.git
   cd vitest-react-profiler
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Run tests**

   ```bash
   pnpm test        # Run tests once
   pnpm dev         # Run tests in watch mode
   pnpm test:ui     # Open Vitest UI
   ```

4. **Build the package**

   ```bash
   pnpm build
   ```

5. **Test locally in another project**
   ```bash
   pnpm link
   # In your test project
   pnpm link vitest-react-profiler
   ```

## Project Structure

```
vitest-react-profiler/
├── src/                 # Source code
│   ├── index.ts        # Main entry point
│   ├── withProfiler.tsx # Core wrapper component
│   └── types.ts        # TypeScript definitions
├── tests/              # Test files
├── examples/           # Example usage
└── docs/              # Documentation
```

## Development Guidelines

### Code Style

- We use Prettier for code formatting
- We use ESLint for linting
- Run `pnpm format` before committing
- Run `pnpm lint` to check for issues

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, semicolons, etc)
- `refactor:` Code change that neither fixes a bug nor adds a feature
- `perf:` Performance improvements
- `test:` Adding missing tests or correcting existing tests
- `build:` Changes that affect the build system
- `ci:` Changes to CI configuration files and scripts
- `chore:` Other changes that don't modify src or test files

Examples:

```
feat: add toHaveRenderedBetween matcher
fix: handle undefined render history in getLastRender
docs: update API reference for new matchers
```

### Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Maintain or improve code coverage
- Test against multiple React versions

### Documentation

- Update README.md if you change the API
- Add JSDoc comments to exported functions
- Include examples in your documentation
- Update TypeScript definitions as needed

## Versioning and Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please) and published to npm
from GitHub Actions via [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) (with provenance).
Nobody bumps versions or edits `CHANGELOG.md` by hand.

1. **Write [Conventional Commits](https://www.conventionalcommits.org/).** The commit type decides whether a change
   is released and how the version moves:

   | Commit | Release | CHANGELOG section |
   | --- | --- | --- |
   | `feat: …` | minor | Added |
   | `fix: …` | patch | Fixed |
   | `perf: …`, `build: …`, `revert: …` | patch | Changed |
   | `feat!: …` or a `BREAKING CHANGE:` footer | major | ⚠ BREAKING CHANGES |
   | `chore`, `ci`, `docs`, `test`, `refactor`, `style` | — | not listed |

   Use `feat` / `fix` only for changes that users of the package can observe; dev-only dependency updates are
   `chore(deps-dev): …`, and commits that touch nothing but `package-lock.json` are never released. The commit
   subject becomes the CHANGELOG line, so write it for users.

2. **Release PR.** After every push to `master`, the Release workflow opens or updates a `release: vX.Y.Z` pull
   request that bumps `package.json`, `package-lock.json`, `sonar-project.properties`, `CLAUDE.md` and
   `CHANGELOG.md`. Edits to that PR are overwritten whenever `master` moves, so change commit messages instead.

3. **Publish.** Merging the release PR tags `vX.Y.Z`, creates the GitHub Release and publishes the package to npm.
   If publishing fails, fix the cause and run the workflow again (**Actions → Release → Run workflow**): every run
   publishes a tagged version that is still missing from npm.

To force a specific version, add a `Release-As: 2.0.0` footer to a commit on `master`.

The workflow needs the `RELEASE_PLEASE_TOKEN` repository secret: a fine-grained personal access token for this
repository with **Contents** and **Pull requests** set to *Read and write*. A token is required (instead of
`GITHUB_TOKEN`) so that CI runs on the release PR.

## Review Process

1. A maintainer will review your PR
2. They may request changes or ask questions
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

## Testing Matrix

We test against:

- Node.js: 22.x, 24.x
- React: 16.x, 17.x, 18.x
- Vitest: 1.x, 2.x
- Operating Systems: Ubuntu, macOS, Windows

## Resources

- [Vitest Documentation](https://vitest.dev)
- [React Profiler API](https://react.dev/reference/react/Profiler)
- [Testing Library](https://testing-library.com)

## Questions?

Feel free to open an issue with your question or reach out in discussions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you! 🙏
