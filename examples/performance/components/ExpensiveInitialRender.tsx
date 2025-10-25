// Component with expensive initial render
import { useEffect, useState } from "react";
import type { FC } from "react";

interface ExpensiveInitialRenderProps {
  complexity: number;
}

export const ExpensiveInitialRender: FC<ExpensiveInitialRenderProps> = ({
  complexity,
}) => {
  const [data, setData] = useState<{ id: number; value: string }[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Simulate expensive initialization
    const start = performance.now();
    const generatedData = Array.from({ length: complexity }, (_, i) => {
      // Simulate complex calculation
      let value = "";

      for (let j = 0; j < 100; j++) {
        value += String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }

      return { id: i, value: value.substring(0, 10) };
    });

    setData(generatedData);
    setInitialized(true);

    const duration = performance.now() - start;

    console.log(
      `Initialization took ${duration.toFixed(2)}ms for ${complexity} items`,
    );
  }, [complexity]);

  if (!initialized) {
    return <div>Initializing with complexity {complexity}...</div>;
  }

  return (
    <div>
      <h3>Expensive Initial Render</h3>
      <p>Initialized {data.length} items</p>
      <div style={{ maxHeight: "200px", overflow: "auto" }}>
        {data.slice(0, 10).map((item) => (
          <div key={item.id}>
            Item {item.id}: {item.value}
          </div>
        ))}
      </div>
      <p>Showing first 10 of {data.length} items</p>
    </div>
  );
};
