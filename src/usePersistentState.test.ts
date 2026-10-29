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

  it("reuses a later recovery slot when the rejected value already exists there", () => {
    const raw = '{"snapshot":"kept"}';
    const storage = createStorage({
      "yere-clients.recovery": '{"older":"snapshot"}',
      "yere-clients.recovery-2": raw
    });

    expect(preserveRejectedStorageValue(storage, "yere-clients", raw)).toBe(true);
    expect(storage.values.size).toBe(2);
    expect(storage.values.get("yere-clients.recovery-2")).toBe(raw);
  });

  it("does not claim success when storage silently fails to retain a recovery copy", () => {
    const storage = {
      getItem() {
        return null;
      },
      setItem() {
        // Simulate browser storage accepting a call but not retaining the value.
      }
    };

    expect(preserveRejectedStorageValue(storage, "yere-clients", "damaged data")).toBe(false);
  });

  it("fails safely when all recovery slots are occupied", () => {
    const initial: Record<string, string> = {};
    for (let index = 1; index <= 100; index += 1) {
      const key = index === 1 ? "yere-clients.recovery" : `yere-clients.recovery-${index}`;
      initial[key] = `existing snapshot ${index}`;
    }
    const storage = createStorage(initial);

    expect(preserveRejectedStorageValue(storage, "yere-clients", "new damaged data")).toBe(false);
    expect(storage.values.size).toBe(100);
    expect(storage.values.get("yere-clients.recovery")).toBe("existing snapshot 1");
  });
});
