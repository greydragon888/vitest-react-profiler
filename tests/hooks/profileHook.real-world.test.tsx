import { useState, useEffect } from "react";
import { describe, it, expect } from "vitest";

import { profileHook } from "@/hooks";

describe("profileHook - Real-world examples", () => {
  it("should detect data fetching anti-pattern", () => {
    function useBadDataFetch(id: string) {
      const [data, setData] = useState<{ id: string; name: string } | null>(
        null,
      );
      const [loading, setLoading] = useState(false);

      useEffect(() => {
        setLoading(true); // Render 1
        setTimeout(() => {
          setData({ id, name: `Item ${id}` });
          setLoading(false); // Render 2
        }, 0);
      }, [id]);

      return { data, loading };
    }

    const { ProfiledHook } = profileHook(() => useBadDataFetch("1"));

    // Initial + setLoading = 2 renders already
    expect(ProfiledHook.getRenderCount()).toBeGreaterThanOrEqual(2);
  });

  it("should detect dependent state anti-pattern", () => {
    function useDependentStates(value: number) {
      const [primary] = useState(value);
      const [derived, setDerived] = useState(0);

      useEffect(() => {
        setDerived(primary * 2); // Extra render!
      }, [primary]);

      return { primary, derived };
    }

    const { ProfiledHook } = profileHook(
      ({ value }) => useDependentStates(value),
      { value: 1 },
    );

    // Mount + effect = 2 renders
    expect(ProfiledHook).toHaveRenderedTimes(2);
  });
});
