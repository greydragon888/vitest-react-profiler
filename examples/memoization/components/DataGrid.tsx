import { memo, useMemo, useState, useCallback } from "react";

interface RowData {
  id: string;
  name: string;
  value: number;
  status: "active" | "inactive" | "pending";
}

interface CellProps {
  value: string | number;
  type?: "text" | "number" | "status";
}

interface RowProps {
  data: RowData;
  selected: boolean;
  onSelect: (id: string) => void;
}

interface DataGridProps {
  data: RowData[];
  sortBy?: keyof RowData;
  filterBy?: string;
}

export const GridCell = memo<CellProps>(({ value, type = "text" }) => {
  const style = useMemo(() => {
    if (type === "status") {
      const colors = {
        active: "green",
        inactive: "gray",
        pending: "orange",
      };

      return {
        padding: "8px",
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        color: colors[value as keyof typeof colors] ?? "black",
        fontWeight: "bold" as const,
      };
    }

    return { padding: "8px" };
  }, [type, value]);

  return <td style={style}>{value}</td>;
});

GridCell.displayName = "GridCell";

export const GridRow = memo<RowProps>(({ data, selected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(data.id);
  }, [data.id, onSelect]);

  return (
    <tr
      onClick={handleClick}
      style={{
        backgroundColor: selected ? "#e0f2fe" : "transparent",
        cursor: "pointer",
      }}
    >
      <GridCell value={data.id} />
      <GridCell value={data.name} />
      <GridCell value={data.value} type="number" />
      <GridCell value={data.status} type="status" />
    </tr>
  );
});

GridRow.displayName = "GridRow";

export const MemoizedDataGrid = memo<DataGridProps>(
  ({ data, sortBy = "name", filterBy = "" }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const processedData = useMemo(() => {
      let result = [...data];

      if (filterBy) {
        result = result.filter(
          (item) =>
            item.name.toLowerCase().includes(filterBy.toLowerCase()) ||
            item.status.includes(filterBy.toLowerCase()),
        );
      }

      result.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];

        if (typeof aVal === "string" && typeof bVal === "string") {
          return aVal.localeCompare(bVal);
        }

        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      });

      return result;
    }, [data, sortBy, filterBy]);

    const handleRowSelect = useCallback((id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });
    }, []);

    return (
      <div>
        <h3>
          Memoized Data Grid ({processedData.length} rows, {selectedIds.size}{" "}
          selected)
        </h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Value</th>
              <th style={{ padding: "8px", textAlign: "left" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((row) => (
              <GridRow
                key={row.id}
                data={row}
                selected={selectedIds.has(row.id)}
                onSelect={handleRowSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

MemoizedDataGrid.displayName = "MemoizedDataGrid";

export const UnmemoizedDataGrid = ({
  data,
  sortBy = "name",
  filterBy = "",
}: DataGridProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  let processedData = [...data];

  if (filterBy) {
    processedData = processedData.filter(
      (item) =>
        item.name.toLowerCase().includes(filterBy.toLowerCase()) ||
        item.status.includes(filterBy.toLowerCase()),
    );
  }

  processedData.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal);
    }

    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });

  const handleRowSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <div>
      <h3>
        Unmemoized Data Grid ({processedData.length} rows, {selectedIds.size}{" "}
        selected)
      </h3>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "8px", textAlign: "left" }}>ID</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Name</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Value</th>
            <th style={{ padding: "8px", textAlign: "left" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((row) => (
            <tr
              key={row.id}
              onClick={() => {
                handleRowSelect(row.id);
              }}
              style={{
                backgroundColor: selectedIds.has(row.id)
                  ? "#e0f2fe"
                  : "transparent",
                cursor: "pointer",
              }}
            >
              <td style={{ padding: "8px" }}>{row.id}</td>
              <td style={{ padding: "8px" }}>{row.name}</td>
              <td style={{ padding: "8px" }}>{row.value}</td>
              <td
                style={{
                  padding: "8px",
                  color:
                    row.status === "active"
                      ? "green"
                      : row.status === "inactive"
                        ? "gray"
                        : "orange",
                  fontWeight: "bold",
                }}
              >
                {row.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
