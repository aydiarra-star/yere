export type Measurement = {
  bust: string;
  waist: string;
  hips: string;
  shoulder: string;
  sleeve: string;
  length: string;
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
  const numericFields = [measurement.bust, measurement.waist, measurement.hips, measurement.shoulder, measurement.sleeve, measurement.length];
  return numericFields.every((value) => {
    if (value.trim() === "") return true;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0;
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

export const orderStatuses: OrderStatus[] = [
  "À préparer",
  "En confection",
  "Prêt",
  "Livré"
];

export function balanceDue(order: Pick<Order, "price" | "deposit">): number {
  return Math.max(0, order.price - order.deposit);
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
