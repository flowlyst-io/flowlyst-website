import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"destination" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"code" varchar,
  	"slug" varchar,
  	"scan_count" numeric DEFAULT 0,
  	"last_scanned_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "cards" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"title" varchar,
  	"headshot_id" integer,
  	"phone" varchar,
  	"email" varchar,
  	"linked_in" varchar,
  	"website" varchar DEFAULT 'https://flowlyst.io',
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "links_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cards_id" integer;
  ALTER TABLE "cards" ADD CONSTRAINT "cards_headshot_id_media_id_fk" FOREIGN KEY ("headshot_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "links_code_idx" ON "links" USING btree ("code");
  CREATE UNIQUE INDEX "links_slug_idx" ON "links" USING btree ("slug");
  CREATE INDEX "links_updated_at_idx" ON "links" USING btree ("updated_at");
  CREATE INDEX "links_created_at_idx" ON "links" USING btree ("created_at");
  CREATE INDEX "cards_headshot_idx" ON "cards" USING btree ("headshot_id");
  CREATE UNIQUE INDEX "cards_slug_idx" ON "cards" USING btree ("slug");
  CREATE INDEX "cards_updated_at_idx" ON "cards" USING btree ("updated_at");
  CREATE INDEX "cards_created_at_idx" ON "cards" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_links_fk" FOREIGN KEY ("links_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cards_fk" FOREIGN KEY ("cards_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_links_id_idx" ON "payload_locked_documents_rels" USING btree ("links_id");
  CREATE INDEX "payload_locked_documents_rels_cards_id_idx" ON "payload_locked_documents_rels" USING btree ("cards_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cards" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "links" CASCADE;
  DROP TABLE "cards" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_links_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cards_fk";
  
  DROP INDEX "payload_locked_documents_rels_links_id_idx";
  DROP INDEX "payload_locked_documents_rels_cards_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "links_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cards_id";`)
}
