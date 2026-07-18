CREATE TABLE "server_ban" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text,
	"banned_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "server_ban" ADD CONSTRAINT "server_ban_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_ban" ADD CONSTRAINT "server_ban_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_ban" ADD CONSTRAINT "server_ban_banned_by_user_id_fk" FOREIGN KEY ("banned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "server_ban_server_user_uniq" ON "server_ban" USING btree ("server_id","user_id");--> statement-breakpoint
CREATE INDEX "server_ban_server_idx" ON "server_ban" USING btree ("server_id");