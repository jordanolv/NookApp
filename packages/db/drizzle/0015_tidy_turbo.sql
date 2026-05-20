CREATE TABLE "plugin_registration" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon_url" text,
	"api_key_hash" text NOT NULL,
	"api_key_prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"capabilities" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_connected_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "plugin_registration" ADD CONSTRAINT "plugin_registration_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_registration_slug_uniq" ON "plugin_registration" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "plugin_registration_key_hash_uniq" ON "plugin_registration" USING btree ("api_key_hash");--> statement-breakpoint
CREATE INDEX "plugin_registration_owner_idx" ON "plugin_registration" USING btree ("owner_user_id");
