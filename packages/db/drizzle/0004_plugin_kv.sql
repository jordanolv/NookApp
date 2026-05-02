CREATE TABLE "plugin_kv" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"plugin_id" text NOT NULL,
	"key" text NOT NULL,
	"value" json,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_kv_uniq" UNIQUE("server_id","plugin_id","key")
);
--> statement-breakpoint
ALTER TABLE "plugin_kv" ADD CONSTRAINT "plugin_kv_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plugin_kv_server_idx" ON "plugin_kv" USING btree ("server_id");