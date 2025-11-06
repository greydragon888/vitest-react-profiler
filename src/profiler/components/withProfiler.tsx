import { createOnRenderCallback } from "@/profiler/components/createOnRenderCallback";
import { registry } from "@/registry";

import { ProfiledComponentWrapper } from "./ProfiledComponent";
import { ProfilerAPI } from "../api/ProfilerAPI";
import { ProfilerStorage } from "../core/ProfilerStorage";

import type { ProfiledComponentType } from "@/types";
import type { ComponentType, ReactElement } from "react";

// Global singletons - single instance for entire application
const globalStorage = new ProfilerStorage();
const globalAPI = new ProfilerAPI(globalStorage);

/**
 * Wraps a React component with profiling capabilities for testing
 *
 * @param Component - The component to profile
 * @param displayName - Optional custom display name for debugging
 * @returns A wrapped component with profiling API
 */
export function withProfiler<P extends object>(
  Component: ComponentType<P>,
  displayName?: string,
): ProfiledComponentType<P> {
  // Step 1: Determine component name
  const componentName =
    displayName ?? Component.displayName ?? (Component.name || "Component");

  // Step 2: Create onRender callback (will initialize storage via getOrCreate)
  const onRender = createOnRenderCallback(Component, globalStorage);

  // Step 3: Create wrapper component
  const ProfiledComponentFunc = (props: P): ReactElement => {
    return (
      <ProfiledComponentWrapper
        Component={Component}
        componentProps={props}
        componentName={componentName}
        onRender={onRender}
      />
    );
  };

  // Cast to ProfiledComponent type
  const ProfiledComp = ProfiledComponentFunc as ProfiledComponentType<P>;

  // Step 4: Set displayName
  ProfiledComp.displayName = `withProfiler(${componentName})`;

  // Step 5: Add OriginalComponent reference (hidden from enumeration)
  Object.defineProperty(ProfiledComp, "OriginalComponent", {
    value: Component,
    writable: false,
    enumerable: false,
    configurable: false,
  });

  // Step 6: Attach API methods
  const apiMethods = globalAPI.createAllMethods(Component);

  Object.assign(ProfiledComp, apiMethods);

  // Step 7: Register for cleanup
  const clearInternal = () => {
    const data = globalStorage.get(Component);

    data?.clear();
  };

  registry.register({ clear: clearInternal });

  // Step 8: Return wrapped component with full API
  return ProfiledComp;
}
