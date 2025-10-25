// Component for testing context performance
import { memo, useEffect, useState } from "react";
import type { FC } from "react";

interface ContextConsumerProps {
  id: string;
}

export const ContextConsumer: FC<ContextConsumerProps> = memo(({ id }) => {
  const [localRenders, setLocalRenders] = useState(0);

  useEffect(() => {
    setLocalRenders((prev) => prev + 1);
  });

  return (
    <div style={{ padding: "5px", margin: "2px", border: "1px solid #ddd" }}>
      Consumer {id} - Renders: {localRenders}
    </div>
  );
});

ContextConsumer.displayName = "ContextConsumer";
