# Launch Checklist for vitest-react-profiler

## Pre-Launch Setup

### 1. GitHub Repository

- [ ] Create repository: `github.com/[username]/vitest-react-profiler`
- [ ] Set repository description: "React component render tracking and performance testing utilities for Vitest"
- [ ] Add topics: `vitest`, `react`, `testing`, `performance`, `profiler`, `testing-library`
- [ ] Set default branch to `main`
- [ ] Enable issues, discussions, and wiki

### 2. Replace Placeholders

Replace `[username]` with your GitHub username in:

- [ ] `package.json`
- [ ] `README.md`
- [ ] `.changeset/config.json`
- [ ] `CONTRIBUTING.md`
- [ ] `LICENSE` (also add your name)

### 3. NPM Setup

- [ ] Create npm account if needed: https://www.npmjs.com/signup
- [ ] Login to npm: `npm login`
- [ ] Check package name availability: `npm view vitest-react-profiler`

### 4. GitHub Secrets

Add to repository settings → Secrets:

- [ ] `NPM_TOKEN`: Get from https://www.npmjs.com/settings/[username]/tokens
- [ ] `CODECOV_TOKEN`: Get from https://codecov.io (optional but recommended)

### 5. Initial Code

- [ ] Copy implementation files from artifacts to `src/`
- [ ] Add comprehensive tests in `tests/`
- [ ] Create examples in `examples/`

### 6. Local Testing

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build package
pnpm build

# Check linting
pnpm lint

# Test locally in another project
pnpm link
cd ../test-project
pnpm link vitest-react-profiler
```

### 7. Documentation

- [ ] Complete API documentation in `docs/api-reference.md`
- [ ] Add migration guide in `docs/migration-guide.md`
- [ ] Create getting started guide in `docs/getting-started.md`

## Launch Steps

### 1. Initial Commit

```bash
git init
git add .
git commit -m "feat: initial release of vitest-react-profiler"
git branch -M main
git remote add origin git@github.com:[username]/vitest-react-profiler.git
git push -u origin main
```

### 2. Enable GitHub Features

- [ ] Enable GitHub Pages (optional for docs)
- [ ] Set up branch protection for `main`
- [ ] Configure Dependabot for dependency updates
- [ ] Add issue templates
- [ ] Set up code owners file

### 3. First Release

```bash
# Add changeset for first release
pnpm changeset

# Select "major" for 0.1.0 → 1.0.0 or "minor" for 0.0.0 → 0.1.0
# Write: "Initial release of vitest-react-profiler"

# Version packages
pnpm changeset version

# Commit
git add .
git commit -m "chore: prepare initial release"
git push

# The GitHub Action will automatically publish to npm
```

### 4. Post-Release

- [ ] Verify package on npm: https://www.npmjs.com/package/vitest-react-profiler
- [ ] Test installation: `npm install vitest-react-profiler`
- [ ] Create GitHub release with changelog
- [ ] Add shields/badges to README

## Marketing & Community

### 1. Announcements

- [ ] Tweet about the release
- [ ] Post on Reddit (r/reactjs, r/javascript)
- [ ] Share on Dev.to or Hashnode
- [ ] Post in relevant Discord/Slack communities

### 2. Documentation Sites

- [ ] Submit to Vitest awesome list
- [ ] Add to React testing resources
- [ ] Submit to JS.coach or similar directories

### 3. Example Projects

- [ ] Create CodeSandbox example
- [ ] Create StackBlitz example
- [ ] Add to official examples

## Maintenance Plan

### Regular Tasks

- Weekly: Check and respond to issues
- Monthly: Update dependencies
- Quarterly: Review and merge community PRs

### Version Strategy

- **Patch** (0.0.x): Bug fixes
- **Minor** (0.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### Success Metrics

Track after 1 month:

- [ ] NPM downloads
- [ ] GitHub stars
- [ ] Issues opened/closed
- [ ] Community PRs

## Troubleshooting

### If npm publish fails

1. Check npm login: `npm whoami`
2. Verify package.json is valid
3. Ensure version is unique
4. Check .npmignore

### If CI fails

1. Check GitHub Actions logs
2. Verify secrets are set correctly
3. Test locally with same Node version
4. Check branch protection rules

### If types are missing

1. Ensure `tsconfig.json` generates declarations
2. Check `package.json` types field
3. Verify build output includes `.d.ts` files

## Notes

- First release is most important - test thoroughly
- Respond quickly to initial issues
- Be open to community feedback
- Keep documentation updated

Good luck with your launch! 🚀
