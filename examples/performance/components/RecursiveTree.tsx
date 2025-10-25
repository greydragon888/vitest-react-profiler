// Recursive component for testing deep trees
import { useState } from "react";
import type { FC } from "react";

interface RecursiveTreeProps {
  depth: number;
  branching: number;
  currentDepth?: number;
  path?: string;
}

export const RecursiveTree: FC<RecursiveTreeProps> = ({
  depth,
  branching,
  currentDepth = 0,
  path = "root",
}) => {
  const [expanded, setExpanded] = useState(currentDepth < 2);
  const [highlighted, setHighlighted] = useState(false);

  if (currentDepth >= depth) {
    return (
      <div
        style={{
          marginLeft: `${currentDepth * 20}px`,
          padding: "2px 5px",
          backgroundColor: highlighted ? "#ffffcc" : "transparent",
        }}
        onMouseEnter={() => {
          setHighlighted(true);
        }}
        onMouseLeave={() => {
          setHighlighted(false);
        }}
      >
        🍃 Leaf: {path}
      </div>
    );
  }

  return (
    <div style={{ marginLeft: `${currentDepth * 20}px` }}>
      <div
        onClick={() => {
          setExpanded(!expanded);
        }}
        style={{
          cursor: "pointer",
          padding: "2px 5px",
          backgroundColor: highlighted ? "#e0f0ff" : "transparent",
        }}
        onMouseEnter={() => {
          setHighlighted(true);
        }}
        onMouseLeave={() => {
          setHighlighted(false);
        }}
      >
        {expanded ? "📂" : "📁"} {path} (depth: {currentDepth})
      </div>
      {expanded &&
        Array.from({ length: branching }, (_, i) => (
          <RecursiveTree
            key={`${path}-${i}`}
            depth={depth}
            branching={branching}
            currentDepth={currentDepth + 1}
            path={`${path}-${i}`}
          />
        ))}
    </div>
  );
};
