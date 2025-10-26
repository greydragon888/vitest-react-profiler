import { afterEach } from "vitest";
import { registry } from "./registry";

/**
 * Automatically registers cleanup hook when imported
 * This ensures test isolation without manual intervention
 *
 * All profiled components are automatically cleared between tests
 * No need for manual clearCounters() calls or afterEach hooks
 */
if (typeof afterEach === "function") {
  afterEach(() => {
    registry.clearAll();
  });
}
