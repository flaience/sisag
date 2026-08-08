CREATE TYPE "public"."commercial_client_status" AS ENUM('prospect', 'onboarding', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."subscription_provisioning_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_user_role" AS ENUM('owner', 'billing', 'administrator');--> statement-breakpoint
CREATE TABLE "commercial_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"document_number" varchar(32) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(32),
	"whatsapp" varchar(32),
	"status" "commercial_client_status" DEFAULT 'onboarding' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_clients_document_format_check" CHECK ("commercial_clients"."document_number" ~ '^[0-9]{11}$|^[0-9]{14}$')
);
--> statement-breakpoint
ALTER TABLE "commercial_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscription_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commercial_client_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "subscription_user_role" DEFAULT 'owner' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_at" timestamp with time zone DEFAULT now(),
	"accepted_at" timestamp with time zone,
	"last_access_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commercial_client_id" uuid NOT NULL,
	"tenant_id" uuid,
	"plan_code" varchar(64) DEFAULT 'standard' NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"provisioning_status" "subscription_provisioning_status" DEFAULT 'pending' NOT NULL,
	"trial_starts_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"provisioned_at" timestamp with time zone,
	"last_provisioning_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_trial_period_check" CHECK ("subscriptions"."trial_ends_at" IS NULL OR "subscriptions"."trial_starts_at" IS NULL OR "subscriptions"."trial_ends_at" > "subscriptions"."trial_starts_at")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_users" ADD CONSTRAINT "subscription_users_commercial_client_id_commercial_clients_id_fk" FOREIGN KEY ("commercial_client_id") REFERENCES "public"."commercial_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_commercial_client_id_commercial_clients_id_fk" FOREIGN KEY ("commercial_client_id") REFERENCES "public"."commercial_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_clients_document_uq" ON "commercial_clients" USING btree ("document_number");--> statement-breakpoint
CREATE INDEX "commercial_clients_email_idx" ON "commercial_clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "commercial_clients_status_idx" ON "commercial_clients" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_users_client_user_uq" ON "subscription_users" USING btree ("commercial_client_id","user_id");--> statement-breakpoint
CREATE INDEX "subscription_users_user_idx" ON "subscription_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscription_users_client_active_idx" ON "subscription_users" USING btree ("commercial_client_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_commercial_client_uq" ON "subscriptions" USING btree ("commercial_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_tenant_uq" ON "subscriptions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_provisioning_status_idx" ON "subscriptions" USING btree ("provisioning_status");