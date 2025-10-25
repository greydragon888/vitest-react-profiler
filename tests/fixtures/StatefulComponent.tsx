import { FC, useEffect, useState } from "react";

export const StatefulComponent: FC<{ initial?: number }> = ({
  initial = 0,
}) => {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    if (count < 2) {
      setCount(count + 1);
    }
  }, [count]);

  return <div>{count}</div>;
};
