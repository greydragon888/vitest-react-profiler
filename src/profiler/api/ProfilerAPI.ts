import type { ProfilerStorage } from "../core/ProfilerStorage";
import type {
  AnyComponentType,
  PhaseType,
  ProfiledComponent,
} from "@/types.ts";
import type { ComponentType } from "react";

// Frozen empty array to return when no data exists
const EMPTY_FROZEN_ARRAY = Object.freeze<PhaseType[]>([]);

/**
 * Creates public API methods for ProfiledComponent
 *
 * Responsibilities:
 * - Creating methods getRenderCount, getRenderHistory, etc.
 * - Accessing data through ProfilerStorage
 * - Handling cases when data doesn't exist
 */
export class ProfilerAPI {
  private readonly storage: ProfilerStorage;

  constructor(storage: ProfilerStorage) {
    this.storage = storage;
  }

  /**
   * Create getRenderCount method for component
   */
  createGetRenderCount(component: AnyComponentType): () => number {
    return () => {
      const data = this.storage.get(component);

      return data?.getRenderCount() ?? 0;
    };
  }

  /**
   * Create getRenderHistory method for component
   */
  createGetRenderHistory(
    component: AnyComponentType,
  ): () => readonly PhaseType[] {
    return () => {
      const data = this.storage.get(component);

      return data?.getHistory() ?? EMPTY_FROZEN_ARRAY;
    };
  }

  /**
   * Create getLastRender method for component
   */
  createGetLastRender(
    component: AnyComponentType,
  ): () => PhaseType | undefined {
    return () => {
      const data = this.storage.get(component);

      return data?.getLastRender();
    };
  }

  /**
   * Create getRenderAt method for component
   */
  createGetRenderAt(
    component: AnyComponentType,
  ): (index: number) => PhaseType | undefined {
    return (index: number) => {
      const data = this.storage.get(component);

      return data?.getRenderAt(index);
    };
  }

  /**
   * Create getRendersByPhase method for component
   */
  createGetRendersByPhase(
    component: AnyComponentType,
  ): (phase: PhaseType) => readonly PhaseType[] {
    return (phase: PhaseType) => {
      const data = this.storage.get(component);

      return data?.getRendersByPhase(phase) ?? EMPTY_FROZEN_ARRAY;
    };
  }

  /**
   * Create hasMounted method for component
   */
  createHasMounted(component: AnyComponentType): () => boolean {
    return () => {
      const data = this.storage.get(component);

      return data?.hasMounted() ?? false;
    };
  }

  /**
   * Create all API methods for component
   */
  createAllMethods<P>(
    component: ComponentType<P>,
  ): Pick<
    ProfiledComponent<P>,
    | "getRenderCount"
    | "getRenderHistory"
    | "getLastRender"
    | "getRenderAt"
    | "getRendersByPhase"
    | "hasMounted"
  > {
    return {
      getRenderCount: this.createGetRenderCount(component),
      getRenderHistory: this.createGetRenderHistory(component),
      getLastRender: this.createGetLastRender(component),
      getRenderAt: this.createGetRenderAt(component),
      getRendersByPhase: this.createGetRendersByPhase(component),
      hasMounted: this.createHasMounted(component),
    };
  }
}
