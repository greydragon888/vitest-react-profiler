import { createElement } from "react";

import type { JSX } from "react";

// Simple test component
export const TestComponent = (): JSX.Element => {
  return createElement("div", null, "test");
};
