CREATE TYPE "public"."commercial_onboarding_executor_type" AS ENUM('human', 'agent', 'system', 'n8n');--> statement-breakpoint
CREATE TYPE "public"."commercial_onboarding_status" AS ENUM('pending', 'in_progress', 'blocked', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."commercial_onboarding_step_status" AS ENUM('pending', 'in_progress', 'blocked', 'completed', 'skipped', 'cancelled');--> statement-breakpoint
CREATE TABLE "commercial_onboarding_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"onboarding_id" uuid NOT NULL,
	"code" varchar(64) NOT NULL,
	"position" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" "commercial_onboarding_step_status" DEFAULT 'pending' NOT NULL,
	"executor_type" "commercial_onboarding_executor_type" DEFAULT 'system' NOT NULL,
	"executor_id" varchar(200),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_onboarding_steps_code_format_check" CHECK ("commercial_onboarding_steps"."code" ~ '^[a-z0-9][a-z0-9_]*$'),
	CONSTRAINT "commercial_onboarding_steps_position_check" CHECK ("commercial_onboarding_steps"."position" > 0),
	CONSTRAINT "commercial_onboarding_steps_attempts_check" CHECK ("commercial_onboarding_steps"."attempts" >= 0)
);
--> statement-breakpoint
ALTER TABLE "commercial_onboarding_steps" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "commercial_onboardings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commercial_client_id" uuid NOT NULL,
	"status" "commercial_onboarding_status" DEFAULT 'pending' NOT NULL,
	"current_step_code" varchar(64),
	"blocked_reason" text,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "commercial_onboardings_step_code_format_check" CHECK ("commercial_onboardings"."current_step_code" IS NULL OR "commercial_onboardings"."current_step_code" ~ '^[a-z0-9][a-z0-9_]*$')
);
--> statement-breakpoint
ALTER TABLE "commercial_onboardings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "commercial_onboarding_steps" ADD CONSTRAINT "commercial_onboarding_steps_onboarding_id_commercial_onboardings_id_fk" FOREIGN KEY ("onboarding_id") REFERENCES "public"."commercial_onboardings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commercial_onboardings" ADD CONSTRAINT "commercial_onboardings_commercial_client_id_commercial_clients_id_fk" FOREIGN KEY ("commercial_client_id") REFERENCES "public"."commercial_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_onboarding_steps_onboarding_code_uq" ON "commercial_onboarding_steps" USING btree ("onboarding_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_onboarding_steps_onboarding_position_uq" ON "commercial_onboarding_steps" USING btree ("onboarding_id","position");--> statement-breakpoint
CREATE INDEX "commercial_onboarding_steps_onboarding_status_idx" ON "commercial_onboarding_steps" USING btree ("onboarding_id","status");--> statement-breakpoint
CREATE INDEX "commercial_onboarding_steps_executor_idx" ON "commercial_onboarding_steps" USING btree ("executor_type","executor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_onboardings_client_uq" ON "commercial_onboardings" USING btree ("commercial_client_id");--> statement-breakpoint
CREATE INDEX "commercial_onboardings_status_idx" ON "commercial_onboardings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "commercial_onboardings_current_step_idx" ON "commercial_onboardings" USING btree ("current_step_code");