import { useState, useEffect } from "react";
import { describe, it, expect } from "vitest";

import { profileHook } from "../../src";

describe("profileHook - Integration with matchers", () => {
  it("should work with toHaveRendered", () => {
    const { ProfiledHook } = profileHook(() => useState(0));

    expect(ProfiledHook).toHaveRendered();
  });

  it("should work with toHaveMountedOnce", () => {
    const { ProfiledHook } = profileHook(() => useState(0));

    expect(ProfiledHook).toHaveMountedOnce();
  });

  it("should work with toHaveRenderedWithin", () => {
    const { ProfiledHook } = profileHook(() => useState(0));

    expect(ProfiledHook).toHaveRenderedWithin(100);
  });

  it("should work with getRenderHistory", () => {
    function useBadHook() {
      const [, setState] = useState(0);

      useEffect(() => {
        setState(1);
      }, []);
    }

    const { ProfiledHook } = profileHook(() => {
      useBadHook();
    });
    const history = ProfiledHook.getRenderHistory();

    expect(history).toHaveLength(2);
    expect(history[0]!.phase).toBe("mount");
    expect(history[1]!.phase).toBe("update");
  });
});
