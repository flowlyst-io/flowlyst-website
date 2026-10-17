import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

type Db = MigrateUpArgs['db']

const MARQUEE_SEED = ['ASBO International', 'NJASBO', 'CPS', 'WSPS', 'BSD']

// Raw SQL rather than payload.create: CI replays every migration on a fresh database,
// and the live collection config may gain required fields later.
export async function seedMarqueeOrganizations(db: Db): Promise<void> {
  for (const [index, name] of MARQUEE_SEED.entries()) {
    await db.execute(sql`
      INSERT INTO "organizations" ("name", "order", "status", "show_in_marquee")
      SELECT ${name}::varchar, ${index + 1}::numeric, 'published', true
      WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE "name" = ${name}::varchar)`)
  }
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_organizations_status" AS ENUM('draft', 'published');
  CREATE TABLE "organizations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"show_in_marquee" boolean DEFAULT true,
  	"order" numeric,
  	"status" "enum_organizations_status" DEFAULT 'draft' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "organizations_id" integer;
  CREATE INDEX "organizations_updated_at_idx" ON "organizations" USING btree ("updated_at");
  CREATE INDEX "organizations_created_at_idx" ON "organizations" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_organizations_fk" FOREIGN KEY ("organizations_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_organizations_id_idx" ON "payload_locked_documents_rels" USING btree ("organizations_id");`)
  await seedMarqueeOrganizations(db)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "organizations" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "organizations" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_organizations_fk";
  
  DROP INDEX "payload_locked_documents_rels_organizations_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "organizations_id";
  DROP TYPE "public"."enum_organizations_status";`)
}
