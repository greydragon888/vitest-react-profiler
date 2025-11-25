import { defineConfig } from "tsup";

export default defineConfig({
  // Entry points - main library file
  entry: ["src/index.ts"],

  // Output formats
  format: ["cjs", "esm"],

  // Generate .d.ts files
  dts: {
    resolve: true,
    // Entry point for types
    entry: "./src/index.ts",
  },

  // Split output into chunks for better tree-shaking
  splitting: false,

  // Sourcemaps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Minify output with Terser for aggressive optimization
  minify: "terser",
  terserOptions: {
    compress: {
      passes: 2, // Multiple passes for better optimization
      dead_code: true, // Remove unreachable code
      unused: true, // Remove unused functions/variables
      drop_console: false, // Keep console (we don't use it anyway)
      pure_funcs: [], // Will be inferred by terser
    },
    mangle: {
      keep_classnames: false, // Allow class name mangling
      keep_fnames: true, // Keep function names (already set in keepNames)
    },
  },

  // Bundle external dependencies
  // We keep React and Vitest as external since they're peer deps
  external: [
    "react",
    "react-dom",
    "vitest",
    "@testing-library/react",
    "@testing-library/jest-dom",
  ],

  // Don't bundle node modules
  noExternal: [],

  // Target modern browsers and Node 18+
  target: "es2022",

  // Enable tree-shaking
  treeshake: true,

  // Keep original function names for better debugging
  keepNames: true,

  // Skip node protocol imports
  skipNodeModulesBundle: true,

  // Environment variables to replace
  env: {
    NODE_ENV: "production",
  },

  // Build-time constants for tree-shaking
  define: {
    "import.meta.env.INTERNAL_TESTS": "false", // Disable internal metrics in production
    "import.meta.env.BENCHMARK_TESTS": "false", // Disable internal metrics in production
  },

  // Output configuration
  outDir: "dist",

  // Generate banner with package info
  banner: {
    js: `/**
 * vitest-react-profiler v${process.env.npm_package_version || "0.0.0"}
 * (c) ${new Date().getFullYear()} ${process.env.npm_package_author_name || "Contributors"}
 * Released under the MIT License.
 */`,
  },

  // Success callback
  onSuccess: async () => {
    console.log("✅ Build completed successfully!");
  },
});
