CREATE TABLE "channel_category" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "channel" ADD COLUMN "category_id" text;--> statement-breakpoint
ALTER TABLE "channel_category" ADD CONSTRAINT "channel_category_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_category_server_idx" ON "channel_category" USING btree ("server_id");--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_category_id_channel_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."channel_category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_category_idx" ON "channel" USING btree ("category_id");