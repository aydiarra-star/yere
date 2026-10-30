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


import type { Order, OrderPayment, OrderStatus, RetouchStage } from "../domain";

type OrderRow = {
  id: string; reference: string; client_id: string; vetement: string;
  date_commande: string; date_livraison: string | null; statut: string;
  prix_fcfa: number | string; type_travail: string; etape_retouche: string | null;
  mensuration_snapshot: unknown; mensuration_snapshot_date: string | null;
};
type PaymentRow = {
  id: string; commande_id: string; montant_fcfa: number | string;
  date_paiement: string; note: string | null;
};
const statusToDb: Record<OrderStatus, string> = {
  "À préparer": "a_preparer", "En confection": "en_confection", "Prêt": "pret", "Livré": "livre"
};
const statusFromDb: Record<string, OrderStatus> = {
  a_preparer: "À préparer", en_confection: "En confection", pret: "Prêt", livre: "Livré"
};
const retouchToDb: Record<RetouchStage, string> = {
  "À examiner": "a_examiner", "En retouche": "en_retouches", "À essayer": "a_essayer",
  "Correction demandée": "correction_demandee", "Terminée": "terminee"
};
const retouchFromDb: Record<string, RetouchStage> = Object.fromEntries(
  Object.entries(retouchToDb).map(([label, value]) => [value, label])
) as Record<string, RetouchStage>;

function mapOrder(row: OrderRow, payments: PaymentRow[]): Order {
  const orderPayments: OrderPayment[] = payments.map((payment) => ({
    id: payment.id,
    amount: Number(payment.montant_fcfa),
    paidAt: payment.date_paiement.slice(0, 10),
    ...(payment.note ? { note: payment.note } : {})
  }));
  const snapshot = row.mensuration_snapshot && typeof row.mensuration_snapshot === "object"
    && !Array.isArray(row.mensuration_snapshot)
    ? row.mensuration_snapshot as Measurement : undefined;
  return {
    id: row.reference,
    serverId: row.id,
    clientId: row.client_id,
    garment: row.vetement,
    dueDate: row.date_livraison ?? row.date_commande,
    orderedAt: row.date_commande,
    price: Number(row.prix_fcfa),
    deposit: orderPayments.reduce((sum, payment) => sum + payment.amount, 0),
    payments: orderPayments,
    status: statusFromDb[row.statut] ?? "À préparer",
    kind: row.type_travail === "retouche" ? "retouche" : "confection",
    ...(row.type_travail === "retouche" && row.etape_retouche && retouchFromDb[row.etape_retouche]
      ? { retouchStage: retouchFromDb[row.etape_retouche] } : {}),
    ...(snapshot && row.mensuration_snapshot_date
      ? { measurementSnapshot: snapshot, measurementSnapshotAt: row.mensuration_snapshot_date } : {})
  };
}

export async function listAtelierOrders(session: YereSession, atelierId: string): Promise<Order[]> {
  const filter = encodeURIComponent(atelierId);
  const [ordersResponse, paymentsResponse] = await Promise.all([
    authenticatedFetch(session, `rest/v1/commande?select=id,reference,client_id,vetement,date_commande,date_livraison,statut,prix_fcfa,type_travail,etape_retouche,mensuration_snapshot,mensuration_snapshot_date&atelier_id=eq.${filter}&order=date_commande.desc,created_at.desc`),
    authenticatedFetch(session, `rest/v1/paiement?select=id,commande_id,montant_fcfa,date_paiement,note&atelier_id=eq.${filter}&statut=eq.confirme&order=date_paiement.asc`)
  ]);
  const [ordersData, paymentsData] = await Promise.all([responseJson(ordersResponse), responseJson(paymentsResponse)]);
  if (!Array.isArray(ordersData) || !Array.isArray(paymentsData)) throw new Error("Réponse serveur inattendue lors du chargement des commandes.");
  const paymentsByOrder = new Map<string, PaymentRow[]>();
  for (const payment of paymentsData as PaymentRow[]) {
    const current = paymentsByOrder.get(payment.commande_id) ?? [];
    current.push(payment);
    paymentsByOrder.set(payment.commande_id, current);
  }
  return (ordersData as OrderRow[]).map((row) => mapOrder(row, paymentsByOrder.get(row.id) ?? []));
}

export async function createAtelierOrder(
  session: YereSession,
  atelierId: string,
  input: { reference: string; clientId: string; garment: string; orderedAt: string; dueDate: string;
    price: number; deposit: number; status: OrderStatus; kind: "confection" | "retouche";
    retouchStage?: RetouchStage; measurementSnapshot: Measurement; measurementSnapshotAt: string }
): Promise<Order> {
  const paymentKey = `yere-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const response = await authenticatedFetch(session, "rest/v1/rpc/create_commande_with_initial_payment", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      p_atelier_id: atelierId, p_reference: input.reference, p_client_id: input.clientId,
      p_vetement: input.garment, p_date_commande: input.orderedAt, p_date_livraison: input.dueDate,
      p_statut: statusToDb[input.status], p_prix: input.price, p_type_travail: input.kind,
      p_etape_retouche: input.retouchStage ? retouchToDb[input.retouchStage] : null,
      p_mensuration_snapshot: input.measurementSnapshot, p_mensuration_snapshot_date: input.measurementSnapshotAt,
      p_acompte_initial: input.deposit, p_payment_key: paymentKey
    })
  });
  const data = await responseJson(response);
  const row = Array.isArray(data) ? data[0] as { commande_id?: string; reference?: string } | undefined : undefined;
  if (!row?.commande_id || !row.reference) throw new Error("Le serveur n'a pas confirmé la création de la commande.");
  const payments: OrderPayment[] = input.deposit > 0
    ? [{ id: paymentKey, amount: input.deposit, paidAt: input.orderedAt, note: "Acompte initial" }]
    : [];
  return {
    id: row.reference, serverId: row.commande_id, clientId: input.clientId, garment: input.garment,
    dueDate: input.dueDate, orderedAt: input.orderedAt, price: input.price, deposit: input.deposit,
    payments, status: input.status, kind: input.kind,
    ...(input.retouchStage ? { retouchStage: input.retouchStage } : {}),
    measurementSnapshot: { ...input.measurementSnapshot }, measurementSnapshotAt: input.measurementSnapshotAt
  };
}

export async function saveAtelierPayment(
  session: YereSession, atelierId: string, order: Order, payment: Omit<OrderPayment, "id">
): Promise<OrderPayment> {
  if (!order.serverId) throw new Error("Cette commande historique doit être resynchronisée avant d'y enregistrer un versement.");
  const key = `yere-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  const response = await authenticatedFetch(session, "rest/v1/paiement?select=id,commande_id,montant_fcfa,date_paiement,note", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      atelier_id: atelierId, commande_id: order.serverId, montant_fcfa: payment.amount,
      date_paiement: `${payment.paidAt}T12:00:00Z`, statut: "confirme",
      cle_idempotence: key, note: payment.note ?? null
    })
  });
  const data = await responseJson(response);
  const row = Array.isArray(data) ? data[0] as PaymentRow | undefined : undefined;
  if (!row) throw new Error("Le serveur n'a pas confirmé le versement.");
  return { id: row.id, amount: Number(row.montant_fcfa), paidAt: row.date_paiement.slice(0, 10), ...(row.note ? { note: row.note } : {}) };
}

export async function saveAtelierOrderStatus(
  session: YereSession, atelierId: string, order: Order, status: OrderStatus,
  retouchStage?: RetouchStage
): Promise<void> {
  const filter = `atelier_id=eq.${encodeURIComponent(atelierId)}&reference=eq.${encodeURIComponent(order.id)}&select=id`;
  const patch: Record<string, unknown> = { statut: statusToDb[status] };
  if (retouchStage) patch.etape_retouche = retouchToDb[retouchStage];
  const response = await authenticatedFetch(session, `rest/v1/commande?${filter}`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch)
  });
  const data = await responseJson(response);
  if (!Array.isArray(data) || data.length !== 1) throw new Error("La mise à jour n'a pas été confirmée par le serveur.");
}
