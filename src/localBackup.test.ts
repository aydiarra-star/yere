import { describe, expect, it } from "vitest";
import { normalizeBackupOnboardingState } from "./localBackup";

describe("legacy local backup onboarding compatibility", () => {
  it("restores older backups without onboarding fields into the app instead of restarting setup", () => {
    for (const schemaVersion of [1, 2, 3]) {
      expect(normalizeBackupOnboardingState(schemaVersion, {})).toEqual({
        onboardingComplete: true,
        onboardingStartedAt: null
      });
    }
  });

  it("preserves explicit valid onboarding values in older backups", () => {
    expect(normalizeBackupOnboardingState(3, {
      onboardingComplete: false,
      onboardingStartedAt: 1760000000000
    })).toEqual({
      onboardingComplete: false,
      onboardingStartedAt: 1760000000000
    });
  });

  it("does not silently fill missing required fields in the current schema", () => {
    expect(normalizeBackupOnboardingState(4, {})).toEqual({
      onboardingComplete: undefined,
      onboardingStartedAt: undefined
    });
  });

  it("does not hide invalid explicit values", () => {
    expect(normalizeBackupOnboardingState(3, {
      onboardingComplete: "yes",
      onboardingStartedAt: "yesterday"
    })).toEqual({
      onboardingComplete: "yes",
      onboardingStartedAt: "yesterday"
    });
  });
});
