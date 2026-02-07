CREATE TABLE "whatsapp_message_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"whatsapp_account_id" uuid,
	"message_log_id" uuid,
	"provider" varchar(32) DEFAULT 'meta' NOT NULL,
	"provider_message_id" text NOT NULL,
	"status" varchar(32) NOT NULL,
	"timestamp_ms" integer,
	"error_code" text,
	"error_message" text,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"whatsapp_account_id" uuid,
	"provider" varchar(32) DEFAULT 'meta' NOT NULL,
	"event_type" text NOT NULL,
	"provider_message_id" text,
	"payload" jsonb NOT NULL,
	"headers" jsonb,
	"received_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "whatsapp_account_id" uuid;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "outbox_id" uuid;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "message_type" varchar(32) DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "request_payload" jsonb;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "response_payload" jsonb;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "delivered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_logs" ADD COLUMN "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "outbox" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "whatsapp_message_status_events" ADD CONSTRAINT "whatsapp_message_status_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_status_events" ADD CONSTRAINT "whatsapp_message_status_events_whatsapp_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("whatsapp_account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_message_status_events" ADD CONSTRAINT "whatsapp_message_status_events_message_log_id_message_logs_id_fk" FOREIGN KEY ("message_log_id") REFERENCES "public"."message_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "whatsapp_webhook_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_webhook_events" ADD CONSTRAINT "whatsapp_webhook_events_whatsapp_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("whatsapp_account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_status_provider_msg_idx" ON "whatsapp_message_status_events" USING btree ("provider_message_id","created_at");--> statement-breakpoint
CREATE INDEX "whatsapp_status_company_idx" ON "whatsapp_message_status_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_status_dedupe_uq" ON "whatsapp_message_status_events" USING btree ("provider_message_id","status","timestamp_ms") WHERE timestamp_ms is not null;--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_received_idx" ON "whatsapp_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_provider_msg_idx" ON "whatsapp_webhook_events" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "whatsapp_webhook_events_company_idx" ON "whatsapp_webhook_events" USING btree ("company_id","received_at");--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_whatsapp_account_id_whatsapp_accounts_id_fk" FOREIGN KEY ("whatsapp_account_id") REFERENCES "public"."whatsapp_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_outbox_id_outbox_id_fk" FOREIGN KEY ("outbox_id") REFERENCES "public"."outbox"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "message_logs_outbox_id_uq" ON "message_logs" USING btree ("outbox_id") WHERE outbox_id is not null;--> statement-breakpoint
CREATE INDEX "message_logs_company_status_idx" ON "message_logs" USING btree ("company_id","status","created_at");--> statement-breakpoint
CREATE INDEX "message_logs_provider_msg_idx" ON "message_logs" USING btree ("provider_message_id");--> statement-breakpoint
CREATE INDEX "outbox_lock_idx" ON "outbox" USING btree ("status","locked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_key_uq" ON "outbox" USING btree ("dedupe_key") WHERE dedupe_key is not null;