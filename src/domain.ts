export type Measurement = {
  bust: string;
  waist: string;
  hips: string;
  shoulder: string;
  sleeve: string;
  length: string;
  /** Optional additions for backward compatibility with older saved profiles. */
  arm?: string;
  neck?: string;
  thigh?: string;
  legLength?: string;
  note: string;
};

export type MeasurementVersion = {
  id: string;
  measuredAt: string;
  measurement: Measurement;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  measurement: Measurement;
  measurementHistory?: MeasurementVersion[];
};

export function saveMeasurementVersion(
  client: Client,
  measurement: Measurement,
  measuredAt: string,
  versionId: string
): Client {
  const hasCurrentValues = Object.values(client.measurement).some((value) => value.trim() !== "");
  const history = client.measurementHistory ?? (hasCurrentValues
    ? [{ id: `legacy-${client.id}`, measuredAt: client.createdAt, measurement: client.measurement }]
    : []);
  return {
    ...client,
    measurement: { ...measurement },
    measurementHistory: [...history, {
      id: versionId,
      measuredAt,
      measurement: { ...measurement }
    }]
  };
}

export function isMeasurementValid(measurement: Measurement): boolean {
  const numericFields = [measurement.bust, measurement.waist, measurement.hips, measurement.shoulder, measurement.sleeve, measurement.length, measurement.arm ?? "", measurement.neck ?? "", measurement.thigh ?? "", measurement.legLength ?? ""];
  return numericFields.every((value) => {
    if (value.trim() === "") return true;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0;
  });
}

/** Runtime guards for data restored from browser storage (JSON is not type-safe). */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isMeasurementShape(value: unknown): value is Measurement {
  return isRecord(value)
    && ["bust", "waist", "hips", "shoulder", "sleeve", "length", "note"]
      .every((key) => typeof value[key] === "string")
    && ["arm", "neck", "thigh", "legLength"]
      .every((key) => value[key] === undefined || typeof value[key] === "string");
}

export function isClientListValid(value: unknown): value is Client[] {
  return Array.isArray(value) && value.every((item) => {
    if (!isRecord(item)
      || typeof item.id !== "string" || !item.id
      || typeof item.name !== "string"
      || typeof item.phone !== "string"
      || !isCalendarDate(item.createdAt)
      || !isMeasurementShape(item.measurement)) return false;
    if (item.measurementHistory === undefined) return true;
    return Array.isArray(item.measurementHistory) && item.measurementHistory.every((version) =>
      isRecord(version)
      && typeof version.id === "string"
      && isCalendarDate(version.measuredAt)
      && isMeasurementShape(version.measurement)
    );
  });
}

export type OrderStatus = "À préparer" | "En confection" | "Prêt" | "Livré";

export type Order = {
  id: string;
  clientId: string;
  garment: string;
  dueDate: string;
  orderedAt?: string;
  price: number;
  deposit: number;
  status: OrderStatus;
};

export function isOrderListValid(value: unknown): value is Order[] {
  return Array.isArray(value) && value.every((item) =>
    isRecord(item)
    && typeof item.id === "string" && item.id.length > 0
    && typeof item.clientId === "string" && item.clientId.length > 0
    && typeof item.garment === "string" && item.garment.trim().length > 0
    && isCalendarDate(item.dueDate)
    && (item.orderedAt === undefined || isCalendarDate(item.orderedAt))
    && typeof item.price === "number" && Number.isSafeInteger(item.price) && item.price > 0
    && typeof item.deposit === "number" && Number.isSafeInteger(item.deposit)
    && item.deposit >= 0 && item.deposit <= item.price
    && typeof item.status === "string" && ["À préparer", "En confection", "Prêt", "Livré"].some((status) => status === item.status)
  );
}

/** Reject duplicate record identifiers and orders pointing to missing clients during restore. */
export function areClientOrderRelationsValid(clients: Client[], orders: Order[]): boolean {
  const clientIds = new Set(clients.map((client) => client.id));
  const orderIds = new Set(orders.map((order) => order.id));
  return clientIds.size === clients.length
    && orderIds.size === orders.length
    && orders.every((order) => clientIds.has(order.clientId));
}

export const orderStatuses: OrderStatus[] = [
  "À préparer",
  "En confection",
  "Prêt",
  "Livré"
];

export function balanceDue(order: Pick<Order, "price" | "deposit">): number {
  return Math.max(0, order.price - order.deposit);
}

/** Validate a new order before it enters the prototype's local state. */
export function isOrderInputValid(
  input: { clientId: string; garment: string; dueDate: string; price: number; deposit: number },
  clientIds: string[]
): boolean {
  if (!input.clientId || !clientIds.includes(input.clientId) || !input.garment.trim()) return false;
  if (!Number.isSafeInteger(input.price) || input.price <= 0) return false;
  if (!Number.isSafeInteger(input.deposit) || input.deposit < 0 || input.deposit > input.price) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return false;
  const dueDate = new Date(`${input.dueDate}T12:00:00Z`);
  return Number.isFinite(dueDate.getTime()) && dueDate.toISOString().slice(0, 10) === input.dueDate;
}

export function formatXof(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0
  }).format(amount) + " FCFA";
}

export function matchesClient(client: Client, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase("fr-FR");
  if (!normalized) return true;
  return client.name.toLocaleLowerCase("fr-FR").includes(normalized)
    || client.phone.replace(/\s/g, "").includes(normalized.replace(/\s/g, ""));
}


export type ClientReminderSuggestion = {
  clientId: string;
  clientName: string;
  phone: string;
  kind: "inactive" | "occasion";
  title: string;
  detail: string;
  suggestedMessage: string;
  lastOrderAt: string;
  daysSinceOrder: number;
};

const occasionKeywords: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /mariage|mariée|marié/i, label: "tenue de mariage" },
  { pattern: /bapt[eê]me/i, label: "tenue de baptême" },
  { pattern: /tabaski/i, label: "tenue de Tabaski" },
  { pattern: /korit[eé]/i, label: "tenue de Korité" },
  { pattern: /rentr[eé]e/i, label: "tenue de rentrée" }
];

export function getClientReminderSuggestions(
  clients: Client[],
  orders: Order[],
  today: string,
  inactivityDays = 180
): ClientReminderSuggestion[] {
  const todayDate = new Date(`${today}T12:00:00Z`);
  if (!Number.isFinite(todayDate.getTime())) return [];

  const suggestions: ClientReminderSuggestion[] = [];
  for (const client of clients) {
    const datedOrders = orders
      .filter((order) => order.clientId === client.id && order.orderedAt)
      .filter((order) => Number.isFinite(new Date(`${order.orderedAt}T12:00:00Z`).getTime()))
      .sort((a, b) => (b.orderedAt ?? "").localeCompare(a.orderedAt ?? ""));
    const latestOrder = datedOrders[0];
    if (!latestOrder?.orderedAt) continue;

    const daysSinceOrder = Math.floor(
      (todayDate.getTime() - new Date(`${latestOrder.orderedAt}T12:00:00Z`).getTime()) / 86_400_000
    );
    if (daysSinceOrder < 0) continue;

    if (daysSinceOrder >= inactivityDays) {
      suggestions.push({
        clientId: client.id,
        clientName: client.name,
        phone: client.phone,
        kind: "inactive",
        title: "Client à réactiver",
        detail: `Dernière commande : ${latestOrder.garment}, il y a ${daysSinceOrder} jours.`,
        suggestedMessage: `Bonjour ${client.name}, j’espère que vous allez bien ! Cela fait quelque temps depuis votre dernière commande chez nous. Nous serions ravis de vous accompagner pour votre prochaine tenue. Avez-vous un événement ou une occasion à préparer ?`,
        lastOrderAt: latestOrder.orderedAt,
        daysSinceOrder
      });
    }

    const previousOccasionOrder = datedOrders.find((order) =>
      (todayDate.getTime() - new Date(`${order.orderedAt}T12:00:00Z`).getTime()) / 86_400_000 >= 180
      && occasionKeywords.some(({ pattern }) => pattern.test(order.garment))
    );
    if (previousOccasionOrder?.orderedAt) {
      const occasion = occasionKeywords.find(({ pattern }) => pattern.test(previousOccasionOrder.garment))?.label ?? previousOccasionOrder.garment;
      const occasionAge = Math.floor(
        (todayDate.getTime() - new Date(`${previousOccasionOrder.orderedAt}T12:00:00Z`).getTime()) / 86_400_000
      );
      if (occasionAge >= 300) {
        suggestions.push({
          clientId: client.id,
          clientName: client.name,
          phone: client.phone,
          kind: "occasion",
          title: "Occasion à anticiper",
          detail: `Vous aviez confectionné une ${occasion} il y a environ un an.`,
          suggestedMessage: `Bonjour ${client.name}, l’année dernière nous avions préparé pour vous une ${occasion}. Si une nouvelle cérémonie approche, nous pouvons anticiper le modèle, les mesures et le délai ensemble.`,
          lastOrderAt: previousOccasionOrder.orderedAt,
          daysSinceOrder: occasionAge
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.daysSinceOrder - a.daysSinceOrder);
}


export type DailyTask = {
  id: string;
  title: string;
  detail: string;
  kind: "critical" | "today" | "money";
  action: "orders" | "cash";
};

/** Build explainable dashboard tasks from saved prototype data only. */
export function getDailyTasks(clients: Client[], orders: Order[], today: string): DailyTask[] {
  const parseDate = (value: string): number | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
      ? date.getTime()
      : null;
  };
  if (parseDate(today) === null) return [];
  const clientName = (clientId: string) =>
    clients.find((client) => client.id === clientId)?.name ?? "Client non retrouvé";

  const overdue = orders
    .filter((order) => order.status !== "Livré" && parseDate(order.dueDate) !== null && order.dueDate < today)
    .map((order): DailyTask => ({
      id: `retard-${order.id}`,
      title: `Commande en retard : ${order.garment}`,
      detail: `${clientName(order.clientId)} · échéance dépassée`,
      kind: "critical",
      action: "orders"
    }));
  const dueToday = orders
    .filter((order) => order.status !== "Livré" && parseDate(order.dueDate) !== null && order.dueDate === today)
    .map((order): DailyTask => ({
      id: `today-${order.id}`,
      title: `Livraison prévue aujourd'hui : ${order.garment}`,
      detail: `${clientName(order.clientId)} · statut : ${order.status}`,
      kind: "today",
      action: "orders"
    }));
  const readyBalances = orders
    .filter((order) => order.status === "Prêt" && balanceDue(order) > 0)
    .map((order): DailyTask => ({
      id: `balance-${order.id}`,
      title: `Solde à encaisser : ${formatXof(balanceDue(order))}`,
      detail: `${order.garment} · ${clientName(order.clientId)}`,
      kind: "money",
      action: "cash"
    }));
  return [...overdue, ...dueToday, ...readyBalances];
}
