CREATE TYPE "public"."service_attendance_mode" AS ENUM('scheduled_time', 'arrival_order');--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "attendance_mode" "service_attendance_mode" DEFAULT 'scheduled_time' NOT NULL;--> statement-breakpoint
CREATE INDEX "services_company_attendance_mode_idx" ON "services" USING btree ("company_id", "attendance_mode", "active");
