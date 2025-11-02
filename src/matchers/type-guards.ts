import type { ProfiledComponent } from "../types";

/**
 * Type guard to validate that a value is a profiled component
 */
export function isProfiledComponent(
  received: unknown,
): received is ProfiledComponent<unknown> {
  return (
    received !== null &&
    typeof received === "function" &&
    "getRenderCount" in received &&
    "getRenderHistory" in received &&
    "getLastRender" in received
  );
}
