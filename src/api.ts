import type { OrderLine } from "../db/schema";

export type Order = {
  id: number;
  customerName: string;
  items: OrderLine[];
  totalCents: number;
  paymentMethod: "yape" | "plin";
  status: "pendiente" | "pagado";
  createdAt: string;
  completedAt: string | null;
};

export type CartLine = { key: string; id: string; size: string; extras: string[]; qty: number };

async function req<T>(url: string, init: RequestInit = {}, password?: string): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(password ? { "x-admin-password": password } : {}),
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "No se pudo conectar"), { status: res.status });
  return data as T;
}

export const createOrder = (body: { customerName: string; paymentMethod: string; items: CartLine[] }) =>
  req<Order>("/api/orders", { method: "POST", body: JSON.stringify(body) });

export const adminCheck = (pw: string) => req<{ ok: true }>("/api/admin/session", {}, pw);

export const adminOrders = (pw: string, q: Record<string, string>) =>
  req<Order[]>("/api/admin/orders?" + new URLSearchParams(q), {}, pw);

export const adminSetStatus = (pw: string, id: number, status: Order["status"]) =>
  req<Order>(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }, pw);
