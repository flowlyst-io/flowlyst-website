import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_contact_messages_reason" ADD VALUE 'assessment' BEFORE 'support';
  ALTER TYPE "public"."enum_contact_messages_reason" ADD VALUE 'pricing' BEFORE 'support';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The restored enum has no 'assessment' or 'pricing', so those rows would fail the cast.
  await db.execute(sql`
   UPDATE "contact_messages" SET "reason" = 'other' WHERE "reason" IN ('assessment', 'pricing');
  ALTER TABLE "contact_messages" ALTER COLUMN "reason" SET DATA TYPE text;
  DROP TYPE "public"."enum_contact_messages_reason";
  CREATE TYPE "public"."enum_contact_messages_reason" AS ENUM('press', 'partnership', 'training', 'support', 'other');
  ALTER TABLE "contact_messages" ALTER COLUMN "reason" SET DATA TYPE "public"."enum_contact_messages_reason" USING "reason"::"public"."enum_contact_messages_reason";`)
}
