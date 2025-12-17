import { useState } from "react";

interface CounterProps {
  initialCount?: number;
}

/**
 * Simple counter component for basic snapshot examples
 */
export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <span data-testid="count">Count: {count}</span>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <button onClick={() => setCount((c) => c - 1)}>Decrement</button>
    </div>
  );
}
