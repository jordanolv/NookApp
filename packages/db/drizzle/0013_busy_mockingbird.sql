CREATE TABLE "member_role" (
	"member_id" text NOT NULL,
	"role_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_role_member_id_role_id_pk" PRIMARY KEY("member_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "role" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL,
	"permissions" bigint DEFAULT 0 NOT NULL,
	"is_everyone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ui_layout" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "channel" ADD COLUMN "banner_url" text;--> statement-breakpoint
ALTER TABLE "channel" ADD COLUMN "widget_kind" text;--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role" ADD CONSTRAINT "role_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_role_member_idx" ON "member_role" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "member_role_role_idx" ON "member_role" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_server_idx" ON "role" USING btree ("server_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_everyone_uniq" ON "role" USING btree ("server_id") WHERE "role"."is_everyone" = true;--> statement-breakpoint
ALTER TABLE "member" DROP COLUMN "role";