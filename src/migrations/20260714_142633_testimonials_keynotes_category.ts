import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_testimonials_service_category" ADD VALUE 'keynotes' BEFORE 'general';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "testimonials" ALTER COLUMN "service_category" SET DATA TYPE text;
  DROP TYPE "public"."enum_testimonials_service_category";
  CREATE TYPE "public"."enum_testimonials_service_category" AS ENUM('ai-training', 'budget-software', 'consulting', 'general');
  ALTER TABLE "testimonials" ALTER COLUMN "service_category" SET DATA TYPE "public"."enum_testimonials_service_category" USING "service_category"::"public"."enum_testimonials_service_category";`)
}
