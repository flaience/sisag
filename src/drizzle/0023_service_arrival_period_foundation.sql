CREATE TABLE "service_arrival_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "unit_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "weekday" integer NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "capacity" integer,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "service_arrival_periods_weekday_check" CHECK ("weekday" between 0 and 6),
  CONSTRAINT "service_arrival_periods_time_check" CHECK ("start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "start_time" < "end_time"),
  CONSTRAINT "service_arrival_periods_capacity_check" CHECK ("capacity" is null or "capacity" between 1 and 10000)
);--> statement-breakpoint
ALTER TABLE "service_arrival_periods" ADD CONSTRAINT "service_arrival_periods_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "service_arrival_periods" ADD CONSTRAINT "service_arrival_periods_unit_id_company_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."company_units"("id") ON DELETE cascade;--> statement-breakpoint
ALTER TABLE "service_arrival_periods" ADD CONSTRAINT "service_arrival_periods_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade;--> statement-breakpoint
CREATE INDEX "service_arrival_periods_company_service_active_idx" ON "service_arrival_periods" USING btree ("company_id", "service_id", "active");--> statement-breakpoint
CREATE INDEX "service_arrival_periods_company_unit_weekday_idx" ON "service_arrival_periods" USING btree ("company_id", "unit_id", "weekday", "active");--> statement-breakpoint
CREATE UNIQUE INDEX "service_arrival_periods_exact_period_uq" ON "service_arrival_periods" USING btree ("company_id", "unit_id", "service_id", "weekday", "start_time", "end_time");
