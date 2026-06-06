CREATE TABLE "dm_conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "dm_participant" ADD CONSTRAINT "dm_participant_conversation_id_dm_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_participant" ADD CONSTRAINT "dm_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_conversation_id_dm_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_message" ADD CONSTRAINT "direct_message_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dm_conversation_last_message_idx" ON "dm_conversation" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_participant_conv_user_uniq" ON "dm_participant" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "dm_participant_user_idx" ON "dm_participant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "dm_participant_conv_idx" ON "dm_participant" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "direct_message_conversation_idx" ON "direct_message" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "direct_message_author_idx" ON "direct_message" USING btree ("author_id");