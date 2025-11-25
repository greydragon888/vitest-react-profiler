import { useState, useTransition, type FC } from "react";

/**
 * Example component demonstrating useTransition for non-urgent updates
 *
 * Use case: Search/filter UI where typing should be responsive,
 * but rendering results can be deferred.
 */

export const TransitionExample: FC = () => {
  const [isPending, startTransition] = useTransition();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<string[]>([]);

  const handleSearch = (value: string) => {
    // Urgent: Update input immediately (responsive UI)
    setInput(value);

    // Non-urgent: Update results (can be interrupted)
    startTransition(() => {
      const filtered = mockSearch(value);
      setResults(filtered);
    });
  };

  return (
    <div>
      <input
        data-testid="search-input"
        value={input}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search..."
      />
      <div data-testid="status">{isPending ? "Searching..." : "Ready"}</div>
      <ul data-testid="results">
        {results.map((result, index) => (
          <li key={index}>{result}</li>
        ))}
      </ul>
    </div>
  );
};

// Mock search function that would be expensive in real app
function mockSearch(query: string): string[] {
  if (!query) return [];

  const items = [
    "Apple",
    "Banana",
    "Cherry",
    "Date",
    "Elderberry",
    "Fig",
    "Grape",
  ];

  return items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  );
}
