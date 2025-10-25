import { memo } from "react";

export const MemoizedComponent = memo<{ data: string[] }>(({ data }) => {
  return (
    <ul>
      {data.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
});
