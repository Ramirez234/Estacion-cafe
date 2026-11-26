import { Hono } from "hono";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders, type OrderLine } from "../../db/schema.js";
import { EXTRAS, ITEMS_BY_ID } from "../../src/menu.js";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const STATUSES = ["pendiente", "pagado"] as const;

const app = new Hono();

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Error del servidor" }, 500);
});

// Cliente: crear pedido. Los precios se recalculan aquí a partir de la carta oficial.
app.post("/api/orders", async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = String(body?.customerName ?? "").trim().slice(0, 60);
  const payment = String(body?.paymentMethod ?? "");
  const rawItems: unknown[] = Array.isArray(body?.items) ? body.items.slice(0, 50) : [];

  if (!name) return c.json({ error: "Escribe tu nombre" }, 400);
  if (payment !== "yape" && payment !== "plin") return c.json({ error: "Elige Yape o Plin" }, 400);

  const lines: OrderLine[] = [];
  for (const raw of rawItems as any[]) {
    const item = ITEMS_BY_ID[raw?.id];
    if (!item) return c.json({ error: "Producto no válido" }, 400);
    const size = item.sizes.find((s) => s.label === (raw.size ?? "")) ?? (item.sizes.length === 1 ? item.sizes[0] : undefined);
    if (!size) return c.json({ error: `Elige un tamaño para ${item.name}` }, 400);
    const extras = item.drink
      ? EXTRAS.filter((e) => Array.isArray(raw.extras) && raw.extras.includes(e.id)).map((e) => ({ name: e.name, price: e.price }))
      : [];
    const qty = Math.max(1, Math.min(20, Math.floor(Number(raw.qty) || 1)));
    lines.push({
      id: item.id,
      name: item.name,
      size: size.label || undefined,
      extras,
      unitPrice: size.price + extras.reduce((s, e) => s + e.price, 0),
      qty,
    });
  }
  if (!lines.length) return c.json({ error: "Tu pedido está vacío" }, 400);

  const totalCents = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const [order] = await db
    .insert(orders)
    .values({ customerName: name, items: lines, totalCents, paymentMethod: payment })
    .returning();
  return c.json(order, 201);
});

// Admin: todas las rutas requieren la contraseña en la cabecera.
app.use("/api/admin/*", async (c, next) => {
  if (c.req.header("x-admin-password") !== ADMIN_PASSWORD) {
    return c.json({ error: "Contraseña incorrecta" }, 401);
  }
  await next();
});

app.get("/api/admin/session", (c) => c.json({ ok: true }));

// ?status=pendiente → cola ; ?from=ISO&to=ISO → rango para calendario/reportes
app.get("/api/admin/orders", async (c) => {
  const status = c.req.query("status");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const conds = [];
  if (status && (STATUSES as readonly string[]).includes(status)) conds.push(eq(orders.status, status));
  if (from && !isNaN(Date.parse(from))) conds.push(gte(orders.createdAt, new Date(from)));
  if (to && !isNaN(Date.parse(to))) conds.push(lt(orders.createdAt, new Date(to)));
  const rows = await db
    .select()
    .from(orders)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(status === "pendiente" ? asc(orders.createdAt) : desc(orders.createdAt))
    .limit(2000);
  return c.json(rows);
});

app.patch("/api/admin/orders/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  const status = body?.status;
  if (!Number.isInteger(id) || !(STATUSES as readonly string[]).includes(status)) {
    return c.json({ error: "Datos no válidos" }, 400);
  }
  const [row] = await db
    .update(orders)
    .set({ status, completedAt: status === "pagado" ? new Date() : null })
    .where(eq(orders.id, id))
    .returning();
  if (!row) return c.json({ error: "Pedido no encontrado" }, 404);
  return c.json(row);
});

export default app;

export const config = { path: "/api/*" };
