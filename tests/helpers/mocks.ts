import { vi } from "vitest";

import type {
  ProfilerCacheInterface,
  ProfilerEventsInterface,
  RenderListener,
} from "@/profiler/core/interfaces";
import type { PhaseType } from "@/types";

/**
 * Test utilities for creating mock implementations of profiler interfaces
 *
 * @module tests/helpers/mocks
 * @since v1.7.0
 *
 * @example
 * ```typescript
 * import { createMockCache, createSpyCache, createMockEvents } from '@tests/helpers/mocks';
 *
 * // Simple mock (no-op)
 * const mockCache = createMockCache();
 * const data = new ProfilerData(mockCache);
 *
 * // Spy with real caching logic
 * const spyCache = createSpyCache();
 * expect(spyCache._getPhaseCacheSpy).toHaveBeenCalled();
 *
 * // Mock events
 * const mockEvents = createMockEvents();
 * ```
 */

/**
 * Extended ProfilerCacheInterface with spy methods for testing
 *
 * Provides access to underlying spy functions for verification in tests.
 */
export interface SpyCache extends ProfilerCacheInterface {
  /** Spy for getPhaseCache method */
  _getPhaseCacheSpy: ReturnType<typeof vi.fn>;
  /** Spy for invalidate method */
  _invalidateSpy: ReturnType<typeof vi.fn>;
  /** Spy for clear method */
  _clearSpy: ReturnType<typeof vi.fn>;
}

/**
 * Extended ProfilerEventsInterface with spy methods for testing
 */
export interface SpyEvents extends ProfilerEventsInterface {
  /** Spy for subscribe method */
  _subscribeSpy: ReturnType<typeof vi.fn>;
  /** Spy for emit method */
  _emitSpy: ReturnType<typeof vi.fn>;
  /** Spy for clear method */
  _clearSpy: ReturnType<typeof vi.fn>;
  /** Spy for hasListeners method */
  _hasListenersSpy: ReturnType<typeof vi.fn>;
}

/**
 * Creates a simple mock for ProfilerCacheInterface (no caching logic)
 *
 * All methods are Vitest mocks that can be spied on.
 * The cache always computes values (no actual caching).
 *
 * Useful for:
 * - Testing that methods are called with correct arguments
 * - Verifying interaction with cache without real caching behavior
 * - Isolating tests from caching side effects
 *
 * @returns Mock implementation of ProfilerCacheInterface
 *
 * @example
 * ```typescript
 * const mockCache = createMockCache();
 * const data = new ProfilerData(mockCache);
 *
 * data.addRender('mount');
 *
 * // Verify cache methods were called
 * expect(mockCache.invalidate).toHaveBeenCalledWith('mount');
 * expect(mockCache.invalidate).toHaveBeenCalledTimes(1);
 * ```
 *
 * @since v1.7.0
 */
export function createMockCache(): ProfilerCacheInterface {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
    getPhaseCache: vi.fn((_phase, compute) => compute()),
    invalidate: vi.fn(),
    clear: vi.fn(),
  };
}

/**
 * Creates a spy cache with REAL caching logic
 *
 * This mock implements actual caching behavior while also providing
 * spy methods to verify calls. Best of both worlds for testing.
 *
 * Features:
 * - Real caching (same object returned on cache hit)
 * - Smart invalidation (removes only affected entries)
 * - Spy methods for verification (_getPhaseCacheSpy, etc.)
 *
 * Useful for:
 * - Testing that caching works correctly
 * - Verifying cache hits/misses
 * - Testing cache invalidation logic
 *
 * @returns Spy implementation of ProfilerCacheInterface with real caching
 *
 * @example
 * ```typescript
 * const spyCache = createSpyCache();
 * const data = new ProfilerData(spyCache);
 *
 * data.addRender('mount');
 * data.addRender('update');
 *
 * const mounts1 = data.getRendersByPhase('mount');
 * const mounts2 = data.getRendersByPhase('mount');
 *
 * // Verify caching works
 * expect(mounts1).toBe(mounts2); // Same object (cached!)
 * expect(spyCache._getPhaseCacheSpy).toHaveBeenCalledTimes(2);
 *
 * // Verify cache hit
 * expect(spyCache._getPhaseCacheSpy).toHaveReturnedWith(mounts1);
 * ```
 *
 * @since v1.7.0
 */
export function createSpyCache(): SpyCache {
  const cache = new Map<string, unknown>();

  const getPhaseCacheSpy = vi.fn(
    (phase: PhaseType, compute: () => readonly PhaseType[]) => {
      const key = `phase:${phase}`;

      if (cache.has(key)) {
        return cache.get(key) as readonly PhaseType[];
      }

      const value = Object.freeze(compute());

      cache.set(key, value);

      return value;
    },
  );

  const invalidateSpy = vi.fn((phase: PhaseType) => {
    cache.delete(`phase:${phase}`);
  });

  const clearSpy = vi.fn(() => {
    cache.clear();
  });

  return {
    getPhaseCache: getPhaseCacheSpy,
    invalidate: invalidateSpy,
    clear: clearSpy,
    // Expose spy methods for testing
    _getPhaseCacheSpy: getPhaseCacheSpy,
    _invalidateSpy: invalidateSpy,
    _clearSpy: clearSpy,
  };
}

/**
 * Creates a no-op cache that never caches anything
 *
 * All methods compute values on every call. Useful for:
 * - Debugging caching issues
 * - Testing behavior without cache side effects
 * - Verifying that code works without caching
 *
 * @returns No-op implementation of ProfilerCacheInterface
 *
 * @example
 * ```typescript
 * const noOpCache = createNoOpCache();
 * const data = new ProfilerData(noOpCache);
 *
 * data.addRender('mount');
 *
 * const history1 = data.getHistory();
 * const history2 = data.getHistory();
 *
 * // Different objects (no caching)
 * expect(history1).not.toBe(history2);
 * // But same content
 * expect(history1).toEqual(history2);
 * ```
 *
 * @since v1.7.0
 */
export function createNoOpCache(): ProfilerCacheInterface {
  return {
    getPhaseCache: (_phase, compute) => compute(),
    invalidate: () => {},
    clear: () => {},
  };
}

/**
 * Creates a simple mock for IProfilerEvents
 *
 * All methods are Vitest mocks. Default behavior:
 * - subscribe() returns a no-op unsubscribe function
 * - hasListeners() returns false
 * - emit() and clear() do nothing
 *
 * Useful for:
 * - Testing event subscription/unsubscription
 * - Verifying events are emitted with correct data
 * - Testing event listener behavior
 *
 * @param options - Optional configuration for mock behavior
 * @param options.hasListeners - Whether hasListeners() should return true (default: false)
 *
 * @returns Mock implementation of ProfilerEventsInterface
 *
 * @example
 * ```typescript
 * // No listeners
 * const mockEvents = createMockEvents();
 * expect(mockEvents.hasListeners()).toBe(false);
 *
 * // With listeners
 * const mockEventsWithListeners = createMockEvents({ hasListeners: true });
 * expect(mockEventsWithListeners.hasListeners()).toBe(true);
 * ```
 *
 * @example
 * ```typescript
 * const mockEvents = createMockEvents({ hasListeners: true });
 * const data = new ProfilerData(undefined, () => mockEvents);
 *
 * data.getEvents(); // Initialize
 * data.addRender('mount');
 *
 * // Verify emit was called
 * expect(mockEvents.emit).toHaveBeenCalledTimes(1);
 * expect(mockEvents.emit).toHaveBeenCalledWith(
 *   expect.objectContaining({
 *     count: 1,
 *     phase: 'mount',
 *   })
 * );
 * ```
 *
 * @since v1.7.0
 */
export function createMockEvents(options?: {
  hasListeners?: boolean;
}): ProfilerEventsInterface {
  const { hasListeners = false } = options ?? {};

  return {
    // eslint-disable-next-line unicorn/consistent-function-scoping
    subscribe: vi.fn(() => () => {}), // Returns no-op unsubscribe
    emit: vi.fn(),
    clear: vi.fn(),
    hasListeners: vi.fn(() => hasListeners),
  };
}

/**
 * Creates a spy events implementation with REAL event logic
 *
 * This mock implements actual event subscription/emission while providing
 * spy methods for verification.
 *
 * Features:
 * - Real listener management (Set-based)
 * - Real emission (calls all listeners)
 * - Real unsubscribe (removes listener)
 * - Spy methods for verification (_subscribeSpy, _emitSpy, etc.)
 *
 * Useful for:
 * - Testing that event system works correctly
 * - Verifying listeners are called with correct data
 * - Testing unsubscribe behavior
 *
 * @returns Spy implementation of ProfilerEventsInterface with real event logic
 *
 * @example
 * ```typescript
 * const spyEvents = createSpyEvents();
 * const data = new ProfilerData(undefined, () => spyEvents);
 *
 * let receivedInfo;
 * const unsubscribe = spyEvents.subscribe((info) => {
 *   receivedInfo = info;
 * });
 *
 * data.addRender('mount');
 *
 * // Verify listener was called
 * expect(receivedInfo).toEqual({
 *   count: 1,
 *   phase: 'mount',
 *   history: ['mount'],
 * });
 *
 * // Verify spy
 * expect(spyEvents._emitSpy).toHaveBeenCalledTimes(1);
 * ```
 *
 * @since v1.7.0
 */
export function createSpyEvents(): SpyEvents {
  const listeners = new Set<RenderListener>();

  const subscribeSpy = vi.fn((listener: RenderListener) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  });

  const emitSpy = vi.fn((info: Parameters<RenderListener>[0]) => {
    for (const listener of listeners) {
      listener(info);
    }
  });

  const clearSpy = vi.fn(() => {
    listeners.clear();
  });

  const hasListenersSpy = vi.fn(() => {
    return listeners.size > 0;
  });

  return {
    subscribe: subscribeSpy,
    emit: emitSpy,
    clear: clearSpy,
    hasListeners: hasListenersSpy,
    // Expose spy methods for testing
    _subscribeSpy: subscribeSpy,
    _emitSpy: emitSpy,
    _clearSpy: clearSpy,
    _hasListenersSpy: hasListenersSpy,
  };
}
