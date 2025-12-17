import type { WaitOptions } from "@/types";

/**
 * Validates that a numeric argument is a non-negative integer.
 *
 * @param value - Value to validate
 * @param paramName - Parameter name for error message
 * @throws {TypeError} If value is not a non-negative integer
 *
 * @example
 * validateNonNegativeIntegerArg(count, 'count');
 *
 * @since v1.12.0
 * @internal
 */
export function validateNonNegativeIntegerArg(
  value: number,
  paramName: string,
): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(
      `Expected ${paramName} to be a non-negative integer, received ${value}`,
    );
  }
}

/**
 * Extracts and validates timeout from options.
 *
 * @param options - Wait options
 * @returns Validated timeout value
 * @throws {TypeError} If timeout is invalid
 *
 * @example
 * const timeout = validateAndExtractTimeout(options);
 *
 * @since v1.12.0
 * @internal
 */
export function validateAndExtractTimeout(options?: WaitOptions): number {
  const { timeout = 1000 } = options ?? {};

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new TypeError(
      `Expected timeout to be a positive number, received ${timeout}`,
    );
  }

  return timeout;
}
