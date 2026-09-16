// @ts-check

/** @type {import("eslint").Linter.Config[]} */

import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import vitestPlugin from "@vitest/eslint-plugin";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import jsdocPlugin from "eslint-plugin-jsdoc";
// @ts-expect-error - no type definitions available for this package
import noOnlyTests from "eslint-plugin-no-only-tests";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
// @ts-expect-error - no type definitions available for this package
import promisePlugin from "eslint-plugin-promise";
import regexpPlugin from "eslint-plugin-regexp";
// @ts-expect-error - no type definitions available for this package
import securityPlugin from "eslint-plugin-security";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import tsEslint from "typescript-eslint";

export default tsEslint.config(
  // ============================================
  // 1. GLOBAL IGNORES
  // ============================================
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/examples/**",
      "**/.claude/**",
      "**/.stryker-tmp/**", // Stryker mutation testing sandbox
      "**/.vitest*/**", // Vitest cache directories
      "**/*.min.js",
      "**/*.d.ts",
      "**/.DS_Store",
      "**/*.bak*",
    ],
  },

  // ============================================
  // 2. BASE CONFIGURATION
  // ============================================
  eslint.configs.recommended,

  // ============================================
  // 3. STYLISTIC RULES (all files)
  // ============================================
  {
    plugins: {
      "@stylistic": stylistic,
    },
    languageOptions: {
      parser: tsEslint.parser,
    },
    rules: {
      "@stylistic/padding-line-between-statements": [
        "warn",
        {
          blankLine: "always",
          prev: "*",
          next: ["interface", "type"],
        },
        {
          blankLine: "any",
          prev: ["interface", "type"],
          next: "*",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "return",
        },
        {
          blankLine: "always",
          prev: ["const", "let"],
          next: "block-like",
        },
        {
          blankLine: "always",
          prev: ["const", "let"],
          next: "*",
        },
        {
          blankLine: "any",
          prev: ["const", "let"],
          next: ["const", "let"],
        },
        {
          blankLine: "always",
          prev: ["if", "for", "while", "switch"],
          next: "*",
        },
        {
          blankLine: "any",
          prev: ["if", "for", "while", "switch"],
          next: ["if", "for", "while", "switch"],
        },
        {
          blankLine: "always",
          prev: "*",
          next: "break",
        },
        {
          blankLine: "never",
          prev: "*",
          next: ["case", "default"],
        },
        {
          blankLine: "always",
          prev: "*",
          next: "throw",
        },
        {
          blankLine: "always",
          prev: "import",
          next: "*",
        },
        {
          blankLine: "any",
          prev: "import",
          next: "import",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "export",
        },
      ],
    },
  },

  // ============================================
  // 4. TYPESCRIPT CONFIGURATION
  // ============================================
  ...tsEslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts?(x)"],
  })),
  ...tsEslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.ts?(x)"],
  })),
  {
    files: ["**/*.ts?(x)"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "prefer-template": "error",
      "no-shadow": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/method-signature-style": "error",
      "@typescript-eslint/unified-signatures": "off",

      // ============================================
      // TYPE IMPORTS CONFIGURATION
      // ============================================
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",

      // ============================================
      // EXPLICIT TYPES
      // ============================================
      "@typescript-eslint/explicit-function-return-type": [
        "off", // Too strict for internal functions
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": [
        "warn",
        {
          allowArgumentsExplicitlyTypedAsAny: true,
        },
      ],

      // ============================================
      // NAMING CONVENTIONS
      // ============================================
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "^I[A-Z]",
            match: false,
          },
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        {
          selector: "enum",
          format: ["PascalCase"],
        },
      ],

      // ============================================
      // OTHER TYPESCRIPT RULES
      // ============================================
      "@typescript-eslint/no-empty-function": [
        "warn",
        {
          allow: ["arrowFunctions"],
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
        },
      ],
      "@typescript-eslint/no-useless-default-assignment": "warn",
    },
  },

  // ============================================
  // 5. IMPORT PLUGIN CONFIGURATION
  // ============================================
  {
    plugins: {
      // eslint-plugin-import-x: maintained fork of eslint-plugin-import with ESLint 10 support
      "import-x": importX,
    },
    settings: {
      // Graph-building rules (no-cycle, no-named-as-default-member, export, …) silently
      // no-op without these three: import-x defaults valid extensions to
      // ['.js','.mjs','.cjs'], so every `.ts` import target failed the extension check
      // and no module graph was ever built. Verbatim from importX.flatConfigs.typescript.
      "import-x/extensions": [
        ".ts",
        ".tsx",
        ".cts",
        ".mts",
        ".js",
        ".jsx",
        ".cjs",
        ".mjs",
      ],
      "import-x/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx", ".cts", ".mts"],
      },
      "import-x/external-module-folders": [
        "node_modules",
        "node_modules/@types",
      ],
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        }),
      ],
    },
    rules: {
      ...importX.flatConfigs.recommended.rules,
      ...importX.flatConfigs.typescript.rules,
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "type",
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          // Exclude type imports from pathGroups processing
          // This makes all types go to the "type" group, but sorted alphabetically
          // Result: @/ types come before external types (like 'react')
          pathGroupsExcludedImportTypes: ["builtin", "type"],
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
          "newlines-between": "always",
        },
      ],
      "import-x/no-nodejs-modules": "off",
      "import-x/no-commonjs": "error",
      "import-x/no-unresolved": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": ["error", { maxDepth: 3 }],
      "import-x/no-self-import": "error",
      "import-x/no-useless-path-segments": "error",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-default-export": "warn",
    },
  },

  // ============================================
  // 6. JSDOC CONFIGURATION (for public APIs)
  // ============================================
  {
    files: [
      "src/**/*.ts?(x)",
      "!src/**/*.test.ts?(x)",
      "!src/**/*.spec.ts?(x)",
    ],
    plugins: {
      jsdoc: jsdocPlugin,
    },
    settings: {
      jsdoc: {
        mode: "typescript",
        tagNamePreference: {
          returns: "returns",
          // Prefer @template over @typeParam (new in v61.5.0)
          typeParam: "template",
        },
      },
    },
    rules: {
      "jsdoc/require-description": "off",
      "jsdoc/require-param-description": "warn",
      "jsdoc/require-returns-description": "warn",
      "jsdoc/check-alignment": "warn",
      "jsdoc/check-param-names": "error",
      "jsdoc/check-tag-names": [
        "error",
        {
          definedTags: ["security", "fires", "remarks", "packageDocumentation"],
        },
      ],
      "jsdoc/check-types": "off",
      "jsdoc/require-hyphen-before-param-description": "warn",
      "jsdoc/tag-lines": ["warn", "any", { startLines: 1 }],
      "jsdoc/no-bad-blocks": "error",
      "jsdoc/no-defaults": "warn",
    },
  },

  // ============================================
  // 7. UNICORN CONFIGURATION (Modern JS/TS patterns)
  // ============================================
  {
    files: ["**/*.ts?(x)"],
    plugins: {
      unicorn,
    },
    rules: {
      ...unicorn.configs.recommended.rules,
      // Disable too strict rules:
      "unicorn/name-replacements": "off",
      "unicorn/no-null": "off",
      "unicorn/prefer-top-level-await": "off",
      "unicorn/no-array-reduce": "warn",
      "unicorn/prefer-module": "off",
      "unicorn/prefer-node-protocol": "off",
      "unicorn/filename-case": "off",
      "unicorn/no-for-each": "off",
      "unicorn/prefer-spread": "warn",
      "unicorn/prefer-ternary": "warn",
      "unicorn/no-useless-undefined": [
        "warn",
        { checkArguments: false, checkArrowFunctionBody: false },
      ],
      "unicorn/no-typeof-undefined": "off",
      "unicorn/expiring-todo-comments": "off",
      "unicorn/no-array-sort": "off",
    },
  },

  // ============================================
  // 8. PROMISE CONFIGURATION
  // ============================================
  {
    files: ["**/*.ts?(x)"],
    plugins: {
      promise: promisePlugin,
    },
    rules: {
      ...promisePlugin.configs.recommended.rules,
      "promise/prefer-await-to-then": "off",
      "promise/prefer-await-to-callbacks": "off",
      "promise/always-return": "error",
      "promise/catch-or-return": "error",
      "promise/no-return-wrap": "error",
      "promise/no-nesting": "warn",
    },
  },

  // ============================================
  // 9. NO-ONLY-TESTS CONFIGURATION (CI/CD protection)
  // ============================================
  {
    files: ["**/tests/**/*.ts?(x)"],
    plugins: {
      "no-only-tests": noOnlyTests,
    },
    rules: {
      "no-only-tests/no-only-tests": "error",
    },
  },

  // ============================================
  // 10. PRETTIER CONFIGURATION
  // ============================================
  {
    files: ["**/*.ts?(x)"],
    plugins: {
      // @ts-expect-error - optional chaining may return undefined but type requires defined value
      prettier: eslintPluginPrettierRecommended.plugins?.prettier,
    },
    rules: {
      ...eslintPluginPrettierRecommended.rules,
      curly: "error",
      "prefer-arrow-callback": "error",
    },
  },

  // ============================================
  // 11. SONARJS CONFIGURATION
  // ============================================
  {
    files: ["**/*.ts?(x)"],
    plugins: {
      sonarjs: sonarjsPlugin,
    },
    rules: {
      // sonarjs 4.x types `configs` as optional and `recommended` as a union of config
      // shapes; at runtime it is a flat config object with `rules`
      .../** @type {{ recommended: import("eslint").Linter.Config }} */ (
        sonarjsPlugin.configs
      ).recommended.rules,
      "sonarjs/no-nested-functions": "off",
      "sonarjs/todo-tag": "off",
      "sonarjs/different-types-comparison": "off",
      "sonarjs/pseudo-random": "off",
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
    },
  },

  // ============================================
  // 12. SECURITY & REGEXP CONFIGURATION
  // ============================================
  {
    files: ["**/*.ts?(x)"],
    plugins: {
      security: securityPlugin,
      regexp: regexpPlugin,
    },
    rules: {
      // Security plugin rules
      ...securityPlugin.configs.recommended.rules,
      // Disable object-injection - TypeScript provides type safety for enum/array access
      "security/detect-object-injection": "off",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "error",

      // Regexp plugin rules
      ...regexpPlugin.configs.recommended.rules,
      "regexp/no-super-linear-backtracking": "error",
      "regexp/no-misleading-unicode-character": "error",
      "regexp/no-dupe-disjunctions": "error",
      "regexp/no-useless-assertions": "warn",
      "regexp/no-useless-flag": "error",
      "regexp/optimal-quantifier-concatenation": "warn",
      "regexp/prefer-d": "warn",
      "regexp/prefer-plus-quantifier": "warn",
      "regexp/prefer-question-quantifier": "warn",
      "regexp/prefer-star-quantifier": "warn",
    },
  },

  // ============================================
  // 12b. RULES NEW IN UNICORN 63–74 / SONARJS 4
  // Shipped src adopts the new recommended rules; the ones below are declined for the
  // stated reason. Tests keep the older surface (second block): modernizing test code
  // is churn with no shipped value. Must stay after sections 7 and 11 so these
  // overrides win over "recommended".
  // ============================================
  {
    files: ["**/*.ts?(x)"],
    rules: {
      // Naming opinion: would rename `pass` (the Vitest matcher-result contract name)
      // and other internal booleans — auto-renaming risks touching the API surface
      "unicorn/consistent-boolean-name": "off",
      // Number.isSafeInteger() rejects integers above 2^53 that Number.isInteger()
      // accepts — a behavior change, not a lint fix
      "unicorn/prefer-number-is-safe-integer": "off",
      // Module-level instance counter in ProfiledComponent is intentional
      "unicorn/no-top-level-assignment-in-function": "off",
      // The autofix relocates code across `/* v8 ignore … */` boundaries, silently
      // mis-targeting coverage annotations under the 100% gate
      "unicorn/prefer-early-return": "off",
      // Style only: `Number.NaN` / `Number.POSITIVE_INFINITY` stay as written
      "unicorn/prefer-global-number-constants": "off",
      // Conflicts with the project's single-line JSDoc convention; its autofix produces
      // malformed JSDoc (content line without the leading `*`)
      "unicorn/single-line-block-comment-style": "off",
    },
  },
  {
    // Non-shipped code: idiomatic test patterns (callback `push`, deeply nested
    // `expect()`, literal floats, loop style) where modernizing is pure churn
    files: ["**/tests/**/*.ts?(x)"],
    rules: {
      "unicorn/max-nested-calls": "off",
      "unicorn/no-return-array-push": "off",
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/no-global-object-property-assignment": "off",
      "unicorn/no-computed-property-existence-check": "off",
      "unicorn/no-declarations-before-early-exit": "off",
      "unicorn/no-useless-else": "off",
      "unicorn/no-useless-template-literals": "off",
      "unicorn/no-non-function-verb-prefix": "off",
      "unicorn/prefer-number-coercion": "off",
      "unicorn/prefer-object-define-properties": "off",
      "unicorn/prefer-continue": "off",
      "unicorn/consistent-conditional-object-spread": "off",
      // Tests use literal floats (3.14 ≠ Math.PI) intentionally
      "unicorn/prefer-math-constants": "off",
      // Opinionated: converting explicit it() blocks to it.each obscures failure sites
      "sonarjs/parameterized-tests": "off",
      // Intentional reach markers (`expect(true).toBe(true)`) in stress/property tests
      "sonarjs/no-trivial-assertions": "off",
    },
  },

  // ============================================
  // 13. VITEST CONFIGURATION (Test Files and Fixtures)
  // ============================================
  {
    files: ["**/tests/**/*.test.ts?(x)"],
    plugins: {
      vitest: vitestPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "unicorn/no-array-sort": "off",
      // Disable non-literal regexp check for tests (intentional dynamic patterns)
      "security/detect-non-literal-regexp": "off",
      ...vitestPlugin.configs.all.rules,
      "vitest/require-to-throw-message": "off",
      "vitest/prefer-lowercase-title": "off",
      "vitest/no-hooks": "off",
      "vitest/prefer-expect-assertions": "off",
      "vitest/max-expects": "off",
      "vitest/require-mock-type-parameters": "off",
      "vitest/prefer-called-with": "off",
      "vitest/prefer-to-be": "off",
      "vitest/prefer-describe-function-title": "off",
      "vitest/padding-around-expect-groups": "warn",
      "vitest/consistent-test-filename": "warn",
      "vitest/prefer-strict-equal": "error",
      "vitest/expect-expect": [
        "error",
        {
          assertFunctionNames: ["expect", "expectTypeOf", "expectType"],
        },
      ],
      // Disable some TypeScript rules for tests
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "sonarjs/no-commented-code": "warn",
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/function-return-type": "off",
      "sonarjs/different-types-comparison": "off",
      "sonarjs/no-unused-collection": "off",
      "unicorn/consistent-function-scoping": "off",
      "import-x/no-default-export": "off",
      "import-x/no-unresolved": "off",
      "prefer-const": "off",
      "prefer-rest-params": "off",
    },
  },

  {
    files: ["**/tests/**/*.properties.ts?(x)"],
    rules: {
      "unicorn/no-array-sort": "off",
      "sonarjs/cognitive-complexity": "off",
      // Disable some TypeScript rules for tests
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "sonarjs/no-commented-code": "warn",
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/function-return-type": "off",
      "sonarjs/different-types-comparison": "off",
      "sonarjs/no-unused-collection": "off",
      "unicorn/consistent-function-scoping": "off",
      "import-x/no-default-export": "off",
      "import-x/no-unresolved": "off",
      "prefer-const": "off",
      "prefer-rest-params": "off",
    },
  },

  {
    files: ["**/tests/**/*.bench.ts?(x)"],
    rules: {
      "unicorn/no-array-sort": "off",
      // Disable some TypeScript rules for benchmarks
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "sonarjs/no-commented-code": "off",
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/function-return-type": "off",
      "sonarjs/different-types-comparison": "off",
      "sonarjs/no-unused-collection": "off",
      "sonarjs/void-use": "off",
      "unicorn/consistent-function-scoping": "off",
      "import-x/no-default-export": "off",
      "import-x/no-unresolved": "off",
      "prefer-const": "off",
      "prefer-rest-params": "off",
    },
  },

  // ============================================
  // 14. STRESS TESTS (V8 internals, GC profiling, memory testing)
  // ============================================
  {
    files: ["**/tests/**/*.stress.ts?(x)"],
    rules: {
      // Allow unsafe TypeScript patterns for V8/Node.js internals
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      // Allow SonarJS patterns for stress testing
      "sonarjs/no-unused-collection": "off",
      "sonarjs/no-unused-vars": "off",
      "sonarjs/no-dead-store": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-commented-code": "off",
      "sonarjs/no-duplicate-string": "off",
      "sonarjs/function-return-type": "off",
      "sonarjs/different-types-comparison": "off",
      "sonarjs/void-use": "off",
      // Allow Unicorn patterns for stress testing
      "unicorn/no-array-reduce": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-array-sort": "off",
      // Allow other patterns
      "import-x/no-default-export": "off",
      "import-x/no-unresolved": "off",
      "prefer-const": "off",
      "prefer-rest-params": "off",
    },
  },

  // ============================================
  // 15. CONFIG FILES (allow Node.js modules and defaults)
  // ============================================
  {
    // `*.config.mts` does not match vitest.config.common.mts and its siblings:
    // those end in `.common.mts`, `.unit.mts`, `.bench.mts` and so on, so five
    // configs were linted by nothing at all. Match every .mts instead —
    // examples/ and .stryker-tmp/ are already excluded by the global ignores.
    files: ["**/*.config.{js,ts,mjs,mts}", "**/*.mts", "**/vitest.setup.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "import-x/no-default-export": "off",
      // Default imports are the documented flat-config entry points of these plugins
      // (typescript-eslint, sonarjs, regexp) — the member caution is noise here
      "import-x/no-named-as-default-member": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "unicorn/prefer-module": "off",
    },
  },

  // ============================================
  // 16. MAINTENANCE SCRIPTS (Node CLIs, not config files)
  // ============================================
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
);
