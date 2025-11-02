import type { ProfilerStorage } from "@/profiler/core/ProfilerStorage.ts";
import type { AnyComponentType } from "@/types.ts";
import type { ProfilerOnRenderCallback } from "react";

/**
 * Create onRender callback for component
 *
 * Captures render phase from React Profiler and stores it directly
 */
export function createOnRenderCallback(
  component: AnyComponentType,
  storage: ProfilerStorage,
): ProfilerOnRenderCallback {
  return (_id, phase) => {
    const data = storage.getOrCreate(component);

    data.addRender(phase);
  };
}
