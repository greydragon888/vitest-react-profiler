import { afterEach } from "vitest";

import { registry } from "./registry";

/**
 * Automatically registers cleanup hook when imported
 * This ensures test isolation without manual intervention
 *
 * All profiled components are automatically cleared between tests
 * No need for manual clearCounters() calls or afterEach hooks
 */
try {
  if (typeof afterEach === "function") {
    afterEach(() => {
      registry.clearAll();
    });
  }
  /* c8 ignore next 3 */
} catch {
  // Silently ignore if not in test context
}
