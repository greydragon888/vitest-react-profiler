import { memo, useMemo } from "react";

interface FilteredListProps {
  items: string[];
  filter: string;
  /** Unrelated prop to test memo effectiveness */
  theme?: "light" | "dark";
}

/**
 * Memoized list component with filter
 * Demonstrates testing React.memo effectiveness with snapshots
 */
export const FilteredList = memo(function FilteredList({
  items,
  filter,
  theme = "light",
}: FilteredListProps) {
  const filteredItems = useMemo(
    () => items.filter((item) => item.toLowerCase().includes(filter.toLowerCase())),
    [items, filter],
  );

  return (
    <div data-testid="filtered-list" data-theme={theme}>
      <ul>
        {filteredItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <span data-testid="filtered-count">Showing: {filteredItems.length}</span>
    </div>
  );
});
