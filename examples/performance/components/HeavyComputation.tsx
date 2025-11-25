import { useState, useMemo } from "react";
import type { FC } from "react";

interface HeavyComputationProps {
  iterations: number;
  enableOptimization?: boolean;
}

// Симуляция тяжелых вычислений
const heavyCalculation = (n: number): number => {
  let result = 0;

  for (let i = 0; i < n; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }

  return result;
};

export const HeavyComputation: FC<HeavyComputationProps> = ({
  iterations,
  enableOptimization = true,
}) => {
  const [counter, setCounter] = useState(0);
  const [trigger, setTrigger] = useState(0);

  // With optimization - memoize heavy calculation
  const optimizedResult = useMemo(
    () => (enableOptimization ? heavyCalculation(iterations) : 0),
    [iterations, enableOptimization],
  );

  // Without optimization - recalculate every render
  const unoptimizedResult = !enableOptimization
    ? heavyCalculation(iterations)
    : 0;

  const result = enableOptimization ? optimizedResult : unoptimizedResult;

  return (
    <div>
      <h3>Heavy Computation Component</h3>
      <div>
        <p>Result: {result.toFixed(2)}</p>
        <p>Counter: {counter}</p>
        <p>Trigger: {trigger}</p>
      </div>
      <button
        onClick={() => {
          setCounter((c) => c + 1);
        }}
      >
        Increment Counter (should not recalculate)
      </button>
      <button
        onClick={() => {
          setTrigger((t) => t + 1);
        }}
      >
        Trigger Re-render
      </button>
    </div>
  );
};
