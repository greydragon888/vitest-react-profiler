import { FC, useEffect, useState } from "react";
import { ContextConsumer } from "./ContextConsumer";

interface ContextPerformanceTestProps {
  consumerCount: number;
  updateFrequency: number;
}

export const ContextPerformanceTest: FC<ContextPerformanceTestProps> = ({
  consumerCount,
  updateFrequency,
}) => {
  const [contextValue, setContextValue] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = setInterval(() => {
      setContextValue((prev) => prev + 1);
    }, updateFrequency);

    return () => {
      clearInterval(interval);
    };
  }, [isRunning, updateFrequency]);

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setContextValue(0);
    setIsRunning(false);
  };

  return (
    <div>
      <h3>Context Performance Test</h3>
      <p>Context Value: {contextValue}</p>
      <p>Update Frequency: {updateFrequency}ms</p>
      <div>
        <button onClick={handleToggle}>
          {isRunning ? "Stop" : "Start"} Updates
        </button>
        <button onClick={handleReset}>Reset</button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "5px",
          marginTop: "10px",
          maxHeight: "300px",
          overflow: "auto",
        }}
      >
        {Array.from({ length: consumerCount }, (_, i) => (
          <ContextConsumer key={`consumer-${i}`} id={`${i}`} />
        ))}
      </div>
    </div>
  );
};
