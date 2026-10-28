/** Backward-compatible defaults for onboarding fields introduced after legacy backup formats. */
export function normalizeBackupOnboardingState(
  schemaVersion: number,
  data: Record<string, unknown>
): { onboardingComplete: unknown; onboardingStartedAt: unknown } {
  const isLegacySchema = schemaVersion < 4;
  return {
    onboardingComplete: data.onboardingComplete === undefined && isLegacySchema
      ? true
      : data.onboardingComplete,
    onboardingStartedAt: data.onboardingStartedAt === undefined && isLegacySchema
      ? null
      : data.onboardingStartedAt
  };
}
