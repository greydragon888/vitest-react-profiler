import { useState, useEffect } from "react";

/**
 * Example component: Simple counter with optional side effect
 */
export const Counter = ({
  initialCount = 0,
  onCountChange,
  label = "Count",
}: {
  initialCount?: number;
  onCountChange?: (count: number) => void;
  label?: string;
}) => {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    onCountChange?.(count);
  }, [count, onCountChange]);

  return (
    <div>
      <span>
        {label}: {count}
      </span>
      <button
        onClick={() => {
          setCount((c) => c + 1);
        }}
      >
        Increment
      </button>
      <button
        onClick={() => {
          setCount((c) => c - 1);
        }}
      >
        Decrement
      </button>
    </div>
  );
};
