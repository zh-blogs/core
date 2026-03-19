CREATE TYPE "public"."announcement_status_enum" AS ENUM('DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."article_feedback_action_enum" AS ENUM('HIDE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."article_feedback_reason_enum" AS ENUM('CONTENT_ERROR', 'BROKEN_LINK', 'POLITICAL_SENSITIVE', 'PORNOGRAPHY_VIOLENCE', 'COPYRIGHT', 'SPAM', 'DUPLICATE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."article_visibility_enum" AS ENUM('VISIBLE', 'HIDDEN', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."audit_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."deployment_module_enum" AS ENUM('WEB', 'API', 'WORKER', 'DEPLOYER', 'STATUS', 'CLOUDFLARE', 'ALL', 'DB');--> statement-breakpoint
CREATE TYPE "public"."deployment_status_enum" AS ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'ROLLED_BACK', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."execution_status_enum" AS ENUM('RUNNING', 'SUCCEEDED', 'FAILED', 'TIMEOUT', 'CANCELED');--> statement-breakpoint
CREATE TYPE "public"."feed_type_enum" AS ENUM('RSS', 'ATOM', 'JSON');--> statement-breakpoint
CREATE TYPE "public"."from_enum" AS ENUM('CIB', 'BO_YOU_QUAN', 'BLOG_FINDER', 'BKZ', 'TRAVELLINGS', 'WEB_SUBMIT', 'LINK_PAGE_SEARCH', 'OLD_DATA');--> statement-breakpoint
CREATE TYPE "public"."job_status_enum" AS ENUM('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'DEAD_LETTER');--> statement-breakpoint
CREATE TYPE "public"."job_trigger_source_enum" AS ENUM('SCHEDULE', 'MANUAL', 'EVENT', 'CHAIN', 'RETRY', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."schedule_mode_enum" AS ENUM('CRON', 'INTERVAL', 'MANUAL', 'EVENT');--> statement-breakpoint
CREATE TYPE "public"."site_access_event_type_enum" AS ENUM('OUTBOUND_CLICK', 'EMBED_PAGEVIEW');--> statement-breakpoint
CREATE TYPE "public"."site_access_scope_enum" AS ENUM('CN_ONLY', 'GLOBAL_ONLY', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."site_audit_action_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."site_check_region_enum" AS ENUM('CN', 'GLOBAL', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."site_check_result_enum" AS ENUM('SUCCESS', 'FAILURE', 'TIMEOUT', 'DNS_ERROR', 'SSL_ERROR', 'HTTP_ERROR', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."site_claim_type_enum" AS ENUM('OWNER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."site_classification_status_enum" AS ENUM('COMPLETE', 'NEEDS_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."site_status_tag_enum" AS ENUM('EXTERNAL_LIMIT', 'INTERNAL_LIMIT', 'FEW_ARTICLES', 'NO_CONTENT', 'NON_ORIGINAL', 'SENSITIVE_CONTENT');--> statement-breakpoint
CREATE TYPE "public"."site_status_type_enum" AS ENUM('OK', 'ERROR', 'SSLERROR');--> statement-breakpoint
CREATE TYPE "public"."site_warning_tag_source_enum" AS ENUM('ARTICLE_FEEDBACK', 'SITE_FEEDBACK', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."tag_type_enum" AS ENUM('MAIN', 'SUB');--> statement-breakpoint
CREATE TYPE "public"."task_type_enum" AS ENUM('RSS_FETCH', 'SITE_CHECK', 'DB_MAINTENANCE', 'STATS_CALC', 'EMAIL_SEND', 'MESSAGE_DISPATCH', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."technology_type_enum" AS ENUM('SYSTEM', 'FRAMEWORK', 'LANGUAGE');--> statement-breakpoint
CREATE TYPE "public"."user_oauth_provider_enum" AS ENUM('GITHUB');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('SYS_ADMIN', 'ADMIN', 'CONTRIBUTOR', 'USER');--> statement-breakpoint
CREATE TABLE "site_access_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"event_type" "site_access_event_type_enum" DEFAULT 'OUTBOUND_CLICK' NOT NULL,
	"source" varchar(64),
	"referer_host" varchar(256),
	"path" varchar(512),
	"user_agent" varchar(512),
	"occurred_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_architectures" (
	"site_id" uuid PRIMARY KEY NOT NULL,
	"system_id" uuid,
	"framework_id" uuid,
	"language_id" uuid,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_tags" (
	"site_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_tags_pkey" PRIMARY KEY("site_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"bid" varchar(64),
	"name" varchar(64) NOT NULL,
	"url" varchar(256) NOT NULL,
	"sign" text DEFAULT '',
	"icon_base64" text,
	"feed" jsonb DEFAULT '[]'::jsonb,
	"from" "from_enum"[],
	"classification_status" "site_classification_status_enum" DEFAULT 'COMPLETE' NOT NULL,
	"sitemap" varchar(256),
	"link_page" varchar(256),
	"join_time" timestamp (6) with time zone,
	"update_time" timestamp (6) with time zone,
	"access_scope" "site_access_scope_enum" DEFAULT 'BOTH' NOT NULL,
	"status" "site_status_type_enum" DEFAULT 'OK' NOT NULL,
	"is_show" boolean DEFAULT true NOT NULL,
	"recommend" boolean DEFAULT false,
	"reason" text,
	CONSTRAINT "sites_bid_unique" UNIQUE("bid"),
	CONSTRAINT "sites_name_unique" UNIQUE("name"),
	CONSTRAINT "sites_url_unique" UNIQUE("url")
);
--> statement-breakpoint
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
CREATE TABLE "feed_articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"guid" varchar(512),
	"article_url" varchar(512) NOT NULL,
	"title" varchar(512) NOT NULL,
	"summary" text,
	"feed_type" "feed_type_enum",
	"source" jsonb,
	"published_time" timestamp (6) with time zone,
	"fetched_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"visibility" "article_visibility_enum" DEFAULT 'VISIBLE' NOT NULL,
	"visibility_reason" text
);
--> statement-breakpoint
CREATE TABLE "article_feedback_audits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"action" "article_feedback_action_enum" NOT NULL,
	"reason_type" "article_feedback_reason_enum" DEFAULT 'OTHER' NOT NULL,
	"status" "audit_status_enum" DEFAULT 'PENDING' NOT NULL,
	"feedback_content" text NOT NULL,
	"reporter_name" varchar(64),
	"reporter_email" varchar(128),
	"has_attachment" boolean DEFAULT false NOT NULL,
	"reviewer_comment" text,
	"reviewed_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_audits" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid,
	"action" "site_audit_action_enum" NOT NULL,
	"status" "audit_status_enum" DEFAULT 'PENDING' NOT NULL,
	"current_snapshot" jsonb,
	"proposed_snapshot" jsonb,
	"diff" jsonb DEFAULT '[]'::jsonb,
	"submit_reason" text,
	"reviewer_comment" text,
	"submitter_name" varchar(64),
	"submitter_email" varchar(128),
	"reviewed_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_executions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"attempt_no" integer NOT NULL,
	"worker_id" varchar(128),
	"status" "execution_status_enum" DEFAULT 'RUNNING' NOT NULL,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"error_detail" jsonb,
	"error_message" text,
	"started_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"finished_time" timestamp (6) with time zone,
	"duration_ms" integer,
	"heartbeat_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"root_job_id" uuid,
	"parent_job_id" uuid,
	"schedule_id" uuid,
	"task_type" "task_type_enum" NOT NULL,
	"queue_name" varchar(64) NOT NULL,
	"trigger_source" "job_trigger_source_enum" NOT NULL,
	"trigger_key" varchar(128),
	"status" "job_status_enum" DEFAULT 'PENDING' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"dedupe_key" varchar(256),
	"run_at" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp (6) with time zone,
	"locked_by" varchar(128),
	"heartbeat_time" timestamp (6) with time zone,
	"started_time" timestamp (6) with time zone,
	"finished_time" timestamp (6) with time zone,
	"next_retry_time" timestamp (6) with time zone,
	"error_code" varchar(64),
	"error_message" text,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_schedules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"task_type" "task_type_enum" NOT NULL,
	"queue_name" varchar(64) NOT NULL,
	"schedule_mode" "schedule_mode_enum" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"schedule_config" jsonb,
	"trigger_rule" jsonb,
	"payload_template" jsonb,
	"policy" jsonb,
	"next_run_time" timestamp (6) with time zone,
	"last_run_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_definitions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(64) NOT NULL,
	"tag_type" "tag_type_enum" NOT NULL,
	"description" varchar(512),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_catalogs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"technology_type" "technology_type_enum" NOT NULL,
	"description" varchar(512),
	"official_url" varchar(256),
	"logo_url" varchar(256),
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_api_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"token_hash" varchar(256) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_time" timestamp (6) with time zone,
	"expires_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_oauth_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "user_oauth_provider_enum" NOT NULL,
	"provider_user_id" varchar(128) NOT NULL,
	"provider_username" varchar(128),
	"access_token" text,
	"refresh_token" text,
	"expires_time" timestamp (6) with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb,
	"profile" jsonb,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"site_id" uuid NOT NULL,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(64),
	"nickname" varchar(64) NOT NULL,
	"avatar_url" varchar(256),
	"email" varchar(128) NOT NULL,
	"password_hash" varchar(256),
	"role" "user_role_enum" DEFAULT 'USER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"profile" jsonb,
	"settings" jsonb,
	"metadata" jsonb,
	"last_login_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_claims" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"claim_type" "site_claim_type_enum" DEFAULT 'OWNER' NOT NULL,
	"status" "audit_status_enum" DEFAULT 'PENDING' NOT NULL,
	"verification_token" varchar(128),
	"verification_note" text,
	"review_note" text,
	"submitted_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"reviewed_time" timestamp (6) with time zone,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_warning_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"tag" "site_status_tag_enum" NOT NULL,
	"source" "site_warning_tag_source_enum" NOT NULL,
	"source_record_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL,
	"updated_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_checks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"site_id" uuid NOT NULL,
	"region" "site_check_region_enum" DEFAULT 'UNKNOWN' NOT NULL,
	"result" "site_check_result_enum" NOT NULL,
	"status_code" integer,
	"response_time_ms" integer,
	"duration_ms" integer,
	"message" text,
	"checker_id" varchar(128),
	"final_url" varchar(256),
	"content_verified" boolean,
	"check_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"trigger_event" varchar(64) NOT NULL,
	"status" "deployment_status_enum" DEFAULT 'PENDING' NOT NULL,
	"modules" "deployment_module_enum"[] NOT NULL,
	"delivery_id" varchar(128),
	"workflow_run_id" varchar(128),
	"workflow_run_url" varchar(256),
	"commit_sha" varchar(64),
	"git_ref" varchar(256),
	"metadata" jsonb,
	"raw_payload" jsonb,
	"started_time" timestamp (6) with time zone,
	"finished_time" timestamp (6) with time zone,
	"created_time" timestamp (6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_access_events" ADD CONSTRAINT "site_access_events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_architectures" ADD CONSTRAINT "site_architectures_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_architectures" ADD CONSTRAINT "site_architectures_system_id_technology_catalogs_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."technology_catalogs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_architectures" ADD CONSTRAINT "site_architectures_framework_id_technology_catalogs_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."technology_catalogs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_architectures" ADD CONSTRAINT "site_architectures_language_id_technology_catalogs_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."technology_catalogs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_tags" ADD CONSTRAINT "site_tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_tags" ADD CONSTRAINT "site_tags_tag_id_tag_definitions_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag_definitions"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feed_articles" ADD CONSTRAINT "feed_articles_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "article_feedback_audits" ADD CONSTRAINT "article_feedback_audits_article_id_feed_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."feed_articles"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "article_feedback_audits" ADD CONSTRAINT "article_feedback_audits_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_audits" ADD CONSTRAINT "site_audits_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_schedule_id_task_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."task_schedules"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_api_tokens" ADD CONSTRAINT "user_api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_oauth_accounts" ADD CONSTRAINT "user_oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "user_sites" ADD CONSTRAINT "user_sites_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_claims" ADD CONSTRAINT "site_claims_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_claims" ADD CONSTRAINT "site_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_warning_tags" ADD CONSTRAINT "site_warning_tags_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_warning_tags" ADD CONSTRAINT "site_warning_tags_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "site_checks" ADD CONSTRAINT "site_checks_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "site_access_events_site_id_occurred_time_index" ON "site_access_events" USING btree ("site_id","occurred_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_access_events_site_id_event_type_occurred_time_index" ON "site_access_events" USING btree ("site_id","event_type","occurred_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_access_events_site_id_event_type_source_occurred_time_index" ON "site_access_events" USING btree ("site_id","event_type","source","occurred_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_access_events_event_type_occurred_time_index" ON "site_access_events" USING btree ("event_type","occurred_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_access_events_referer_host_index" ON "site_access_events" USING btree ("referer_host");--> statement-breakpoint
CREATE INDEX "site_access_events_occurred_time_index" ON "site_access_events" USING btree ("occurred_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_architectures_system_id_index" ON "site_architectures" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "site_architectures_framework_id_index" ON "site_architectures" USING btree ("framework_id");--> statement-breakpoint
CREATE INDEX "site_architectures_language_id_index" ON "site_architectures" USING btree ("language_id");--> statement-breakpoint
CREATE INDEX "site_tags_site_id_index" ON "site_tags" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_tags_tag_id_index" ON "site_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "sites_from_gin_index" ON "sites" USING gin ("from");--> statement-breakpoint
CREATE INDEX "sites_access_scope_index" ON "sites" USING btree ("access_scope");--> statement-breakpoint
CREATE INDEX "sites_status_index" ON "sites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sites_is_show_index" ON "sites" USING btree ("is_show");--> statement-breakpoint
CREATE INDEX "sites_recommend_index" ON "sites" USING btree ("recommend");--> statement-breakpoint
CREATE INDEX "sites_join_time_index" ON "sites" USING btree ("join_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "sites_update_time_index" ON "sites" USING btree ("update_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "announcements_status_publish_time_index" ON "announcements" USING btree ("status","publish_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "announcements_expire_time_index" ON "announcements" USING btree ("expire_time");--> statement-breakpoint
CREATE INDEX "announcements_sort_order_publish_time_index" ON "announcements" USING btree ("sort_order" DESC NULLS LAST,"publish_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "announcements_created_time_index" ON "announcements" USING btree ("created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "feed_articles_site_id_guid_index" ON "feed_articles" USING btree ("site_id","guid");--> statement-breakpoint
CREATE UNIQUE INDEX "feed_articles_site_id_url_index" ON "feed_articles" USING btree ("site_id","article_url");--> statement-breakpoint
CREATE INDEX "feed_articles_site_id_published_time_index" ON "feed_articles" USING btree ("site_id","published_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_articles_site_id_visibility_published_time_index" ON "feed_articles" USING btree ("site_id","visibility","published_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_articles_feed_type_index" ON "feed_articles" USING btree ("feed_type");--> statement-breakpoint
CREATE INDEX "feed_articles_visibility_published_time_index" ON "feed_articles" USING btree ("visibility","published_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "feed_articles_fetched_time_index" ON "feed_articles" USING btree ("fetched_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "article_feedback_audits_article_id_created_time_index" ON "article_feedback_audits" USING btree ("article_id","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "article_feedback_audits_site_id_status_index" ON "article_feedback_audits" USING btree ("site_id","status");--> statement-breakpoint
CREATE INDEX "article_feedback_audits_status_created_time_index" ON "article_feedback_audits" USING btree ("status","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "article_feedback_audits_action_status_index" ON "article_feedback_audits" USING btree ("action","status");--> statement-breakpoint
CREATE INDEX "site_audits_site_id_created_time_index" ON "site_audits" USING btree ("site_id","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_audits_status_created_time_index" ON "site_audits" USING btree ("status","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_audits_action_status_index" ON "site_audits" USING btree ("action","status");--> statement-breakpoint
CREATE UNIQUE INDEX "job_executions_job_id_attempt_no_index" ON "job_executions" USING btree ("job_id","attempt_no");--> statement-breakpoint
CREATE INDEX "job_executions_job_id_started_time_index" ON "job_executions" USING btree ("job_id","started_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_executions_worker_status_started_time_index" ON "job_executions" USING btree ("worker_id","status","started_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_queue_status_run_at_priority_index" ON "jobs" USING btree ("queue_name","status","run_at","priority" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_status_next_retry_time_index" ON "jobs" USING btree ("status","next_retry_time");--> statement-breakpoint
CREATE INDEX "jobs_schedule_created_time_index" ON "jobs" USING btree ("schedule_id","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_root_job_created_time_index" ON "jobs" USING btree ("root_job_id","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_parent_job_created_time_index" ON "jobs" USING btree ("parent_job_id","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "jobs_locked_by_heartbeat_time_index" ON "jobs" USING btree ("locked_by","heartbeat_time");--> statement-breakpoint
CREATE UNIQUE INDEX "jobs_dedupe_key_index" ON "jobs" USING btree ("dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "task_schedules_name_index" ON "task_schedules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "task_schedules_enabled_next_run_index" ON "task_schedules" USING btree ("is_enabled","next_run_time");--> statement-breakpoint
CREATE INDEX "task_schedules_type_enabled_index" ON "task_schedules" USING btree ("task_type","is_enabled");--> statement-breakpoint
CREATE INDEX "task_schedules_queue_enabled_index" ON "task_schedules" USING btree ("queue_name","is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_definitions_name_type_index" ON "tag_definitions" USING btree ("name","tag_type");--> statement-breakpoint
CREATE INDEX "tag_definitions_type_enabled_index" ON "tag_definitions" USING btree ("tag_type","is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "technology_catalogs_name_type_index" ON "technology_catalogs" USING btree ("name","technology_type");--> statement-breakpoint
CREATE INDEX "technology_catalogs_type_enabled_index" ON "technology_catalogs" USING btree ("technology_type","is_enabled");--> statement-breakpoint
CREATE INDEX "user_api_tokens_user_id_index" ON "user_api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_api_tokens_user_id_active_index" ON "user_api_tokens" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "user_api_tokens_expires_time_index" ON "user_api_tokens" USING btree ("expires_time");--> statement-breakpoint
CREATE UNIQUE INDEX "user_oauth_accounts_provider_user_id_index" ON "user_oauth_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "user_oauth_accounts_user_id_index" ON "user_oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_oauth_accounts_provider_index" ON "user_oauth_accounts" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sites_site_id_index" ON "user_sites" USING btree ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_sites_user_id_site_id_index" ON "user_sites" USING btree ("user_id","site_id");--> statement-breakpoint
CREATE INDEX "user_sites_user_id_index" ON "user_sites" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_index" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_index" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_active_index" ON "users" USING btree ("role","is_active");--> statement-breakpoint
CREATE INDEX "users_created_time_index" ON "users" USING btree ("created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_claims_site_id_status_index" ON "site_claims" USING btree ("site_id","status");--> statement-breakpoint
CREATE INDEX "site_claims_user_id_status_index" ON "site_claims" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "site_claims_claim_type_index" ON "site_claims" USING btree ("claim_type");--> statement-breakpoint
CREATE INDEX "site_claims_status_submitted_time_index" ON "site_claims" USING btree ("status","submitted_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_claims_submitted_time_index" ON "site_claims" USING btree ("submitted_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_warning_tags_site_id_index" ON "site_warning_tags" USING btree ("site_id");--> statement-breakpoint
CREATE INDEX "site_warning_tags_site_id_tag_index" ON "site_warning_tags" USING btree ("site_id","tag");--> statement-breakpoint
CREATE INDEX "site_warning_tags_site_id_source_index" ON "site_warning_tags" USING btree ("site_id","source");--> statement-breakpoint
CREATE INDEX "site_warning_tags_tag_index" ON "site_warning_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "site_warning_tags_source_index" ON "site_warning_tags" USING btree ("source");--> statement-breakpoint
CREATE INDEX "site_warning_tags_created_by_index" ON "site_warning_tags" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "site_warning_tags_created_time_index" ON "site_warning_tags" USING btree ("created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_checks_site_id_check_time_index" ON "site_checks" USING btree ("site_id","check_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_checks_site_id_region_check_time_index" ON "site_checks" USING btree ("site_id","region","check_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_checks_result_check_time_index" ON "site_checks" USING btree ("result","check_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "site_checks_site_id_result_check_time_index" ON "site_checks" USING btree ("site_id","result","check_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "deployments_status_created_time_index" ON "deployments" USING btree ("status","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "deployments_commit_sha_created_time_index" ON "deployments" USING btree ("commit_sha","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "deployments_trigger_event_created_time_index" ON "deployments" USING btree ("trigger_event","created_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "deployments_started_time_index" ON "deployments" USING btree ("started_time" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "deployments_workflow_run_id_index" ON "deployments" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE INDEX "deployments_delivery_id_index" ON "deployments" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "deployments_modules_gin_index" ON "deployments" USING gin ("modules");--> statement-breakpoint
CREATE VIEW "public"."latest_site_checks" AS (
  select distinct on (sc.site_id)
    sc.site_id as site_id,
    sc.id as check_id,
    sc.region as region,
    sc.result as result,
    sc.status_code as status_code,
    sc.response_time_ms as response_time_ms,
    sc.duration_ms as duration_ms,
    sc.final_url as final_url,
    sc.content_verified as content_verified,
    sc.check_time as check_time
  from site_checks sc
  order by sc.site_id, sc.check_time desc, sc.id desc
);--> statement-breakpoint
CREATE VIEW "public"."site_access_counters" AS (
  select
    s.id as site_id,
    count(sae.id)::int as total,
    max(sae.occurred_time) as updated_time
  from sites s
  left join site_access_events sae on sae.site_id = s.id
  group by s.id
);--> statement-breakpoint
CREATE VIEW "public"."site_access_event_type_stats" AS (
  select
    sae.site_id as site_id,
    sae.event_type as event_type,
    count(*)::int as total,
    max(sae.occurred_time) as latest_access_time
  from site_access_events sae
  group by sae.site_id, sae.event_type
);--> statement-breakpoint
CREATE VIEW "public"."site_access_source_stats" AS (
  select
    sae.site_id as site_id,
    sae.event_type as event_type,
    sae.source as source,
    count(*)::int as total,
    max(sae.occurred_time) as latest_access_time
  from site_access_events sae
  group by sae.site_id, sae.event_type, sae.source
);--> statement-breakpoint
CREATE VIEW "public"."site_check_stats" AS (
  select
    sc.site_id as site_id,
    count(*)::int as total_checks,
    count(*) filter (where sc.result = 'SUCCESS')::int as success_checks,
    count(*) filter (where sc.result <> 'SUCCESS')::int as failed_checks,
    avg(sc.response_time_ms)::int as avg_response_time_ms
  from site_checks sc
  group by sc.site_id
);--> statement-breakpoint
CREATE VIEW "public"."site_feed_article_stats" AS (
  select
    fa.site_id as site_id,
    count(*)::int as total_articles,
    count(*) filter (where fa.visibility = 'VISIBLE')::int as visible_articles,
    max(fa.fetched_time) as latest_fetched_time,
    max(fa.published_time) as latest_published_time
  from feed_articles fa
  group by fa.site_id
);--> statement-breakpoint
CREATE VIEW "public"."site_warning_tag_stats" AS (
  select
    swt.tag as tag,
    count(distinct swt.site_id)::int as site_count
  from site_warning_tags swt
  group by swt.tag
);--> statement-breakpoint
CREATE VIEW "public"."tag_stats" AS (
  select
    td.id as tag_id,
    td.name as tag_name,
    td.tag_type as tag_type,
    count(st.site_id)::int as site_count
  from tag_definitions td
  left join site_tags st on st.tag_id = td.id
  group by td.id, td.name, td.tag_type
);--> statement-breakpoint
CREATE VIEW "public"."technology_stats" AS (
  with technology_refs as (
    select system_id as technology_id from site_architectures where system_id is not null
    union all
    select framework_id as technology_id from site_architectures where framework_id is not null
    union all
    select language_id as technology_id from site_architectures where language_id is not null
  )
  select
    tc.id as technology_id,
    tc.name as technology_name,
    tc.technology_type as technology_type,
    count(tr.technology_id)::int as site_count
  from technology_catalogs tc
  left join technology_refs tr on tr.technology_id = tc.id
  group by tc.id, tc.name, tc.technology_type
);