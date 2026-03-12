CREATE TYPE "public"."announcement_status_enum" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"summary" text NOT NULL,
	"content" text,
	"tag" varchar(64) NOT NULL,
	"status" "announcement_status_enum" DEFAULT 'DRAFT' NOT NULL,
	"publish_time" timestamp (6) with time zone,
	"expire_time" timestamp (6) with time zone,
	"expired_time" timestamp (6) with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "announcements_status_publish_time_index" ON "announcements" USING btree ("status","publish_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "announcements_expire_time_index" ON "announcements" USING btree ("expire_time");--> statement-breakpoint
CREATE INDEX "announcements_sort_order_publish_time_index" ON "announcements" USING btree ("sort_order" DESC NULLS LAST,"publish_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "announcements_created_time_index" ON "announcements" USING btree ("created_time" DESC NULLS LAST);