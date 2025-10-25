import { FC, useState } from "react";

// Conditional rendering performance test
interface ConditionalRenderingProps {
  itemCount: number;
  filterThreshold: number;
}

export const ConditionalRendering: FC<ConditionalRenderingProps> = ({
  itemCount,
  filterThreshold,
}) => {
  const [showFiltered, setShowFiltered] = useState(false);
  const [highlightEven, setHighlightEven] = useState(false);
  const [sortDescending, setSortDescending] = useState(false);

  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: i,
    value: Math.floor(Math.random() * 100),
    category: ["A", "B", "C"][i % 3],
  }));

  let displayItems = [...items];

  if (showFiltered) {
    displayItems = displayItems.filter((item) => item.value > filterThreshold);
  }

  if (sortDescending) {
    displayItems.sort((a, b) => b.value - a.value);
  }

  return (
    <div>
      <h3>Conditional Rendering Test</h3>
      <div>
        <label>
          <input
            type="checkbox"
            checked={showFiltered}
            onChange={(e) => {
              setShowFiltered(e.target.checked);
            }}
          />
          Filter (value &gt; {filterThreshold})
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="checkbox"
            checked={highlightEven}
            onChange={(e) => {
              setHighlightEven(e.target.checked);
            }}
          />
          Highlight Even
        </label>
        <label style={{ marginLeft: "10px" }}>
          <input
            type="checkbox"
            checked={sortDescending}
            onChange={(e) => {
              setSortDescending(e.target.checked);
            }}
          />
          Sort Descending
        </label>
      </div>
      <p>
        Showing {displayItems.length} of {items.length} items
      </p>
      <div style={{ maxHeight: "300px", overflow: "auto", marginTop: "10px" }}>
        {displayItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "5px",
              backgroundColor:
                highlightEven && item.value % 2 === 0
                  ? "#e0f0ff"
                  : "transparent",
              borderBottom: "1px solid #eee",
            }}
          >
            [{item.category}] Item {item.id}: {item.value}
          </div>
        ))}
      </div>
    </div>
  );
};
