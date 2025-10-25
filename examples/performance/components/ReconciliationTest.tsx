// Component that tests reconciliation performance
import { useEffect, useState } from "react";
import type { FC } from "react";

interface ReconciliationTestProps {
  itemCount: number;
  shuffleOnUpdate?: boolean;
  useKeys?: boolean;
}

export const ReconciliationTest: FC<ReconciliationTestProps> = ({
  itemCount,
  shuffleOnUpdate = false,
  useKeys = true,
}) => {
  const [items, setItems] = useState<{ id: string; value: number }[]>([]);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    const initialItems = Array.from({ length: itemCount }, (_, i) => ({
      id: `item-${i}`,
      value: Math.floor(Math.random() * 100),
    }));

    setItems(initialItems);
  }, [itemCount]);

  const handleUpdate = () => {
    setItems((prev) => {
      const newItems = prev.map((item) => ({
        ...item,
        value: Math.floor(Math.random() * 100),
      }));

      if (shuffleOnUpdate) {
        // Shuffle array to test reconciliation
        for (let i = newItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));

          [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
        }
      }

      return newItems;
    });
    setUpdateCount((prev) => prev + 1);
  };

  const handleReverse = () => {
    setItems((prev) => [...prev].reverse());
    setUpdateCount((prev) => prev + 1);
  };

  const handleRemoveFirst = () => {
    setItems((prev) => prev.slice(1));
    setUpdateCount((prev) => prev + 1);
  };

  const handleAddToBeginning = () => {
    setItems((prev) => [
      { id: `new-${Date.now()}`, value: Math.floor(Math.random() * 100) },
      ...prev,
    ]);
    setUpdateCount((prev) => prev + 1);
  };

  return (
    <div>
      <h3>Reconciliation Test</h3>
      <p>Update Count: {updateCount}</p>
      <div>
        <button onClick={handleUpdate}>Update Values</button>
        <button onClick={handleReverse}>Reverse Order</button>
        <button onClick={handleRemoveFirst}>Remove First</button>
        <button onClick={handleAddToBeginning}>Add to Beginning</button>
      </div>
      <div style={{ maxHeight: "300px", overflow: "auto", marginTop: "10px" }}>
        {items.map((item, index) =>
          useKeys ? (
            <div
              key={item.id}
              style={{ padding: "5px", borderBottom: "1px solid #eee" }}
            >
              {item.id}: {item.value}
            </div>
          ) : (
            <div
              key={index}
              style={{ padding: "5px", borderBottom: "1px solid #eee" }}
            >
              {item.id}: {item.value}
            </div>
          ),
        )}
      </div>
      <p>
        Rendering {items.length} items {useKeys ? "with" : "without"} stable
        keys
      </p>
    </div>
  );
};
