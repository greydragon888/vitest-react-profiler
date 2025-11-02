# Claude Code Review Guidelines

This document provides project-specific conventions and guidelines for Claude AI when performing code reviews.

## Project Overview

**vitest-react-profiler** is a performance testing utility library for React components and hooks with sync/async update tracking in Vitest.

**Key Focus**: Developer experience, performance testing accuracy, type safety, and comprehensive test coverage.

---

## Code Conventions

### TypeScript

1. **Strict Type Safety**
   - ✅ Use explicit types for all public APIs
   - ✅ Leverage union types and type guards
   - ❌ Never use `any` - prefer `unknown` if type is truly unknown
   - ✅ Use branded types for domain-specific values (e.g., `PhaseType`)

2. **Type Exports**
   - ✅ Export all public types from `src/types.ts`
   - ✅ Re-export from `src/index.ts` for easy imports
   - ✅ Use type alias imports: `import type { ... }`

3. **Generics**
   - ✅ Use descriptive generic names: `<P = {}>` for props
   - ✅ Provide defaults for better DX

### React Patterns

1. **Component Structure**
   - ✅ Use functional components only
   - ✅ Prefer React.FC or explicit return types
   - ✅ Use React Profiler for performance tracking
   - ❌ No class components

2. **Hooks**
   - ✅ Custom hooks must start with `use` prefix
   - ✅ Return stable references (useMemo/useCallback when needed)
   - ✅ Document hook behavior and return values

3. **Performance**
   - ✅ Minimize re-renders (check with React.memo when appropriate)
   - ✅ Freeze arrays returned from API (`Object.freeze()`)
   - ✅ Cache expensive computations
   - ⚠️ Be mindful of closure captures in callbacks

### Architecture

1. **Module Organization**

   ```
   src/
     ├── profiler/          # Core profiler implementation
     │   ├── api/          # Public API methods
     │   ├── components/   # React components and HOCs
     │   └── core/         # Core data structures
     ├── matchers/         # Vitest matchers
     ├── utils/            # Utility functions
     └── types.ts          # All type definitions
   ```

2. **Separation of Concerns**
   - ✅ Core logic in `core/` (no React dependencies)
   - ✅ React integration in `components/`
   - ✅ API surface in `api/`
   - ✅ Test utilities separate from implementation

3. **Exports**
   - ✅ Single entry point: `src/index.ts`
   - ✅ Use path aliases: `@/` for internal imports
   - ❌ No circular dependencies

---

## Testing Standards

### Test Coverage

- ✅ **Minimum 90% coverage** for all source code
- ✅ Test all public API methods
- ✅ Include edge cases and error scenarios
- ✅ Test async behavior thoroughly

### Test Types

1. **Unit Tests** (`tests/unit/`)
   - Test individual classes and functions
   - Mock external dependencies
   - Fast execution

2. **Integration Tests** (`tests/integration/`)
   - Test component interactions
   - Use real dependencies when possible
   - Verify behavior, not implementation

3. **Property-Based Tests** (`tests/property/`)
   - Use `fast-check` for property testing
   - Test invariants and laws
   - Generate diverse test cases

4. **Benchmarks** (`tests/benchmarks/`)
   - Measure performance of critical paths
   - Compare against baseline
   - Check for regressions

### Test File Conventions

1. **Naming**
   - Unit: `*.test.ts` or `*.test.tsx`
   - Properties: `*.properties.tsx`
   - Benchmarks: `*.bench.tsx`

2. **Structure**

   ```typescript
   describe("ComponentName", () => {
     describe("method/feature", () => {
       it("should do something specific", () => {
         // Arrange
         // Act
         // Assert
       });
     });
   });
   ```

3. **Best Practices**
   - ✅ Clear test names describing expected behavior
   - ✅ One assertion concept per test
   - ✅ Use `beforeEach` for setup
   - ✅ Clean up side effects in `afterEach`

---

## Performance Considerations

### Critical Performance Paths

1. **ProfilerData.addRender()** - Called on every render
   - Must be O(1) time complexity
   - No allocations if possible
   - Cache invalidation should be fast

2. **ProfilerCache** - Caching layer
   - Lazy evaluation
   - Smart invalidation
   - Frozen return values to prevent mutations

3. **Matchers** - Used in assertions
   - Fast comparison logic
   - Clear error messages
   - No memory leaks

### Performance Tests

- ✅ Benchmark critical operations
- ✅ Test with realistic data volumes
- ✅ Check memory usage (no unbounded growth)
- ⚠️ Watch for closure memory leaks

---

## Security Considerations

### Input Validation

- ✅ Validate all public API inputs
- ✅ Handle edge cases (negative numbers, empty arrays, etc.)
- ✅ Type guards for runtime type safety

### Dependencies

- ✅ Minimal dependencies (only Vitest, React as peers)
- ✅ Regular security audits (`npm audit`)
- ✅ Keep dependencies up to date

### Secrets

- ❌ Never commit tokens, keys, or credentials
- ✅ Use `.env` for local secrets (already in `.gitignore`)

---

## Documentation

### JSDoc Requirements

All public APIs must have JSDoc comments:

````typescript
/**
 * Brief description of what this does
 *
 * @param param1 - Description of parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * const result = myFunction(param1);
 * ```
 */
export function myFunction(param1: string): ReturnType {}
````

### README Updates

Update README.md when:

- Adding new public APIs
- Changing behavior of existing APIs
- Adding new features
- Making breaking changes

---

## Breaking Changes

### Semantic Versioning

- **Major** (X.0.0) - Breaking changes to public API
- **Minor** (1.X.0) - New features, backward compatible
- **Patch** (1.0.X) - Bug fixes, backward compatible

### Breaking Change Checklist

When introducing breaking changes:

- [ ] Update version in `package.json`
- [ ] Update version in `sonar-project.properties`
- [ ] Document in CHANGELOG.md (if exists)
- [ ] Add migration guide to README
- [ ] Update all examples
- [ ] Update type definitions

### Recent Breaking Changes (v1.5.0)

- Replaced `RenderInfo` object with simple `PhaseType` string union
- Methods now return `PhaseType` instead of `RenderInfo`
- Removed `timestamp` field (artifact from time-based metrics)

---

## Code Review Focus Areas

### High Priority

1. **Type Safety** - Check for proper TypeScript usage
2. **Test Coverage** - Verify adequate tests for changes
3. **Performance** - Look for potential bottlenecks
4. **Breaking Changes** - Flag any API changes

### Medium Priority

5. **Code Quality** - Clarity, maintainability, patterns
6. **Documentation** - JSDoc, README updates
7. **Error Handling** - Edge cases, validation

### Low Priority

8. **Style** - Formatting, naming (ESLint handles most)
9. **Comments** - Only when code is unclear

---

## Common Pitfalls

### ❌ Things to Avoid

1. **Mutating frozen arrays**

   ```typescript
   const history = component.getRenderHistory();
   history.push("mount"); // ❌ Will throw - array is frozen
   ```

2. **Memory leaks in callbacks**

   ```typescript
   // ❌ Captures large closure
   const callback = () => {
     return largeData.map((x) => x);
   };

   // ✅ Extract to stable reference
   const processData = useCallback(() => {
     return largeData.map((x) => x);
   }, [largeData]);
   ```

3. **Using implementation details in tests**

   ```typescript
   // ❌ Testing implementation
   expect(component.internalState).toBe(value);

   // ✅ Testing behavior
   expect(component.getRenderCount()).toBe(1);
   ```

---

## Tools and Commands

### Available npm Scripts

```bash
# Testing
npm test                    # Run all tests
npm run test:coverage       # Run with coverage
npm run test:mutation       # Mutation testing
npm run test:properties     # Property-based tests
npm run test:bench          # Benchmarks

# Code Quality
npm run typecheck          # TypeScript type checking
npm run lint               # ESLint
npm run sonar:local        # Local SonarCloud analysis

# Build
npm run build              # Build for production
```

### Pre-commit Hooks

- ✅ Husky configured for Git hooks
- ✅ Lint-staged runs on changed files
- ✅ Commitlint validates commit messages

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): brief description

Longer description if needed

Breaking Changes: description
Fixes: #123
```

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `perf` - Performance improvement
- `refactor` - Code restructuring
- `test` - Adding tests
- `docs` - Documentation
- `chore` - Maintenance tasks

---

## Questions to Ask During Review

1. **Is this change backward compatible?**
2. **Are there adequate tests?**
3. **Could this cause performance issues?**
4. **Is the API intuitive and type-safe?**
5. **Are error messages clear?**
6. **Could this introduce memory leaks?**
7. **Is documentation updated?**

---

## Contact

For questions about these guidelines or the project:

- GitHub Issues: https://github.com/greydragon888/vitest-react-profiler/issues
- Maintainer: @greydragon888

---

**Last Updated**: v1.5.0 - November 2025
