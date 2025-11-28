import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import * as matchers from "../../src/matchers";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
