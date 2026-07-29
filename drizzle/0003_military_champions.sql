CREATE TABLE "connected_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"source_card_id" uuid NOT NULL,
	"target_card_id" uuid,
	"target_record_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"permission" text DEFAULT 'both' NOT NULL,
	"cardinality" text DEFAULT 'multiple' NOT NULL,
	"require_for_next_phase" boolean DEFAULT false NOT NULL,
	"require_for_final_phase" boolean DEFAULT false NOT NULL,
	"block_next_phase_until_target_done" boolean DEFAULT false NOT NULL,
	"block_final_phase_until_target_done" boolean DEFAULT false NOT NULL,
	"autofill_from_target" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connected_records" ADD CONSTRAINT "connected_records_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_records" ADD CONSTRAINT "connected_records_source_card_id_cards_id_fk" FOREIGN KEY ("source_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_records" ADD CONSTRAINT "connected_records_target_card_id_cards_id_fk" FOREIGN KEY ("target_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_records" ADD CONSTRAINT "connected_records_target_record_id_table_records_id_fk" FOREIGN KEY ("target_record_id") REFERENCES "public"."table_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_pipe_id_pipes_id_fk" FOREIGN KEY ("pipe_id") REFERENCES "public"."pipes"("id") ON DELETE cascade ON UPDATE no action;