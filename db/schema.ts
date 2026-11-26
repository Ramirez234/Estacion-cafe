import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export type OrderLine = {
  id: string;
  name: string;
  size: string;
  extras: string[];
  qty: number;
  unitCents: number;
};

export type DeliveryInfo = {
  phone?: string;
  address?: string;
  reference?: string;
  proofImage?: string;
};

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  items: jsonb("items").$type<OrderLine[]>().notNull(),
  totalCents: integer("total_cents").notNull(),
  paymentMethod: text("payment_method").notNull().default("yape"),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type OrderRow = typeof orders.$inferSelect;
