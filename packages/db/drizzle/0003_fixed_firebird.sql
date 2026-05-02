CREATE TABLE "server_plugin" (
	"server_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"config" json DEFAULT '{}'::json,
	"enabled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "server_plugin" ADD CONSTRAINT "server_plugin_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "server_plugin_server_idx" ON "server_plugin" USING btree ("server_id");