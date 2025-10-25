import { memo, useMemo } from "react";

interface ListItemProps {
  id: string;
  text: string;
  highlighted?: boolean;
}

interface ListProps {
  items: ListItemProps[];
  onItemClick?: (id: string) => void;
  filterText?: string;
}

export const ListItem = memo<ListItemProps>(
  ({ id, text, highlighted = false }) => {
    return (
      <li
        id={id}
        style={{
          padding: "8px",
          backgroundColor: highlighted ? "#e0f2fe" : "transparent",
          cursor: "pointer",
        }}
      >
        {text}
      </li>
    );
  },
);

ListItem.displayName = "ListItem";

export const MemoizedList = memo<ListProps>(
  ({ items, onItemClick, filterText = "" }) => {
    const filteredItems = useMemo(() => {
      if (!filterText) {
        return items;
      }

      return items.filter((item) =>
        item.text.toLowerCase().includes(filterText.toLowerCase()),
      );
    }, [items, filterText]);

    return (
      <div>
        <h3>Memoized List ({filteredItems.length} items)</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filteredItems.map((item) => (
            <div key={item.id} onClick={() => onItemClick?.(item.id)}>
              <ListItem {...item} />
            </div>
          ))}
        </ul>
      </div>
    );
  },
);

MemoizedList.displayName = "MemoizedList";

export const UnmemoizedList = ({
  items,
  onItemClick,
  filterText = "",
}: ListProps) => {
  const filteredItems = items.filter((item) =>
    item.text.toLowerCase().includes(filterText.toLowerCase()),
  );

  return (
    <div>
      <h3>Unmemoized List ({filteredItems.length} items)</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {filteredItems.map((item) => (
          <div key={item.id} onClick={() => onItemClick?.(item.id)}>
            <li
              style={{
                padding: "8px",
                backgroundColor: item.highlighted ? "#e0f2fe" : "transparent",
                cursor: "pointer",
              }}
            >
              {item.text}
            </li>
          </div>
        ))}
      </ul>
    </div>
  );
};
