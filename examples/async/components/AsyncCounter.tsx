import { useState } from "react";

import type { FC } from "react";

/**
 * AsyncCounter - demonstrates async state updates
 *
 * Use case: Testing components with delayed state changes (debounced inputs, async computations)
 *
 * @example
 * ```tsx
 * const ProfiledCounter = withProfiler(AsyncCounter);
 * const info = await ProfiledCounter.waitForNextRender();
 * ```
 */
export const AsyncCounter: FC = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const incrementAsync = () => {
    setLoading(true);

    // Simulate async operation (API call, computation, etc.)
    setTimeout(() => {
      setCount((prev) => prev + 1);
      setLoading(false);
    }, 100);
  };

  const incrementSync = () => {
    setCount((prev) => prev + 1);
  };

  return (
    <div>
      <h2>Async Counter</h2>
      <p>Count: {count}</p>
      {loading && <p>Loading...</p>}
      <button onClick={incrementSync}>Increment Sync</button>
      <button onClick={incrementAsync}>Increment Async</button>
    </div>
  );
};
