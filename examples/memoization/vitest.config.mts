import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
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
