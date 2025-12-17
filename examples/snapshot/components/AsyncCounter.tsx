import { useState } from "react";

interface AsyncCounterProps {
  initialCount?: number;
  delay?: number;
}

/**
 * Counter with async increment for testing async matchers
 *
 * @example
 * ProfiledCounter.snapshot();
 * fireEvent.click(screen.getByText("Async +1"));
 * await expect(ProfiledCounter).toEventuallyRerender();
 */
export function AsyncCounter({ initialCount = 0, delay = 100 }: AsyncCounterProps) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const incrementAsync = () => {
    setLoading(true);
    setTimeout(() => {
      setCount((c) => c + 1);
      setLoading(false);
    }, delay);
  };

  const incrementSync = () => {
    setCount((c) => c + 1);
  };

  const incrementMultiple = (times: number) => {
    for (let i = 0; i < times; i++) {
      setTimeout(() => {
        setCount((c) => c + 1);
      }, delay * (i + 1));
    }
  };

  return (
    <div>
      <span data-testid="count">Count: {count}</span>
      {loading && <span data-testid="loading">Loading...</span>}
      <button onClick={incrementSync}>+1</button>
      <button onClick={incrementAsync}>Async +1</button>
      <button onClick={() => incrementMultiple(3)}>Async +3</button>
    </div>
  );
}
