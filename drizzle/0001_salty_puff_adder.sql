CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"direction" text NOT NULL,
	"from_name" text NOT NULL,
	"from_address" text NOT NULL,
	"to_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bcc_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"sent_at" timestamp,
	"read" boolean DEFAULT false NOT NULL,
	"assignee_id" uuid,
	"due_date" timestamp,
	"label_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sender_name" text NOT NULL,
	"sender_email" text,
	"use_custom_sender_address" boolean DEFAULT false NOT NULL,
	"default_to_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_cc_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_bcc_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_subject" text NOT NULL,
	"body_html" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" uuid NOT NULL,
	"pipe_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "inbound_email_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "inbound_email_alias" text;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_thread_id_email_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;