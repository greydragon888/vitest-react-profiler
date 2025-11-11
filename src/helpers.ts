/**
 * Performs cleanup and resolves a promise in async event-based operations.
 *
 * This helper ensures the correct cleanup sequence when an async condition is met:
 * 1. Cancel the timeout (no longer need to wait)
 * 2. Unsubscribe from events (prevent memory leaks)
 * 3. Resolve the promise with the result
 *
 * @template T - The type of value to resolve with
 * @param timeoutId - The timeout ID to clear
 * @param unsubscribe - Callback to unsubscribe from event listener
 * @param resolve - Promise resolve function
 * @param value - Value to resolve the promise with
 *
 * @example
 * ```typescript
 * // Usage in async matcher
 * const unsubscribe = component.onRender(({ phase }) => {
 *   if (phase === targetPhase) {
 *     cleanupAndResolve(timeoutId, unsubscribe, resolve, {
 *       pass: true,
 *       message: () => "Phase reached"
 *     });
 *   }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Usage in async utility (Promise<void>)
 * const unsubscribe = component.onRender(({ count }) => {
 *   if (count >= targetCount) {
 *     cleanupAndResolve(timeoutId, unsubscribe, resolve, undefined);
 *   }
 * });
 * ```
 *
 * @since 1.6.0
 * @internal - This is a low-level helper, not part of public API
 */
export const cleanupAndResolve = <T>(
  timeoutId: NodeJS.Timeout,
  unsubscribe: () => void,
  resolve: (value: T) => void,
  value: T,
): void => {
  clearTimeout(timeoutId);
  unsubscribe();
  resolve(value);
};

/**
 * Conditionally performs cleanup and resolves a promise if phases match.
 *
 * This helper combines phase matching logic with cleanup/resolve sequence.
 * By moving the conditional logic INSIDE the helper (instead of the callback),
 * we make it unit-testable and kill mutation testing survivors.
 *
 * **Architecture:** Callback becomes a "dumb data pipe", helper contains all logic.
 *
 * Call sequence when phases match:
 * 1. Check if actualPhase === expectedPhase
 * 2. If match: Cancel timeout → Unsubscribe → Resolve
 * 3. If no match: Return early (no side effects)
 *
 * @template T - The type of value to resolve with
 * @param timeoutId - The timeout ID to clear
 * @param unsubscribe - Callback to unsubscribe from event listener
 * @param resolve - Promise resolve function
 * @param value - Value to resolve the promise with
 * @param actualPhase - The phase that occurred
 * @param expectedPhase - The phase we're waiting for
 *
 * @example
 * ```typescript
 * // Usage in async phase matcher
 * const unsubscribe = component.onRender(({ phase: renderPhase }) => {
 *   // Callback is just a data pipe - no logic!
 *   cleanupAndResolveIfPhaseMatches(
 *     timeoutId,
 *     unsubscribe,
 *     resolve,
 *     { pass: true, message: () => "..." },
 *     renderPhase,  // actual
 *     phase         // expected
 *   );
 * });
 * ```
 *
 * @since 1.6.0
 * @internal - This is a low-level helper, not part of public API
 * @see docs/mutation-testing-case-study.md - Final solution for mutants #4 and #8
 */
export const cleanupAndResolveIfPhaseMatches = <T>(
  timeoutId: NodeJS.Timeout,
  unsubscribe: () => void,
  resolve: (value: T) => void,
  value: T,
  actualPhase: string,
  expectedPhase: string,
): void => {
  // Guard: early return if phases don't match (unit-testable!)
  if (actualPhase !== expectedPhase) {
    return;
  }

  // Phases match - perform cleanup and resolve
  cleanupAndResolve(timeoutId, unsubscribe, resolve, value);
};
