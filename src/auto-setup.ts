import { afterAll, afterEach } from "vitest";

import { registry } from "./registry";

// Stryker disable all
/**
 * Automatically registers cleanup hooks when imported
 * This ensures test isolation without manual intervention
 *
 * afterEach: Clears render data (keeps components for reuse in describe() blocks)
 * afterAll: Completely resets registry (prevents memory accumulation in stress tests)
 *
 * No need for manual clearCounters() calls or cleanup hooks
 */
try {
  /* v8 ignore next 5 -- @preserve */
  if (typeof afterEach === "function") {
    afterEach(() => {
      registry.clearAll();
    });
  }
  /* v8 ignore next 3 -- @preserve */
} catch {
  // Silently ignore if not in test context
}

try {
  /* v8 ignore next 5 -- @preserve */
  if (typeof afterAll === "function") {
    afterAll(() => {
      registry.reset();
    });
  }
  /* v8 ignore next 3 -- @preserve */
} catch {
  // Silently ignore if not in test context
}
