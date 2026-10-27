import { describe, expect, it } from "vitest";
import { preserveRejectedStorageValue } from "./usePersistentState";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    values
  };
}

describe("preserveRejectedStorageValue", () => {
  it("copies rejected raw data before the main key is reset", () => {
    const storage = createStorage();
    const raw = "{not valid JSON";

    expect(preserveRejectedStorageValue(storage, "yere-clients", raw)).toBe(true);
    expect(storage.values.get("yere-clients.recovery")).toBe(raw);
  });

  it("does not replace an existing recovery copy", () => {
    const previous = '{"older":"snapshot"}';
    const storage = createStorage({ "yere-clients.recovery": previous });

    expect(preserveRejectedStorageValue(storage, "yere-clients", previous)).toBe(true);
    expect(storage.values.get("yere-clients.recovery")).toBe(previous);
    expect(storage.values.has("yere-clients.recovery-2")).toBe(false);
  });

  it("stores a distinct rejected value under the next recovery key", () => {
    const previous = '{"older":"snapshot"}';
    const current = '{"newer":"snapshot"}';
    const storage = createStorage({ "yere-clients.recovery": previous });

    expect(preserveRejectedStorageValue(storage, "yere-clients", current)).toBe(true);
    expect(storage.values.get("yere-clients.recovery")).toBe(previous);
    expect(storage.values.get("yere-clients.recovery-2")).toBe(current);
  });

  it("reports failure when browser storage cannot write a recovery copy", () => {
    const storage = {
      getItem() {
        return null;
      },
      setItem() {
        throw new Error("quota exceeded");
      }
    };

    expect(preserveRejectedStorageValue(storage, "yere-clients", "bad data")).toBe(false);
  });
});
