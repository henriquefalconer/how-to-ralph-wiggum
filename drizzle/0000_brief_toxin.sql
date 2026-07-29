CREATE TABLE "audit_log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"actor_name" text NOT NULL,
	"actor_email" text NOT NULL,
	"category" text NOT NULL,
	"resource_type" text NOT NULL,
	"message" text NOT NULL,
	"message_key" text NOT NULL,
	"message_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"card_title" text NOT NULL,
	"status" text NOT NULL,
	"message" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"trigger_type" text NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"action_type" text NOT NULL,
	"action_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "card_field_values" (
	"card_id" uuid NOT NULL,
	"field_owner_type" text NOT NULL,
	"field_owner_id" uuid NOT NULL,
	"field_id" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"filled_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_field_values_card_id_field_owner_type_field_owner_id_field_id_pk" PRIMARY KEY("card_id","field_owner_type","field_owner_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "card_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"from_phase_id" uuid,
	"to_phase_id" uuid NOT NULL,
	"moved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"purge_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dashboard_charts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dashboard_id" uuid NOT NULL,
	"title" text NOT NULL,
	"metric" text NOT NULL,
	"dimension_field_id" text,
	"time_field_id" text DEFAULT '_createdAt' NOT NULL,
	"time_range" text DEFAULT 'all_time' NOT NULL,
	"time_grouping" text,
	"viz_type" text NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" jsonb DEFAULT '{"x":0,"y":0,"w":4,"h":3}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_time_range" text DEFAULT 'all_time' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_conditionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"condition_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"true_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"false_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"help" text,
	"description" text,
	"editable" boolean DEFAULT true NOT NULL,
	"minimal_view" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connector_target_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fields_owner_type_owner_id_id_pk" PRIMARY KEY("owner_type","owner_id","id")
);
--> statement-breakpoint
CREATE TABLE "interface_page_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"type" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interface_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interface_id" uuid NOT NULL,
	"name" text NOT NULL,
	"show_header" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interface_shares" (
	"interface_id" uuid NOT NULL,
	"shared_with_type" text NOT NULL,
	"shared_with_id" text NOT NULL,
	CONSTRAINT "interface_shares_interface_id_shared_with_type_shared_with_id_pk" PRIMARY KEY("interface_id","shared_with_type","shared_with_id")
);
--> statement-breakpoint
CREATE TABLE "interfaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'Layout' NOT NULL,
	"privacy_tier" text DEFAULT 'restricted_org' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pdf_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"title" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL,
	"color" text DEFAULT '#2E68D9' NOT NULL,
	"description" text,
	"allow_card_creation" boolean DEFAULT false NOT NULL,
	"collect_task_emails" boolean DEFAULT false NOT NULL,
	"auto_assign_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sla_time" integer,
	"sla_unit" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipe_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'pipe_member' NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"title_field_id" text,
	"icon" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"item_name" text,
	"create_card_button_label" text,
	"default_view" text DEFAULT 'kanban' NOT NULL,
	"kanban_preview_field_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connected_card_field_ids" jsonb DEFAULT '["created_at","current_phase"]'::jsonb NOT NULL,
	"expiration_alert_time" integer DEFAULT 0 NOT NULL,
	"expiration_alert_unit" text DEFAULT 'minutes' NOT NULL,
	"expiration_alert_business_days_only" boolean DEFAULT false NOT NULL,
	"visibility" text DEFAULT 'org_open' NOT NULL,
	"ai_agents_enabled" boolean DEFAULT true NOT NULL,
	"ai_copilot_enabled" boolean DEFAULT true NOT NULL,
	"allow_bulk_actions" boolean DEFAULT false NOT NULL,
	"restrict_edit_to_assignee" boolean DEFAULT false NOT NULL,
	"restrict_delete_to_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visible_column_field_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_record_field_values" (
	"record_id" uuid NOT NULL,
	"field_id" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"date_value" timestamp,
	"datetime_value" timestamp,
	"float_value" double precision,
	"filled_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "table_record_field_values_record_id_field_id_pk" PRIMARY KEY("record_id","field_id")
);
--> statement-breakpoint
CREATE TABLE "table_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"table_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"public" boolean DEFAULT true NOT NULL,
	"title_field_id" text,
	"subtitle_template" text DEFAULT 'Criado em' NOT NULL,
	"create_button_label" text DEFAULT 'Criar registro' NOT NULL,
	"all_members_can_crud" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"is_self" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"success" boolean NOT NULL,
	"status_code" integer,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" uuid NOT NULL,
	"url" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_field_values" ADD CONSTRAINT "card_field_values_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_transitions" ADD CONSTRAINT "card_transitions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_transitions" ADD CONSTRAINT "card_transitions_from_phase_id_phases_id_fk" FOREIGN KEY ("from_phase_id") REFERENCES "public"."phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_transitions" ADD CONSTRAINT "card_transitions_to_phase_id_phases_id_fk" FOREIGN KEY ("to_phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_charts" ADD CONSTRAINT "dashboard_charts_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_conditionals" ADD CONSTRAINT "field_conditionals_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interface_page_elements" ADD CONSTRAINT "interface_page_elements_page_id_interface_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."interface_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interface_pages" ADD CONSTRAINT "interface_pages_interface_id_interfaces_id_fk" FOREIGN KEY ("interface_id") REFERENCES "public"."interfaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interface_shares" ADD CONSTRAINT "interface_shares_interface_id_interfaces_id_fk" FOREIGN KEY ("interface_id") REFERENCES "public"."interfaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interfaces" ADD CONSTRAINT "interfaces_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pdf_templates" ADD CONSTRAINT "pdf_templates_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phases" ADD CONSTRAINT "phases_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipe_members" ADD CONSTRAINT "pipe_members_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipe_members" ADD CONSTRAINT "pipe_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipes" ADD CONSTRAINT "pipes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_record_field_values" ADD CONSTRAINT "table_record_field_values_record_id_table_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."table_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_records" ADD CONSTRAINT "table_records_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;