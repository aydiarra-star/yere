/**
 * YÉRÉ encrypted, read-only offline cache foundation.
 *
 * Important: this module is deliberately not wired into the UI/data loaders yet.
 * The caller must only save server-confirmed snapshots after checking active
 * atelier membership and role. It never reads legacy localStorage archives.
 *
 * AES-GCM protects cached bytes at rest. The non-extractable CryptoKey is stored
 * in IndexedDB; this is not protection against same-origin malicious JavaScript,
 * device compromise, or a user with access to an unlocked browser profile.
 */
export type OfflineRole = "proprietaire" | "gestionnaire" | "employe";
export type OfflineDataset = "clients" | "orders" | "stock";
export type OfflineVaultContext = {
  userId: string;
  atelierId: string;
  role: OfflineRole;
  membershipActive: boolean;
  serverVerifiedAt: number;
};
type VaultRecord = {
  id: string;
  userId: string;
  atelierId: string;
  dataset: OfflineDataset;
  role: OfflineRole;
  serverVerifiedAt: number;
  syncedAt: number;
  expiresAt: number;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
};
const DB_NAME = "yere-offline-vault-v1";
const DB_VERSION = 1;
const KEY_STORE = "keys";
const DATA_STORE = "snapshots";
export const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const datasets: OfflineDataset[] = ["clients", "orders", "stock"];

function validContext(context: OfflineVaultContext): void {
  if (!context.userId.trim() || !context.atelierId.trim()) throw new Error("Compte ou atelier absent : cache hors ligne refusé.");
  if (!context.membershipActive) throw new Error("L’accès à cet atelier n’est pas actif : cache hors ligne refusé.");
  if (!["proprietaire", "gestionnaire", "employe"].includes(context.role)) throw new Error("Rôle non autorisé pour le cache hors ligne.");
  if (!Number.isFinite(context.serverVerifiedAt) || context.serverVerifiedAt <= 0) throw new Error("La vérification serveur est absente.");
}
function recordId(userId: string, atelierId: string, dataset: OfflineDataset): string {
  return [userId, atelierId, dataset].map(encodeURIComponent).join("::");
}
function additionalData(userId: string, atelierId: string, dataset: OfflineDataset): Uint8Array {
  return new TextEncoder().encode(`yere-offline-v1|${userId}|${atelierId}|${dataset}`);
}
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function pick(value: unknown, fields: string[]): Record<string, unknown> {
  if (!object(value)) throw new Error("Format de données hors ligne invalide.");
  return Object.fromEntries(fields.filter((field) => value[field] !== undefined).map((field) => [field, value[field]]));
}

/** Removes financial fields and rejects any unapproved dataset before encryption. */
export function sanitizeOfflineSnapshot(dataset: OfflineDataset, value: unknown): unknown {
  if (!datasets.includes(dataset)) throw new Error("Ce type de données ne peut pas être conservé hors ligne.");
  if (dataset === "clients") {
    if (!Array.isArray(value)) throw new Error("Liste de clients invalide.");
    return value.map((item) => {
      const client = pick(item, ["id", "name", "phone", "createdAt", "measurement", "measurementHistory"]);
      if (client.measurement !== undefined) client.measurement = pick(client.measurement, [
        "bust", "waist", "hips", "shoulder", "sleeve", "length", "arm", "neck", "thigh", "legLength", "garmentType", "note"
      ]);
      if (Array.isArray(client.measurementHistory)) client.measurementHistory = client.measurementHistory.map((entry) => {
        const version = pick(entry, ["id", "measuredAt", "measurement"]);
        if (version.measurement !== undefined) version.measurement = pick(version.measurement, [
          "bust", "waist", "hips", "shoulder", "sleeve", "length", "arm", "neck", "thigh", "legLength", "garmentType", "note"
        ]);
        return version;
      });
      return client;
    });
  }
  if (dataset === "orders") {
    if (!Array.isArray(value)) throw new Error("Liste de commandes invalide.");
    return value.map((item) => {
      const order = pick(item, [
        "id", "serverId", "clientId", "garment", "dueDate", "orderedAt", "status", "kind",
        "retouchStage", "measurementSnapshot", "measurementSnapshotAt"
      ]);
      if (order.measurementSnapshot !== undefined) order.measurementSnapshot = pick(order.measurementSnapshot, [
        "bust", "waist", "hips", "shoulder", "sleeve", "length", "arm", "neck", "thigh", "legLength", "garmentType", "note"
      ]);
      return order;
    });
  }
  if (!object(value) || !Array.isArray(value.items) || !Array.isArray(value.movements)) {
    throw new Error("Données de stock invalides.");
  }
  return {
    items: value.items.map((item) => pick(item, ["id", "name", "unit", "quantity", "minimumQuantity", "createdAt"])),
    movements: value.movements.map((item) => pick(item, ["id", "itemId", "type", "quantity", "movedAt", "note"]))
  };
}


export async function encryptOfflinePayload(
  context: Pick<OfflineVaultContext, "userId" | "atelierId">,
  dataset: OfflineDataset,
  payload: unknown,
  key: CryptoKey,
  iv = crypto.getRandomValues(new Uint8Array(12))
): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const safe = sanitizeOfflineSnapshot(dataset, payload);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(context.userId, context.atelierId, dataset) },
    key,
    new TextEncoder().encode(JSON.stringify(safe))
  );
  return { iv, ciphertext };
}

export async function decryptOfflinePayload<T = unknown>(
  context: Pick<OfflineVaultContext, "userId" | "atelierId">,
  dataset: OfflineDataset,
  encrypted: { iv: Uint8Array; ciphertext: ArrayBuffer },
  key: CryptoKey
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encrypted.iv, additionalData: additionalData(context.userId, context.atelierId, dataset) },
    key,
    encrypted.ciphertext
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Le stockage sécurisé hors ligne n’est pas disponible sur cet appareil."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
      if (!db.objectStoreNames.contains(DATA_STORE)) db.createObjectStore(DATA_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d’ouvrir le coffre hors ligne."));
  });
}
function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Écriture du coffre impossible."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Écriture du coffre annulée."));
  });
}
async function getOrCreateKey(db: IDBDatabase, scope: string): Promise<CryptoKey> {
  const read = db.transaction(KEY_STORE, "readonly");
  const existing = await new Promise<CryptoKey | undefined>((resolve, reject) => {
    const request = read.objectStore(KEY_STORE).get(scope);
    request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
    request.onerror = () => reject(request.error);
  });
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const write = db.transaction(KEY_STORE, "readwrite");
  write.objectStore(KEY_STORE).add(key, scope);
  try {
    await transactionDone(write);
    return key;
  } catch (cause) {
    // Concurrent tabs must never overwrite a key already used for encryption.
    const retry = db.transaction(KEY_STORE, "readonly");
    const winner = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const request = retry.objectStore(KEY_STORE).get(scope);
      request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
      request.onerror = () => reject(request.error);
    });
    if (winner) return winner;
    throw cause;
  }
}

export async function saveOfflineSnapshot(
  context: OfflineVaultContext,
  dataset: OfflineDataset,
  snapshot: unknown,
  now = Date.now()
): Promise<void> {
  validContext(context);
  const safe = sanitizeOfflineSnapshot(dataset, snapshot);
  if (!Number.isFinite(now) || now < context.serverVerifiedAt || now - context.serverVerifiedAt > OFFLINE_CACHE_TTL_MS) {
    throw new Error("La vérification serveur est trop ancienne : reconnectez-vous avant de préparer le cache.");
  }
  const db = await openDatabase();
  try {
    const scope = recordId(context.userId, context.atelierId, dataset);
    const key = await getOrCreateKey(db, scope);
    const encrypted = await encryptOfflinePayload(context, dataset, safe, key);
    const transaction = db.transaction(DATA_STORE, "readwrite");
    transaction.objectStore(DATA_STORE).put({
      id: scope, userId: context.userId, atelierId: context.atelierId, dataset,
      role: context.role, serverVerifiedAt: context.serverVerifiedAt,
      syncedAt: now, expiresAt: Math.min(now + OFFLINE_CACHE_TTL_MS, context.serverVerifiedAt + OFFLINE_CACHE_TTL_MS),
      iv: encrypted.iv, ciphertext: encrypted.ciphertext
    } satisfies VaultRecord);
    await transactionDone(transaction);
  } finally { db.close(); }
}

export async function readOfflineSnapshot<T = unknown>(
  context: OfflineVaultContext,
  dataset: OfflineDataset,
  now = Date.now()
): Promise<{ data: T; syncedAt: number; expiresAt: number } | null> {
  validContext(context);
  const db = await openDatabase();
  try {
    const id = recordId(context.userId, context.atelierId, dataset);
    const transaction = db.transaction(DATA_STORE, "readonly");
    const record = await new Promise<VaultRecord | undefined>((resolve, reject) => {
      const request = transaction.objectStore(DATA_STORE).get(id);
      request.onsuccess = () => resolve(request.result as VaultRecord | undefined);
      request.onerror = () => reject(request.error);
    });
    if (!record) return null;
    if (record.userId !== context.userId || record.atelierId !== context.atelierId || record.dataset !== dataset
      || record.role !== context.role || !Number.isFinite(record.expiresAt) || now > record.expiresAt || now < record.syncedAt) {
      await deleteSnapshot(db, id);
      return null;
    }
    const keyScope = id;
    const keyTransaction = db.transaction(KEY_STORE, "readonly");
    const key = await new Promise<CryptoKey | undefined>((resolve, reject) => {
      const request = keyTransaction.objectStore(KEY_STORE).get(keyScope);
      request.onsuccess = () => resolve(request.result as CryptoKey | undefined);
      request.onerror = () => reject(request.error);
    });
    if (!key) { await deleteSnapshot(db, id); return null; }
    try {
      const data = await decryptOfflinePayload<T>(context, dataset, { iv: record.iv, ciphertext: record.ciphertext }, key);
      return { data, syncedAt: record.syncedAt, expiresAt: record.expiresAt };
    } catch {
      await deleteSnapshot(db, id);
      return null;
    }
  } finally { db.close(); }
}
async function deleteSnapshot(db: IDBDatabase, id: string): Promise<void> {
  const transaction = db.transaction([DATA_STORE, KEY_STORE], "readwrite");
  transaction.objectStore(DATA_STORE).delete(id);
  transaction.objectStore(KEY_STORE).delete(id);
  await transactionDone(transaction);
}

/** Purges only the specified account/atelier cache; legacy localStorage is untouched. */
export async function purgeOfflineVault(context: Pick<OfflineVaultContext, "userId" | "atelierId">): Promise<void> {
  if (!context.userId.trim() || !context.atelierId.trim()) return;
  const db = await openDatabase();
  try {
    const transaction = db.transaction([DATA_STORE, KEY_STORE], "readwrite");
    const prefix = [context.userId, context.atelierId].map(encodeURIComponent).join("::") + "::";
    for (const storeName of [DATA_STORE, KEY_STORE]) {
      const store = transaction.objectStore(storeName);
      const request = store.openKeyCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        if (String(cursor.key).startsWith(prefix)) store.delete(cursor.primaryKey);
        cursor.continue();
      };
    }
    await transactionDone(transaction);
  } finally { db.close(); }
}
