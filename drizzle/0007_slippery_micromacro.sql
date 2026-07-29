ALTER TABLE "pipes" ADD COLUMN "start_form_internal_title" text;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "start_form_public_title" text;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "start_form_public_description" text;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "start_form_public_logo_file_id" text;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "start_form_public_submit_button_text" text DEFAULT 'Enviar' NOT NULL;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "start_form_internal_create_button_text" text DEFAULT 'Criar novo card' NOT NULL;--> statement-breakpoint
ALTER TABLE "pipes" ADD COLUMN "start_form_public_brand_color" text;