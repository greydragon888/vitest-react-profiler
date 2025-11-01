/**
 * Property-Based Tests for profileHook
 *
 * These tests verify that profileHook handles various prop types correctly:
 * - Primitive prop types (string, number, boolean, null, undefined)
 * - Complex prop types (objects, arrays, functions, symbols)
 * - Prop changes during rerender
 * - Hook stability invariants
 * - Type safety across different prop shapes
 *
 * @see https://fast-check.dev/
 */

import { fc, test } from "@fast-check/vitest";
import { cleanup } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, expectTypeOf } from "vitest";

import { profileHook } from "@/hooks";

describe("Property-Based Tests: profileHook Props Handling", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Primitive Prop Types", () => {
    test.prop(
      [
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
        ),
      ],
      { numRuns: 1000 },
    )(
      "profileHook accepts hooks with primitive prop types",
      (primitiveValue) => {
        interface Props {
          value: typeof primitiveValue;
        }

        const useTestHook = ({ value }: Props) => {
          return { doubled: typeof value === "number" ? value * 2 : value };
        };

        const { result, ProfiledHook } = profileHook(useTestHook, {
          value: primitiveValue,
        });

        // Should render exactly once
        expect(ProfiledHook.getRenderCount()).toBe(1);

        // Result should be stable
        expect(result.current).toBeDefined();

        return true;
      },
    );

    test.prop([fc.string(), fc.string()], { numRuns: 1000 })(
      "profileHook tracks rerenders when string props change",
      (value1, value2) => {
        interface Props {
          value: string;
        }

        const useTestHook = ({ value }: Props) => {
          return { length: value.length };
        };

        const { rerender, ProfiledHook } = profileHook(useTestHook, {
          value: value1,
        });

        expect(ProfiledHook.getRenderCount()).toBe(1);

        rerender({ value: value2 });

        expect(ProfiledHook.getRenderCount()).toBe(2);

        return true;
      },
    );

    test.prop([fc.integer(), fc.integer()], { numRuns: 1000 })(
      "profileHook tracks rerenders when number props change",
      (value1, value2) => {
        interface Props {
          value: number;
        }

        const useTestHook = ({ value }: Props) => {
          return { doubled: value * 2 };
        };

        const { rerender, ProfiledHook } = profileHook(useTestHook, {
          value: value1,
        });

        expect(ProfiledHook.getRenderCount()).toBe(1);

        rerender({ value: value2 });

        expect(ProfiledHook.getRenderCount()).toBe(2);

        return true;
      },
    );

    test.prop([fc.boolean(), fc.boolean()], { numRuns: 1000 })(
      "profileHook tracks rerenders when boolean props change",
      (value1, value2) => {
        interface Props {
          enabled: boolean;
        }

        const useTestHook = ({ enabled }: Props) => {
          return { status: enabled ? "on" : "off" };
        };

        const { rerender, ProfiledHook } = profileHook(useTestHook, {
          enabled: value1,
        });

        expect(ProfiledHook.getRenderCount()).toBe(1);

        rerender({ enabled: value2 });

        // Should always be 2 renders regardless of value changes
        expect(ProfiledHook.getRenderCount()).toBe(2);

        return true;
      },
    );
  });

  describe("Complex Prop Types", () => {
    test.prop([fc.array(fc.integer(), { maxLength: 20 })], { numRuns: 1000 })(
      "profileHook handles array props",
      (arrayValue) => {
        interface Props {
          items: number[];
        }

        const useTestHook = ({ items }: Props) => {
          return { count: items.length, sum: items.reduce((a, b) => a + b, 0) };
        };

        const { result, ProfiledHook } = profileHook(useTestHook, {
          items: arrayValue,
        });

        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current.count).toBe(arrayValue.length);

        return true;
      },
    );

    test.prop(
      [fc.record({ name: fc.string(), age: fc.integer({ min: 0, max: 120 }) })],
      { numRuns: 1000 },
    )("profileHook handles object props", (objectValue) => {
      interface Props {
        user: typeof objectValue;
      }

      const useTestHook = ({ user }: Props) => {
        return { displayName: `${user.name} (${user.age})` };
      };

      const { result, ProfiledHook } = profileHook(useTestHook, {
        user: objectValue,
      });

      expect(ProfiledHook.getRenderCount()).toBe(1);
      expect(result.current.displayName).toContain(objectValue.name);

      return true;
    });

    test.prop(
      [
        fc.record({
          nested: fc.record({
            deep: fc.record({
              value: fc.string(),
            }),
          }),
        }),
      ],
      { numRuns: 500 },
    )("profileHook handles deeply nested object props", (nestedObject) => {
      interface Props {
        data: typeof nestedObject;
      }

      const useTestHook = ({ data }: Props) => {
        return { deepValue: data.nested.deep.value };
      };

      const { result, ProfiledHook } = profileHook(useTestHook, {
        data: nestedObject,
      });

      expect(ProfiledHook.getRenderCount()).toBe(1);
      expect(result.current.deepValue).toBe(nestedObject.nested.deep.value);

      return true;
    });
  });

  describe("Multiple Props", () => {
    test.prop([fc.string(), fc.integer(), fc.boolean()], { numRuns: 1000 })(
      "profileHook handles multiple props of different types",
      (str, num, bool) => {
        interface Props {
          text: string;
          count: number;
          enabled: boolean;
        }

        const useTestHook = ({ text, count, enabled }: Props) => {
          return {
            output: enabled ? `${text}: ${count}` : "disabled",
          };
        };

        const { result, ProfiledHook } = profileHook(useTestHook, {
          text: str,
          count: num,
          enabled: bool,
        });

        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current.output).toBeDefined();

        return true;
      },
    );

    test.prop([fc.string(), fc.integer(), fc.string(), fc.integer()], {
      numRuns: 500,
    })("profileHook tracks partial prop updates", (str1, num1, str2, num2) => {
      interface Props {
        text: string;
        count: number;
      }

      const useTestHook = ({ text, count }: Props) => {
        return { combined: `${text}-${count}` };
      };

      const { rerender, ProfiledHook } = profileHook(useTestHook, {
        text: str1,
        count: num1,
      });

      expect(ProfiledHook.getRenderCount()).toBe(1);

      // Update only text
      rerender({ text: str2, count: num1 });

      expect(ProfiledHook.getRenderCount()).toBe(2);

      // Update only count
      rerender({ text: str2, count: num2 });

      expect(ProfiledHook.getRenderCount()).toBe(3);

      return true;
    });
  });

  describe("Hook Return Value Stability", () => {
    test.prop([fc.integer(), fc.integer()], { numRuns: 1000 })(
      "result.current is always up-to-date after rerender",
      (value1, value2) => {
        interface Props {
          value: number;
        }

        const useTestHook = ({ value }: Props) => {
          return { doubled: value * 2 };
        };

        const { result, rerender } = profileHook(useTestHook, {
          value: value1,
        });

        const firstResult = result.current.doubled;

        expect(firstResult).toBe(value1 * 2);

        rerender({ value: value2 });

        const secondResult = result.current.doubled;

        expect(secondResult).toBe(value2 * 2);

        return firstResult !== secondResult || value1 === value2;
      },
    );

    test.prop([fc.nat({ max: 20 })], { numRuns: 500 })(
      "result.current updates correctly across multiple rerenders",
      (numRerenders) => {
        interface Props {
          value: number;
        }

        const useTestHook = ({ value }: Props) => {
          return { squared: value * value };
        };

        const { result, rerender } = profileHook(useTestHook, {
          value: 0,
        });

        for (let i = 1; i <= numRerenders; i++) {
          rerender({ value: i });

          const expectedSquared = i * i;
          const actualSquared = result.current.squared;

          if (actualSquared !== expectedSquared) {
            return false;
          }
        }

        return true;
      },
    );
  });

  describe("Hooks with State", () => {
    test.prop([fc.integer()], { numRuns: 500 })(
      "profileHook correctly initializes hooks with useState",
      (initialValue) => {
        interface Props {
          initial: number;
        }

        const useTestHook = ({ initial }: Props) => {
          const [count] = useState(initial);

          return { count };
        };

        const { result, ProfiledHook } = profileHook(useTestHook, {
          initial: initialValue,
        });

        // Initial render
        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current.count).toBe(initialValue);

        return true;
      },
    );
  });

  describe("Hooks without Parameters", () => {
    test.prop([fc.constant(undefined)], { numRuns: 500 })(
      "profileHook handles hooks without parameters",
      () => {
        const useTestHook = () => {
          return { value: "constant" };
        };

        const { result, ProfiledHook } = profileHook(useTestHook);

        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current.value).toBe("constant");

        return true;
      },
    );

    test.prop([fc.nat({ max: 10 })], { numRuns: 500 })(
      "profileHook tracks rerenders for parameterless hooks",
      (numRerenders) => {
        let renderCount = 0;

        const useTestHook = () => {
          renderCount++;

          return { renderCount };
        };

        const { rerender, ProfiledHook } = profileHook(useTestHook);

        for (let i = 0; i < numRerenders; i++) {
          rerender();
        }

        expect(ProfiledHook.getRenderCount()).toBe(1 + numRerenders);
        expect(renderCount).toBe(1 + numRerenders);

        return true;
      },
    );
  });

  describe("Type Safety Invariants", () => {
    test.prop([fc.record({ a: fc.string(), b: fc.integer() })], {
      numRuns: 1000,
    })("profileHook maintains type safety for returned values", (props) => {
      type Props = typeof props;

      const useTestHook = ({ a, b }: Props) => {
        return { combined: `${a}-${b}`, sumLength: a.length + b };
      };

      const { result } = profileHook(useTestHook, props);

      // TypeScript ensures these are the correct types
      const combined: string = result.current.combined;
      const sumLength: number = result.current.sumLength;

      expectTypeOf(combined).toBeString();
      expectTypeOf(sumLength).toBeNumber();

      return true;
    });
  });

  describe("Edge Cases", () => {
    test.prop([fc.constant(undefined)], { numRuns: 100 })(
      "profileHook handles hooks that return undefined",
      () => {
        const useTestHook = () => {
          return;
        };

        const { result, ProfiledHook } = profileHook(useTestHook);

        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current).toBeUndefined();

        return true;
      },
    );

    test.prop([fc.constant(null)], { numRuns: 100 })(
      "profileHook handles hooks that return null",
      () => {
        const useTestHook = () => {
          return null;
        };

        const { result, ProfiledHook } = profileHook(useTestHook);

        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current).toBeNull();

        return true;
      },
    );

    test.prop([fc.array(fc.anything(), { maxLength: 10 })], { numRuns: 500 })(
      "profileHook handles hooks that return arrays of any type",
      (arrayValue) => {
        const useTestHook = () => {
          return arrayValue;
        };

        const { result, ProfiledHook } = profileHook(useTestHook);

        expect(ProfiledHook.getRenderCount()).toBe(1);
        expect(result.current).toEqual(arrayValue);

        return true;
      },
    );
  });
});

describe("Property-Based Tests: profileHook Profiling Accuracy", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Render Counting Invariants", () => {
    test.prop([fc.nat({ max: 50 })], { numRuns: 500 })(
      "ProfiledHook.getRenderCount matches actual number of hook executions",
      (numRerenders) => {
        let hookExecutionCount = 0;

        const useTestHook = () => {
          hookExecutionCount++;

          return { count: hookExecutionCount };
        };

        const { rerender, ProfiledHook } = profileHook(useTestHook);

        for (let i = 0; i < numRerenders; i++) {
          rerender();
        }

        const expectedCount = 1 + numRerenders;

        return (
          ProfiledHook.getRenderCount() === expectedCount &&
          hookExecutionCount === expectedCount
        );
      },
    );

    test.prop([fc.nat({ max: 20 })], { numRuns: 500 })(
      "ProfiledHook tracks renders with prop changes",
      (numPropChanges) => {
        interface Props {
          value: number;
        }

        const useTestHook = ({ value }: Props) => {
          return { value };
        };

        const { rerender, ProfiledHook } = profileHook(useTestHook, {
          value: 0,
        });

        // Trigger prop changes
        for (let i = 1; i <= numPropChanges; i++) {
          rerender({ value: i });
        }

        const expectedTotal = 1 + numPropChanges;

        return ProfiledHook.getRenderCount() === expectedTotal;
      },
    );
  });

  describe("Profiler Method Invariants", () => {
    test.prop([fc.nat({ max: 20 })], { numRuns: 500 })(
      "all ProfiledHook methods work correctly",
      (numRerenders) => {
        const useTestHook = () => ({ value: "test" });

        const { rerender, ProfiledHook } = profileHook(useTestHook);

        for (let i = 0; i < numRerenders; i++) {
          rerender();
        }

        const renderCount = ProfiledHook.getRenderCount();
        const history = ProfiledHook.getRenderHistory();
        const lastRender = ProfiledHook.getLastRender();
        const hasMounted = ProfiledHook.hasMounted();

        return (
          renderCount === numRerenders + 1 &&
          history.length === renderCount &&
          lastRender === history.at(-1) &&
          hasMounted
        );
      },
    );
  });
});
