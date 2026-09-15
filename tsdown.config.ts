import { defineConfig } from "tsdown";

export default defineConfig({
  // Entry points - main library file
  entry: ["src/index.ts"],

  // Output formats: dist/index.js (ESM, package is "type": "module") + dist/index.cjs
  format: ["esm", "cjs"],

  // Keep the published file names from package.json "exports" (index.js / index.cjs,
  // index.d.ts / index.d.cts). tsdown defaults `fixedExtension` to `platform === "node"`,
  // which would emit index.mjs instead.
  fixedExtension: false,

  // Generate .d.ts files (tsdown's dts plugin does not inject the `baseUrl` that
  // tsup's did, so no `ignoreDeprecations` workaround is needed under TypeScript 6)
  dts: true,

  // Sourcemaps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Minify output (oxc minifier)
  // No `keepNames`: it injects a `__name` runtime helper that rolldown splits into a
  // shared hashed chunk, which index.d.ts then imports. Runtime never reads our own
  // function names (only the consumer's `Component.name` / `hook.name`).
  minify: true,

  // Don't bundle anything from node_modules: React and Vitest are peer deps,
  // @testing-library/* are resolved from the consumer's test environment
  deps: {
    neverBundle: true,
  },

  // Target modern browsers and Node 18+
  target: "esnext",

  // Environment variables to replace
  env: {
    NODE_ENV: "production",
  },

  // Build-time constants for tree-shaking
  // Same pattern as vitest.config.common.mts
  define: {
    __DEV__: "false", // Production build - replaced with keyword false
  },

  // Output configuration
  outDir: "dist",

  // Generate banner with package info (JS output only, as before)
  banner: {
    js: `/*!
 * vitest-react-profiler v${process.env.npm_package_version ?? "0.0.0"}
 * (c) ${new Date().getFullYear()} ${process.env.npm_package_author_name ?? "Contributors"}
 * Released under the MIT License.
 */`,
  },

  // Success callback
  onSuccess: () => {
    console.log("✅ Build completed successfully!");
  },
});
