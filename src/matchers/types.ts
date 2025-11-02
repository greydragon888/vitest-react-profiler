/**
 * Result type for matcher functions
 */
export interface MatcherResult {
  pass: boolean;
  message: () => string;
  actual?: unknown;
  expected?: unknown;
}

export interface WaitOptions {
  // Maximum wait time in milliseconds (default: 1000)
  timeout?: number;
  // Polling interval in milliseconds (default: 50)
  interval?: number;
}
