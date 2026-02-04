CREATE TABLE "message_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"channel" varchar(32) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"to_phone" varchar(32) NOT NULL,
	"body" text NOT NULL,
	"status" varchar(32) NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"provider" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"provider_config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "scheduled_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "confirmed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_classes" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_classes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_logs" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "emergency_logs" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_logs" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_policies" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_policies" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_rules" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_rules" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_rules" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emergency_rules" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "outbox" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "professional_schedules" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professional_schedules" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "professionals" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "scheduling_config" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "scheduling_config" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "visit_types" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visit_types" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "arrived_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "arrived_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "status" SET DEFAULT 'checked_in';--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "visits" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_accounts" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "zapi_accounts" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "zapi_accounts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_accounts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "zapi_accounts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_events" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "zapi_events" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_messages" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "zapi_messages" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "zapi_messages" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_numbers" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "zapi_numbers" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "zapi_numbers" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_numbers" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "zapi_numbers" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS  "phone_e164" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS  "document_number" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS  "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_classes" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_events" ADD COLUMN IF NOT EXISTS  "triggered_by_client_id" uuid;--> statement-breakpoint
ALTER TABLE "emergency_events" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_logs" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "emergency_policies" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN  IF NOT EXISTS "amount" numeric;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN  IF NOT EXISTS "due_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN  IF NOT EXISTS "paid_date" date;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN  IF NOT EXISTS "payment_method" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "currency" text DEFAULT 'BRL';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "professional_schedules" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS  "avg_duration_minutes" integer DEFAULT 20;--> statement-breakpoint
ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS  "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "scheduling_config" ADD COLUMN IF NOT EXISTS  "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN  IF NOT EXISTS "is_active" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "visit_types" ADD COLUMN  IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS  "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "zapi_messages" ADD COLUMN  IF NOT EXISTS "to_phone" text NOT NULL;--> statement-breakpoint
ALTER TABLE "zapi_messages" ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_accounts" ADD CONSTRAINT "whatsapp_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_config" ADD CONSTRAINT "scheduling_config_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_dispatch_idx" ON "outbox" USING btree ("status","next_retry_at","created_at");--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "document";--> statement-breakpoint
ALTER TABLE "emergency_events" DROP COLUMN "triggered_by_client";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "valor";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "data_vencimento";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "data_pagamento";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "metodo_pagamento";--> statement-breakpoint
ALTER TABLE "professionals" DROP COLUMN "avg_duration";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "ativo";--> statement-breakpoint
ALTER TABLE "zapi_messages" DROP COLUMN IF EXISTS "to";