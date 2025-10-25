// @ts-check

/** @type {import("eslint").Linter.FlatConfig[]} */

import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tsEslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import vitestPlugin from "@vitest/eslint-plugin";

export default tsEslint.config(
  {
    ignores: [
      "dist/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "examples/**",
      "*.config.mjs",
      "*.config.mts",
      "*.config.js",
      "*.config.ts",
      "**/*.config.mts",
      "**/*.config.mjs",
      "**/*.config.js",
      "**/*.config.ts",
      "*.cjs",
      "*.mjs",
      "*.mts",
    ],
  },
  eslint.configs.recommended,
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
  tsEslint.configs.strictTypeChecked,
  tsEslint.configs.stylisticTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "prefer-template": "error",
      "no-shadow": "off",
      "@typescript-eslint/no-dynamic-delete": "off",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/method-signature-style": "error",
      // "@typescript-eslint/consistent-type-assertions": [
      //   "error",
      //   { assertionStyle: "angle-bracket" },
      // ],

      "@typescript-eslint/unified-signatures": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
        },
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
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
      "sonarjs/no-commented-code": "warn",
      "sonarjs/function-return-type": "off",
      "sonarjs/different-types-comparison": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      prettier: eslintPluginPrettierRecommended.plugins?.prettier,
    },
    rules: {
      ...eslintPluginPrettierRecommended.rules,
      curly: "error",
      "prefer-arrow-callback": "error",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      sonarjs: sonarjsPlugin,
    },
    rules: {
      ...sonarjsPlugin.configs.recommended.rules,
      "sonarjs/no-nested-functions": "off",
      "sonarjs/todo-tag": "off",
      "sonarjs/different-types-comparison": "off",
      "sonarjs/pseudo-random": "off",
    },
  },
  {
    files: [
      "**/tests/**/*.ts",
      "**/tests/**/*.tsx",
      "**/benchmarks/*.ts",
      "**/benchmarks/*.tsx",
    ],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
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
    },
  },
);
