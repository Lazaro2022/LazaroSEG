CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_number" varchar(20) NOT NULL,
	"prisoner_name" text NOT NULL,
	"type" text NOT NULL,
	"deadline" timestamp NOT NULL,
	"status" text NOT NULL,
	"assigned_to" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"archived_at" timestamp,
	"is_archived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "documents_process_number_unique" UNIQUE("process_number")
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_documents" integer DEFAULT 0 NOT NULL,
	"completed_documents" integer DEFAULT 0 NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"initials" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servers" ADD CONSTRAINT "servers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;