import { useState, useDeferredValue, memo, type FC } from "react";

/**
 * Example component demonstrating useDeferredValue for performance optimization
 *
 * Use case: Expensive list rendering that should not block urgent updates
 * (like typing in an input field).
 */

interface DeferredListProps {
  query: string;
}

// Expensive component that renders large list
const ExpensiveList: FC<DeferredListProps> = memo(({ query }) => {
  const items = generateItems(query, 100);

  return (
    <ul data-testid="expensive-list">
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
});

ExpensiveList.displayName = "ExpensiveList";

export const DeferredExample: FC = () => {
  const [input, setInput] = useState("");
  const deferredInput = useDeferredValue(input);

  return (
    <div>
      <input
        data-testid="filter-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Filter items..."
      />
      <div data-testid="immediate-value">Input: {input}</div>
      <div data-testid="deferred-value">Filtering: {deferredInput}</div>
      <ExpensiveList query={deferredInput} />
    </div>
  );
};

// Generate mock items based on query
function generateItems(
  query: string,
  count: number,
): Array<{ id: string; text: string }> {
  const results = [];

  for (let i = 0; i < count; i++) {
    const text = `Item ${i}: ${query || "All"}`;

    if (!query || text.toLowerCase().includes(query.toLowerCase())) {
      results.push({ id: `item-${i}`, text });
    }
  }

  return results;
}
