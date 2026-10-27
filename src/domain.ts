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
