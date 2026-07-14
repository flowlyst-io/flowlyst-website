import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_speaking_requests_status" AS ENUM('pending', 'scheduled', 'completed', 'canceled');
  CREATE TYPE "public"."enum_speaking_requests_topic_interest" AS ENUM('ai-sbo', 'automation', 'ai-adoption', 'custom');
  CREATE TABLE "speaking_requests" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_speaking_requests_status" DEFAULT 'pending',
  	"internal_notes" varchar,
  	"contact_name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"organization" varchar,
  	"event_name" varchar NOT NULL,
  	"event_date" varchar NOT NULL,
  	"audience_size" varchar,
  	"budget_range" varchar,
  	"topic_interest" "enum_speaking_requests_topic_interest",
  	"message" varchar,
  	"bot_field" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "speaking_requests_id" integer;
  CREATE INDEX "speaking_requests_updated_at_idx" ON "speaking_requests" USING btree ("updated_at");
  CREATE INDEX "speaking_requests_created_at_idx" ON "speaking_requests" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_speaking_requests_fk" FOREIGN KEY ("speaking_requests_id") REFERENCES "public"."speaking_requests"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_speaking_requests_id_idx" ON "payload_locked_documents_rels" USING btree ("speaking_requests_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "speaking_requests" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "speaking_requests" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_speaking_requests_fk";
  
  DROP INDEX "payload_locked_documents_rels_speaking_requests_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "speaking_requests_id";
  DROP TYPE "public"."enum_speaking_requests_status";
  DROP TYPE "public"."enum_speaking_requests_topic_interest";`)
}
