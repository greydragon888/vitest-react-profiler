import type { FC } from "react";

export const SimpleComponent: FC<{ value?: string }> = ({
  value = "default",
}) => {
  return <div>{value}</div>;
};
