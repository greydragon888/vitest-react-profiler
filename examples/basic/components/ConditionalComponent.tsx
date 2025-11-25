import { useState } from "react";
import type { FC } from "react";

interface ConditionalComponentProps {
  showContent?: boolean;
  renderCount?: number;
}

export const ConditionalComponent: FC<ConditionalComponentProps> = ({
  showContent = true,
  renderCount = 3,
}) => {
  const [isVisible, setIsVisible] = useState(showContent);
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = ["Tab 1", "Tab 2", "Tab 3"];

  return (
    <div>
      <h2>Conditional Component</h2>
      <button
        onClick={() => {
          setIsVisible(!isVisible);
        }}
      >
        {isVisible ? "Hide" : "Show"} Content
      </button>

      {isVisible && (
        <div>
          <div>
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(index);
                }}
                style={{
                  fontWeight: selectedTab === index ? "bold" : "normal",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div>
            {selectedTab === 0 && (
              <div>
                <h3>Content for Tab 1</h3>
                {Array.from({ length: renderCount }, (_, i) => (
                  <p key={i}>Item {i + 1} in Tab 1</p>
                ))}
              </div>
            )}
            {selectedTab === 1 && (
              <div>
                <h3>Content for Tab 2</h3>
                {Array.from({ length: renderCount }, (_, i) => (
                  <p key={i}>Item {i + 1} in Tab 2</p>
                ))}
              </div>
            )}
            {selectedTab === 2 && (
              <div>
                <h3>Content for Tab 3</h3>
                {Array.from({ length: renderCount }, (_, i) => (
                  <p key={i}>Item {i + 1} in Tab 3</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
