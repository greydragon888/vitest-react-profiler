import { memo } from "react";

export const ExpensiveComponent = memo(({ data }: { data: string[] }) => {
  // Simulate expensive computation
  const processed = data
    .map((item) => item.toUpperCase())
    .sort((a, b) => a.localeCompare(b));

  return (
    <ul>
      {processed.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
});
