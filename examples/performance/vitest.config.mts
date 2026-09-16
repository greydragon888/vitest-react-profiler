import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "../../src"),
      "vitest-react-profiler": path.resolve(
        import.meta.dirname,
        "../../src/index.ts",
      ),
    },
  },

  define: {
    __DEV__: true,
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./setup.ts"],
    globals: true,
  },
});
