// Large list rendering component
import { useMemo, useState } from "react";
import type { FC, UIEvent } from "react";

interface LargeListProps {
  itemCount: number;
  enableVirtualization?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

export const LargeList: FC<LargeListProps> = ({
  itemCount,
  enableVirtualization = false,
  itemHeight = 50,
  containerHeight = 500,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Generate items
  const items = useMemo(
    () =>
      Array.from({ length: itemCount }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
        value: Math.floor(Math.random() * 1000),
      })),
    [itemCount],
  );

  // Filter items
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  // Virtualization logic
  const visibleItems = useMemo(() => {
    if (!enableVirtualization) {
      return filteredItems;
    }

    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      filteredItems.length,
    );

    return filteredItems.slice(startIndex, endIndex);
  }, [
    filteredItems,
    scrollTop,
    itemHeight,
    containerHeight,
    enableVirtualization,
  ]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (enableVirtualization) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  };

  const totalHeight = filteredItems.length * itemHeight;

  return (
    <div>
      <h3>Large List Component</h3>
      <input
        type="text"
        placeholder="Search items..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
        }}
        style={{ marginBottom: "10px", padding: "5px", width: "200px" }}
      />
      <div
        onScroll={handleScroll}
        style={{
          height: `${containerHeight}px`,
          overflow: "auto",
          position: "relative",
        }}
      >
        {enableVirtualization && (
          <div style={{ height: `${totalHeight}px`, position: "relative" }}>
            {visibleItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  top: `${(Math.floor(scrollTop / itemHeight) + index) * itemHeight}px`,
                  height: `${itemHeight}px`,
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong>{item.name}</strong> - {item.description} (Value:{" "}
                {item.value})
              </div>
            ))}
          </div>
        )}
        {!enableVirtualization &&
          visibleItems.map((item) => (
            <div
              key={item.id}
              style={{
                height: `${itemHeight}px`,
                display: "flex",
                alignItems: "center",
                padding: "0 10px",
                borderBottom: "1px solid #eee",
              }}
            >
              <strong>{item.name}</strong> - {item.description} (Value:{" "}
              {item.value})
            </div>
          ))}
      </div>
      <p>
        Showing {visibleItems.length} of {filteredItems.length} items
        {enableVirtualization ? " (virtualized)" : ""}
      </p>
    </div>
  );
};
