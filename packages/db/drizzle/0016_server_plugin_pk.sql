DELETE FROM "server_plugin"
WHERE ctid NOT IN (
  SELECT MIN(ctid) FROM "server_plugin" GROUP BY "server_id", "plugin_id"
);
--> statement-breakpoint
ALTER TABLE "server_plugin" ADD CONSTRAINT "server_plugin_pkey" PRIMARY KEY ("server_id", "plugin_id");
