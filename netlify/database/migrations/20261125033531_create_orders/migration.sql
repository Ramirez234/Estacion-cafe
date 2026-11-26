CREATE TABLE "orders" (
	"id" serial PRIMARY KEY,
	"customer_name" text NOT NULL,
	"items" jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_method" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" ("created_at");