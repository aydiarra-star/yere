export type Measurement = {
  bust: string;
  waist: string;
  hips: string;
  shoulder: string;
  sleeve: string;
  length: string;
  note: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  measurement: Measurement;
};

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
