CREATE TYPE "public"."arrival_intention_status" AS ENUM('registered', 'cancelled');--> statement-breakpoint
CREATE TABLE "arrival_intentions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "period_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "attendance_date" date NOT NULL,
  "status" "arrival_intention_status" DEFAULT 'registered' NOT NULL,
  "source" text NOT NULL,
  "request_id" text NOT NULL,
  "cancelled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "arrival_intentions_source_check" CHECK ("source" in ('admin','whatsapp','n8n','system'))
);--> statement-breakpoint
ALTER TABLE "arrival_intentions" ADD CONSTRAINT "arrival_intentions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "arrival_intentions" ADD CONSTRAINT "arrival_intentions_period_id_service_arrival_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."service_arrival_periods"("id") ON DELETE restrict;--> statement-breakpoint
ALTER TABLE "arrival_intentions" ADD CONSTRAINT "arrival_intentions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict;--> statement-breakpoint
CREATE UNIQUE INDEX "arrival_intentions_company_request_uq" ON "arrival_intentions" USING btree ("company_id", "request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "arrival_intentions_active_client_period_uq" ON "arrival_intentions" USING btree ("company_id", "period_id", "client_id", "attendance_date") WHERE status = 'registered';--> statement-breakpoint
CREATE INDEX "arrival_intentions_company_date_status_idx" ON "arrival_intentions" USING btree ("company_id", "attendance_date", "status");--> statement-breakpoint
CREATE INDEX "arrival_intentions_period_date_status_idx" ON "arrival_intentions" USING btree ("period_id", "attendance_date", "status");
