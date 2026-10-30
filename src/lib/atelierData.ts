import type { Client, Measurement, MeasurementVersion } from "../domain";
import { authenticatedFetch, type YereSession } from "./supabaseAuth";

type ClientRow = { id: string; nom: string; telephone: string | null; created_at: string };
type MeasurementRow = { id: string; client_id: string; date_mesure: string; valeurs: unknown; note: string | null };

const emptyMeasurement: Measurement = {
  bust: "", waist: "", hips: "", shoulder: "", sleeve: "", length: "",
  arm: "", neck: "", thigh: "", legLength: "", garmentType: "Tenue complète", note: ""
};

function toMeasurement(row: MeasurementRow): Measurement {
  const value = row.valeurs && typeof row.valeurs === "object" && !Array.isArray(row.valeurs)
    ? row.valeurs as Record<string, unknown>
    : {};
  const text = (key: string, fallback = "") => typeof value[key] === "string" ? value[key] as string : fallback;
  return {
    bust: text("bust"), waist: text("waist"), hips: text("hips"), shoulder: text("shoulder"),
    sleeve: text("sleeve"), length: text("length"), arm: text("arm"), neck: text("neck"),
    thigh: text("thigh"), legLength: text("legLength"), garmentType: text("garmentType", "Tenue complète"),
    note: row.note ?? text("note")
  };
}

async function responseJson(response: Response): Promise<unknown> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const item = body as Record<string, unknown>;
    throw new Error(String(item.message ?? item.details ?? item.hint ?? item.error ?? `Erreur serveur (${response.status})`));
  }
  return body;
}

export async function listAtelierClients(session: YereSession, atelierId: string): Promise<Client[]> {
  const filter = encodeURIComponent(atelierId);
  const [clientsResponse, measurementsResponse] = await Promise.all([
    authenticatedFetch(session, `rest/v1/client?select=id,nom,telephone,created_at&atelier_id=eq.${filter}&order=created_at.desc`),
    authenticatedFetch(session, `rest/v1/mensuration?select=id,client_id,date_mesure,valeurs,note&atelier_id=eq.${filter}&order=date_mesure.desc,created_at.desc`)
  ]);
  const [clientsData, measurementsData] = await Promise.all([responseJson(clientsResponse), responseJson(measurementsResponse)]);
  if (!Array.isArray(clientsData) || !Array.isArray(measurementsData)) throw new Error("Réponse serveur inattendue lors du chargement des clients.");
  const versionsByClient = new Map<string, MeasurementVersion[]>();
  for (const raw of measurementsData as MeasurementRow[]) {
    const versions = versionsByClient.get(raw.client_id) ?? [];
    versions.push({ id: raw.id, measuredAt: raw.date_mesure, measurement: toMeasurement(raw) });
    versionsByClient.set(raw.client_id, versions);
  }
  return (clientsData as ClientRow[]).map((row) => {
    const history = versionsByClient.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.nom,
      phone: row.telephone ?? "",
      createdAt: row.created_at.slice(0, 10),
      measurement: history[0]?.measurement ?? { ...emptyMeasurement },
      measurementHistory: history
    };
  });
}

export async function createAtelierClient(session: YereSession, atelierId: string, input: { name: string; phone: string }): Promise<Client> {
  const response = await authenticatedFetch(session, "rest/v1/client?select=id,nom,telephone,created_at", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ atelier_id: atelierId, nom: input.name, telephone: input.phone || null })
  });
  const data = await responseJson(response);
  const row = Array.isArray(data) ? data[0] as ClientRow | undefined : undefined;
  if (!row) throw new Error("Le serveur n'a pas confirmé la création du client.");
  return { id: row.id, name: row.nom, phone: row.telephone ?? "", createdAt: row.created_at.slice(0, 10), measurement: { ...emptyMeasurement }, measurementHistory: [] };
}

export async function saveAtelierMeasurement(session: YereSession, atelierId: string, clientId: string, measurement: Measurement, measuredAt: string): Promise<void> {
  const response = await authenticatedFetch(session, "rest/v1/mensuration", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      atelier_id: atelierId,
      client_id: clientId,
      date_mesure: measuredAt,
      valeurs: measurement,
      note: measurement.note || null
    })
  });
  await responseJson(response);
}
