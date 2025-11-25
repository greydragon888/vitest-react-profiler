import { useState } from "react";

import type { FC } from "react";

interface SimpleCounterProps {
  initialCount?: number;
}

export const SimpleCounter: FC<SimpleCounterProps> = ({ initialCount = 0 }) => {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <h2>Simple Counter</h2>
      <p>Count: {count}</p>
      <button
        onClick={() => {
          setCount(count + 1);
        }}
      >
        Increment
      </button>
      <button
        onClick={() => {
          setCount(count - 1);
        }}
      >
        Decrement
      </button>
      <button
        onClick={() => {
          setCount(initialCount);
        }}
      >
        Reset
      </button>
    </div>
  );
};
