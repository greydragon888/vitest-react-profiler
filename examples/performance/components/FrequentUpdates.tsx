import { useState, useEffect, memo } from "react";
import type { FC } from "react";

// Component with frequent state updates
interface FrequentUpdatesProps {
  updateInterval: number;
  duration: number;
  onUpdate?: (count: number) => void;
}

export const FrequentUpdates: FC<FrequentUpdatesProps> = ({
  updateInterval,
  duration,
  onUpdate,
}) => {
  const [updateCount, setUpdateCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      setUpdateCount((prev) => {
        const newCount = prev + 1;

        onUpdate?.(newCount);

        return newCount;
      });
    }, updateInterval);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsRunning(false);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRunning, updateInterval, duration, onUpdate]);

  return (
    <div>
      <h3>Frequent Updates Component</h3>
      <p>Update Count: {updateCount}</p>
      <p>Status: {isRunning ? "Running" : "Stopped"}</p>
      <button
        onClick={() => {
          setIsRunning(!isRunning);
        }}
      >
        {isRunning ? "Stop" : "Start"} Updates
      </button>
      <button
        onClick={() => {
          setUpdateCount(0);
        }}
      >
        Reset
      </button>
    </div>
  );
};
