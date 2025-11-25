// Component for testing context performance
import { memo, useRef } from "react";
import type { FC } from "react";

interface ContextConsumerProps {
  id: string;
}

export const ContextConsumer: FC<ContextConsumerProps> = memo(({ id }) => {
  // Track renders using a ref (doesn't cause re-renders)
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  return (
    <div style={{ padding: "5px", margin: "2px", border: "1px solid #ddd" }}>
      Consumer {id} - Renders: {renderCountRef.current}
    </div>
  );
});

ContextConsumer.displayName = "ContextConsumer";
