import { describe, expect, it } from "vitest";

import { normalizeOnboardingInput, normalizeOptionalTime } from "./onboarding";

describe("onboarding period time normalization", () => {
  it("turns empty client time values into null", () => {
    expect(normalizeOptionalTime("")).toBeNull();
    expect(normalizeOptionalTime("   ")).toBeNull();
    expect(normalizeOptionalTime(" 09:15 ")).toBe("09:15");
  });

  it("normalizes every period before server validation while preserving malformed values", () => {
    expect(normalizeOnboardingInput({
      periods: [
        { label: "Period 1", startsAt: "", endsAt: "  " },
        { label: "Period 2", startsAt: "09:15", endsAt: 42 },
      ],
    })).toEqual({
      periods: [
        { label: "Period 1", startsAt: null, endsAt: null },
        { label: "Period 2", startsAt: "09:15", endsAt: 42 },
      ],
    });
  });
});
