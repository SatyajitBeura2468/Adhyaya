type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeOptionalTime(value: string): string | null;
export function normalizeOptionalTime(value: unknown): unknown;
export function normalizeOptionalTime(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

/**
 * Keep optional period times compatible with the persisted timetable schema.
 * This is deliberately applied server-side as well as by the onboarding form:
 * callers can never bypass it by posting JSON directly.
 */
export function normalizeOnboardingInput(input: unknown): unknown {
  if (!isRecord(input)) return input;

  return {
    ...input,
    periods: Array.isArray(input.periods)
      ? input.periods.map((period) => {
          if (!isRecord(period)) return period;

          return {
            ...period,
            startsAt: normalizeOptionalTime(period.startsAt),
            endsAt: normalizeOptionalTime(period.endsAt),
          };
        })
      : input.periods,
  };
}
