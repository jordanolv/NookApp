CREATE TABLE "channel" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"parent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"server_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"owner_id" text NOT NULL,
	"icon_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "server_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "server_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"server_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"max_uses" integer,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "server_invite_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "channel" ADD CONSTRAINT "channel_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server" ADD CONSTRAINT "server_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_invite" ADD CONSTRAINT "server_invite_server_id_server_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "server_invite" ADD CONSTRAINT "server_invite_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_server_idx" ON "channel" USING btree ("server_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_server_user_uniq" ON "member" USING btree ("server_id","user_id");--> statement-breakpoint
CREATE INDEX "member_server_idx" ON "member" USING btree ("server_id");--> statement-breakpoint
CREATE INDEX "member_user_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "server_slug_uniq" ON "server" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "server_owner_idx" ON "server" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "server_invite_code_uniq" ON "server_invite" USING btree ("code");--> statement-breakpoint
CREATE INDEX "server_invite_server_idx" ON "server_invite" USING btree ("server_id");