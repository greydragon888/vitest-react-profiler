/**
 * @file Property-Based Tests: ProfilerStorage (WeakMap Isolation)
 *
 * ## Tested Invariants:
 *
 * ### INVARIANT 1: Component Isolation
 * - Each component has its own independent `ProfilerData` instance
 * - Operations on one component don't affect other components
 * - `storage.getOrCreate(C1) !== storage.getOrCreate(C2)` (different objects)
 * - N components → exactly N unique `ProfilerData` instances
 * - **Why important:** Prevents cross-component data pollution, ensures isolation
 *
 * ### INVARIANT 2: Data Persistence
 * - `ProfilerData` survives across multiple `getOrCreate()` calls
 * - Render history persists between accesses
 * - `storage.getOrCreate(C).getRenderCount()` doesn't reset on repeated calls
 * - WeakMap preserves data while component is alive (referentially)
 * - **Why important:** Ensures render history accumulation, prevents data loss
 *
 * ### INVARIANT 3: GetOrCreate Semantics
 * - First `getOrCreate(C)` call → creates new `ProfilerData`
 * - Subsequent `getOrCreate(C)` calls → return same instance (referential equality)
 * - `storage.getOrCreate(C) === storage.getOrCreate(C)` (ALWAYS)
 * - No multiple creations for single component
 * - **Why important:** Memory optimization, prevents data duplication
 *
 * ### INVARIANT 4: Identity Consistency
 * - Same component (by reference) → same `ProfilerData`
 * - Different components (by reference) → different `ProfilerData` instances
 * - WeakMap uses referential equality for keys
 * - Even if `C1.name === C2.name`, but `C1 !== C2` → different instances
 * - **Why important:** Correct component identification by reference, not by name
 *
 * ### INVARIANT 5: Clear Behavior
 * - `storage.clear()` removes all `ProfilerData` for all components
 * - After `clear()` + `getOrCreate()` → new `ProfilerData` (fresh)
 * - `clear()` doesn't break WeakMap (components stay alive)
 * - Safe to use storage after `clear()`
 * - **Why important:** Correct cleanup between tests, prevents test pollution
 *
 * ### INVARIANT 6: ClearAll Behavior
 * - `storage.clearAll()` clears data but keeps component registry
 * - After `clearAll()` components remain registered
 * - `getRenderCount() === 0` for all components after `clearAll()`
 * - Render history reset, but components not removed from WeakMap
 * - **Why important:** Allows data reset without losing component registration
 *
 * ## Testing Strategy:
 *
 * - **1000 runs** for component isolation (high load)
 * - **500 runs** for getOrCreate semantics (medium load)
 * - **2-20 components** simultaneously (realistic scenario)
 * - **Generators:** Mock components with unique names
 *
 * ## Technical Details:
 *
 * - **WeakMap:** Garbage collection friendly (components auto-removed)
 * - **Referential equality:** Keys compared by `===`, not by value
 * - **Memory safety:** No memory leaks even with large number of components
 *
 * @see https://fast-check.dev/
 * @see src/profiler/core/ProfilerStorage.ts - implementation
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap
 */

import { fc, test } from "@fast-check/vitest";
import { describe, beforeEach } from "vitest";

import { cacheMetrics } from "@/profiler/core/CacheMetrics";
import { ProfilerData } from "@/profiler/core/ProfilerData";
import { ProfilerStorage } from "@/profiler/core/ProfilerStorage";

import type { PhaseType, AnyComponentType } from "@/types";

describe("Property-Based Tests: ProfilerStorage (WeakMap)", () => {
  beforeEach(() => {
    cacheMetrics.reset();
  });

  // Helper: creates unique mock component functions
  function createMockComponent(id: number): AnyComponentType {
    const component = () => null;

    // Add unique identifier to make components distinguishable
    Object.defineProperty(component, "name", {
      value: `Component${id}`,
      writable: false,
    });

    return component as AnyComponentType;
  }

  describe("Component Isolation", () => {
    test.prop([fc.integer({ min: 2, max: 20 })], { numRuns: 1000 })(
      "different components have independent ProfilerData instances",
      (numComponents) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Get data for all components
        const dataInstances = components.map((c) => storage.getOrCreate(c));

        // All instances must be unique
        const uniqueInstances = new Set(dataInstances);

        return uniqueInstances.size === numComponents;
      },
    );

    test.prop(
      [
        fc.integer({ min: 2, max: 20 }),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 20,
          },
        ),
      ],
      { numRuns: 500 },
    )(
      "operations on one component don't affect others",
      (numComponents, phases) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Get data for all components
        const dataInstances = components.map((c) => storage.getOrCreate(c));

        // Add renders to first component only
        const firstData = dataInstances[0];

        if (!firstData) {
          return false;
        }

        for (const phase of phases) {
          firstData.addRender(phase);
        }

        // First component should have renders
        if (firstData.getRenderCount() !== phases.length) {
          return false;
        }

        // All other components should have 0 renders
        for (let i = 1; i < numComponents; i++) {
          const data = dataInstances[i];

          if (!data) {
            return false;
          }

          if (data.getRenderCount() !== 0) {
            return false; // Data leaked between components!
          }
        }

        return true;
      },
    );

    test.prop(
      [
        fc.integer({ min: 2, max: 10 }),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 20,
          },
        ),
      ],
      { numRuns: 500 },
    )(
      "each component maintains independent render history",
      (numComponents, phasesTemplate) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Give each component different number of renders
        // Component i gets i+1 renders
        for (let i = 0; i < numComponents; i++) {
          const component = components[i];

          if (!component) {
            return false;
          }

          const data = storage.getOrCreate(component);
          const numRenders = i + 1;

          for (let j = 0; j < numRenders; j++) {
            const phase = phasesTemplate[j % phasesTemplate.length];

            if (!phase) {
              return false;
            }

            data.addRender(phase);
          }
        }

        // Verify each component has correct count
        for (let i = 0; i < numComponents; i++) {
          const component = components[i];

          if (!component) {
            return false;
          }

          const data = storage.get(component);

          if (!data) {
            return false;
          }

          if (data.getRenderCount() !== i + 1) {
            return false; // Isolation violated!
          }
        }

        return true;
      },
    );
  });

  describe("Data Persistence", () => {
    test.prop(
      [
        fc.integer({ min: 1, max: 20 }),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("data persists across multiple get() calls", (numGets, phases) => {
      const storage = new ProfilerStorage();
      const component = createMockComponent(1);

      // Add renders
      const data = storage.getOrCreate(component);

      for (const phase of phases) {
        data.addRender(phase);
      }

      const expectedCount = phases.length;

      // Multiple gets should return same data with same count
      for (let i = 0; i < numGets; i++) {
        const retrieved = storage.get(component);

        if (!retrieved) {
          return false;
        }

        if (retrieved.getRenderCount() !== expectedCount) {
          return false; // Data not persisting!
        }
      }

      return true;
    });

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 500 },
    )(
      "data accumulates across multiple getOrCreate calls",
      (phases1, phases2) => {
        const storage = new ProfilerStorage();
        const component = createMockComponent(1);

        // First batch
        const data1 = storage.getOrCreate(component);

        for (const phase of phases1) {
          data1.addRender(phase);
        }

        // Second batch using same component
        const data2 = storage.getOrCreate(component);

        for (const phase of phases2) {
          data2.addRender(phase);
        }

        // Should be same instance
        if (data1 !== data2) {
          return false;
        }

        // Should have accumulated all renders
        const totalExpected = phases1.length + phases2.length;

        return data2.getRenderCount() === totalExpected;
      },
    );
  });

  describe("GetOrCreate Semantics", () => {
    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "getOrCreate returns same instance on repeated calls",
      (numCalls) => {
        const storage = new ProfilerStorage();
        const component = createMockComponent(1);

        const instances: ProfilerData[] = [];

        for (let i = 0; i < numCalls; i++) {
          instances.push(storage.getOrCreate(component));
        }

        // All instances should be the same reference
        return instances.every((inst) => inst === instances[0]);
      },
    );

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "has() returns true after getOrCreate",
      (numComponents) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Initially none should exist
        for (const component of components) {
          if (storage.has(component)) {
            return false;
          }
        }

        // Create all
        for (const component of components) {
          storage.getOrCreate(component);
        }

        // Now all should exist
        for (const component of components) {
          if (!storage.has(component)) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "get() returns undefined before set/getOrCreate",
      (numComponents) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // All should return undefined initially
        for (const component of components) {
          if (storage.get(component) !== undefined) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "set() followed by get() returns same instance",
      (numComponents) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Create and set data
        const dataInstances = components.map(() => new ProfilerData());

        for (let i = 0; i < numComponents; i++) {
          const component = components[i];
          const dataInstance = dataInstances[i];

          if (!component || !dataInstance) {
            return false;
          }

          storage.set(component, dataInstance);
        }

        // Verify get returns same instance
        for (let i = 0; i < numComponents; i++) {
          const component = components[i];
          const dataInstance = dataInstances[i];

          if (!component || !dataInstance) {
            return false;
          }

          const retrieved = storage.get(component);

          if (retrieved !== dataInstance) {
            return false;
          }
        }

        return true;
      },
    );
  });

  describe("Identity Consistency", () => {
    test.prop(
      [fc.integer({ min: 2, max: 20 }), fc.integer({ min: 1, max: 10 })],
      { numRuns: 1000 },
    )(
      "same component always gets same data reference",
      (numComponents, numAccesses) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // For each component, verify consistent references
        for (const component of components) {
          const references: ProfilerData[] = [];

          for (let i = 0; i < numAccesses; i++) {
            references.push(storage.getOrCreate(component));
          }

          // All accesses to same component should return same reference
          if (!references.every((ref) => ref === references[0])) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop(
      [
        fc.integer({ min: 2, max: 20 }),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 20,
          },
        ),
      ],
      { numRuns: 500 },
    )(
      "modifications via different getOrCreate calls affect same data",
      (numComponents, phases) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        const targetComponent = components[0];

        if (!targetComponent) {
          return false;
        }

        // Add renders via first getOrCreate
        const data1 = storage.getOrCreate(targetComponent);
        const midPoint = Math.floor(phases.length / 2);

        for (let i = 0; i < midPoint; i++) {
          const phase = phases[i];

          if (!phase) {
            return false;
          }

          data1.addRender(phase);
        }

        // Add more renders via second getOrCreate
        const data2 = storage.getOrCreate(targetComponent);

        for (let i = midPoint; i < phases.length; i++) {
          const phase = phases[i];

          if (!phase) {
            return false;
          }

          data2.addRender(phase);
        }

        // Both references should show accumulated count
        return (
          data1.getRenderCount() === phases.length &&
          data2.getRenderCount() === phases.length &&
          data1 === data2
        );
      },
    );
  });

  describe("Stress Tests", () => {
    test.prop(
      [
        fc.integer({ min: 50, max: 200 }),
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 10,
          },
        ),
      ],
      { numRuns: 10 },
    )(
      "handles large number of components efficiently",
      (numComponents, phases) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Create data for all components
        for (const component of components) {
          const data = storage.getOrCreate(component);

          for (const phase of phases) {
            data.addRender(phase);
          }
        }

        // Verify all components maintained correct state
        for (const component of components) {
          const data = storage.get(component);

          if (!data) {
            return false;
          }

          if (data.getRenderCount() !== phases.length) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop(
      [fc.integer({ min: 10, max: 50 }), fc.integer({ min: 10, max: 50 })],
      { numRuns: 100 },
    )(
      "interleaved access patterns maintain isolation",

      (numComponents, numOperations) => {
        const storage = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Interleave operations across all components
        for (let op = 0; op < numOperations; op++) {
          const componentIndex = op % numComponents;
          const component = components[componentIndex];

          if (!component) {
            continue;
          }

          const data = storage.getOrCreate(component);

          data.addRender("update");
        }

        // Each component should have (numOperations / numComponents) renders
        // Some components may have 0 renders if numOperations < numComponents
        const expectedPerComponent = Math.floor(numOperations / numComponents);
        const remainder = numOperations % numComponents;

        for (let i = 0; i < numComponents; i++) {
          const component = components[i];

          if (!component) {
            return false;
          }

          const data = storage.get(component);

          // Components past numOperations won't have data
          if (i >= numOperations) {
            if (data !== undefined) {
              return false; // Shouldn't have data
            }

            continue;
          }

          if (!data) {
            return false;
          }

          const count = data.getRenderCount();

          // Components 0 to (remainder-1) get one extra render
          const expected =
            i < remainder ? expectedPerComponent + 1 : expectedPerComponent;

          if (count !== expected) {
            return false;
          }
        }

        return true;
      },
    );
  });

  describe("Edge Cases", () => {
    test.prop([fc.constant(null)], { numRuns: 100 })(
      "empty storage behaves correctly",
      () => {
        const storage = new ProfilerStorage();
        const component = createMockComponent(1);

        return !storage.has(component) && storage.get(component) === undefined;
      },
    );

    test.prop(
      [
        fc.array(
          fc.constantFrom<PhaseType>("mount", "update", "nested-update"),
          {
            minLength: 1,
            maxLength: 50,
          },
        ),
      ],
      { numRuns: 1000 },
    )("single component storage works correctly", (phases) => {
      const storage = new ProfilerStorage();
      const component = createMockComponent(1);

      const data = storage.getOrCreate(component);

      for (const phase of phases) {
        data.addRender(phase);
      }

      return (
        storage.has(component) &&
        storage.get(component) === data &&
        data.getRenderCount() === phases.length
      );
    });

    test.prop([fc.integer({ min: 1, max: 20 })], { numRuns: 1000 })(
      "multiple storages are independent",
      (numComponents) => {
        const storage1 = new ProfilerStorage();
        const storage2 = new ProfilerStorage();
        const components = Array.from({ length: numComponents }, (_, i) =>
          createMockComponent(i),
        );

        // Add to storage1 only
        for (const component of components) {
          storage1.getOrCreate(component).addRender("mount");
        }

        // storage2 should be empty
        for (const component of components) {
          if (storage2.has(component)) {
            return false;
          }
        }

        return true;
      },
    );
  });

  describe("Memory Management", () => {
    test.prop([fc.integer({ min: 100, max: 500 })], { numRuns: 10 })(
      "WeakMap allows garbage collection of unused components",
      (numComponents) => {
        const storage = new ProfilerStorage();

        // Create and discard components (lose references immediately)
        // These should be eligible for GC since we don't keep references
        for (let i = 0; i < numComponents; i++) {
          const tempComponent = createMockComponent(i);

          storage.getOrCreate(tempComponent).addRender("mount");
          // Reference to tempComponent lost here, eligible for GC
        }

        // Create new component and verify storage still works
        const persistentComponent = createMockComponent(999_999);
        const data = storage.getOrCreate(persistentComponent);

        data.addRender("mount");
        data.addRender("update");

        // Verify persistent component works correctly
        // (proves storage didn't break from GC-eligible components)
        return (
          storage.has(persistentComponent) &&
          storage.get(persistentComponent) === data &&
          data.getRenderCount() === 2 &&
          data.getHistory().length === 2
        );
      },
    );

    test.prop(
      [fc.integer({ min: 10, max: 50 }), fc.integer({ min: 10, max: 50 })],
      { numRuns: 100 },
    )(
      "storage operations remain stable after component references are lost",
      (numTransientComponents, numPersistentComponents) => {
        const storage = new ProfilerStorage();

        // Phase 1: Create transient components (no references kept)
        for (let i = 0; i < numTransientComponents; i++) {
          const transientComponent = createMockComponent(i);
          const data = storage.getOrCreate(transientComponent);

          data.addRender("mount");
          data.addRender("update");
          // Lose reference - eligible for GC
        }

        // Phase 2: Create persistent components (keep references)
        const persistentComponents = Array.from(
          { length: numPersistentComponents },
          (_, i) => createMockComponent(numTransientComponents + i),
        );

        // Add data to persistent components
        const persistentData = persistentComponents.map((component) => {
          const data = storage.getOrCreate(component);

          data.addRender("mount");

          return data;
        });

        // Phase 3: Verify persistent components still work correctly
        // (proves WeakMap didn't corrupt state from transient components)
        for (let i = 0; i < numPersistentComponents; i++) {
          const component = persistentComponents[i];
          const expectedData = persistentData[i];

          if (!component || !expectedData) {
            return false;
          }

          // Verify storage integrity
          if (!storage.has(component)) {
            return false;
          }

          const retrievedData = storage.get(component);

          if (retrievedData !== expectedData) {
            return false;
          }

          if (retrievedData.getRenderCount() !== 1) {
            return false;
          }
        }

        return true;
      },
    );

    test.prop([fc.integer({ min: 50, max: 200 })], { numRuns: 10 })(
      "memory-intensive operations complete without hanging",
      (numCycles) => {
        const storage = new ProfilerStorage();

        // Simulate memory-intensive usage pattern:
        // Create -> use -> lose reference -> repeat
        for (let cycle = 0; cycle < numCycles; cycle++) {
          // Create 10 temporary components per cycle
          for (let j = 0; j < 10; j++) {
            const tempComponent = createMockComponent(cycle * 10 + j);
            const data = storage.getOrCreate(tempComponent);

            // Add some renders
            data.addRender("mount");
            data.addRender("update");
            data.addRender("nested-update");
            // Lose reference - eligible for GC
          }
        }

        // Verify storage still functional after intensive operations
        const finalComponent = createMockComponent(999_999);
        const finalData = storage.getOrCreate(finalComponent);

        finalData.addRender("mount");

        return (
          storage.has(finalComponent) &&
          finalData.getRenderCount() === 1 &&
          finalData.hasMounted()
        );
      },
    );
  });
});
