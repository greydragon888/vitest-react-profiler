import React, { Profiler, useRef } from "react";

import type { ComponentType, ProfilerOnRenderCallback } from "react";

interface ProfiledComponentProps<P> {
  Component: ComponentType<P>;
  componentProps: P;
  componentName: string;
  onRender: ProfilerOnRenderCallback;
}

// Global counter for generating unique IDs across all instances
let globalInstanceCounter = 0;

/**
 * React component with built-in Profiler
 *
 * Responsibilities:
 * - Wrapping component in <Profiler>
 * - Generating unique ID for each instance
 * - Passing onRender callback
 */
export function ProfiledComponentWrapper<P extends object>(
  props: Readonly<ProfiledComponentProps<P>>,
): React.ReactElement {
  const { Component, componentProps, componentName, onRender } = props;

  // Stable ID for this component instance
  const idRef = useRef<string>("");

  // Generate ID on first render
  if (!idRef.current) {
    globalInstanceCounter += 1;
    idRef.current = `${componentName}-${globalInstanceCounter}`;
  }

  return (
    <Profiler id={idRef.current} onRender={onRender}>
      <Component {...componentProps} />
    </Profiler>
  );
}
