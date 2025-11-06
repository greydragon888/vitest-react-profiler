import { ProfilerData } from "./ProfilerData";

import type { AnyComponentType } from "@/types";

/**
 * Type-safe storage for profiler data
 *
 * Uses WeakMap for automatic garbage collection
 * and data isolation between components
 */
export class ProfilerStorage {
  private readonly storage: WeakMap<AnyComponentType, ProfilerData>;

  constructor() {
    this.storage = new WeakMap();
  }

  /**
   * Get component data
   */
  get(component: AnyComponentType): ProfilerData | undefined {
    return this.storage.get(component);
  }

  /**
   * Set component data
   */
  set(component: AnyComponentType, data: ProfilerData): void {
    this.storage.set(component, data);
  }

  /**
   * Check if data exists
   */
  has(component: AnyComponentType): boolean {
    return this.storage.has(component);
  }

  /**
   * Get or create component data
   */
  getOrCreate(component: AnyComponentType): ProfilerData {
    let data = this.get(component);

    if (data === undefined) {
      data = new ProfilerData();
      this.set(component, data);
    }

    return data;
  }
}
