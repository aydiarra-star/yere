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

/** Older backup formats predate marketplace export, so they restore an empty local vitrine. */
export function normalizeBackupMarketplaceListings(
  schemaVersion: number,
  data: Record<string, unknown>
): unknown {
  return schemaVersion < 5 ? [] : data.marketplaceListings;
}
