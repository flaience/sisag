CREATE TYPE "public"."automation_job_status" AS ENUM('pending', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."automation_job_type" AS ENUM('precheckin', 'followup', 'reactivation');--> statement-breakpoint
CREATE TYPE "public"."booking_actor" AS ENUM('whatsapp', 'admin', 'system', 'n8n');--> statement-breakpoint
CREATE TYPE "public"."booking_event_type" AS ENUM('booking.created', 'booking.confirmed', 'booking.cancelled', 'booking.rescheduled', 'booking.completed', 'booking.slot_suggested', 'automation.precheckin.sent', 'automation.followup.sent', 'automation.reactivation.sent');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'RESCHEDULED', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "automation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" "automation_job_type" NOT NULL,
	"status" "automation_job_status" DEFAULT 'pending' NOT NULL,
	"client_id" uuid,
	"booking_id" uuid,
	"run_at" timestamp with time zone NOT NULL,
	"dedupe_key" text NOT NULL,
	"last_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"enable_precheckin" boolean DEFAULT false NOT NULL,
	"enable_followup" boolean DEFAULT false NOT NULL,
	"enable_reactivation" boolean DEFAULT false NOT NULL,
	"precheckin_hours_before" integer DEFAULT 24 NOT NULL,
	"followup_hours_after" integer DEFAULT 24 NOT NULL,
	"reactivation_days_after" integer DEFAULT 60 NOT NULL,
	"templates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"client_id" uuid,
	"session_id" uuid,
	"outbox_id" uuid,
	"type" "booking_event_type" NOT NULL,
	"actor" "booking_actor" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_jobs" ADD CONSTRAINT "automation_jobs_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_session_id_conversation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."conversation_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_outbox_id_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."outbox"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_jobs_run_idx" ON "automation_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_jobs_dedupe_uq" ON "automation_jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_rules_company_uq" ON "automation_rules" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "booking_events_company_time_idx" ON "booking_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id","created_at");