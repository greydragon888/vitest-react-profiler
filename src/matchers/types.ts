/**
 * Result type for matcher functions
 */
export interface MatcherResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

// Re-export from types for convenience
export type { WaitOptions } from "@/types";
