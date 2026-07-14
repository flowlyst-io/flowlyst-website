import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_demo_requests_interests" ADD VALUE 'keynotes';
  ALTER TABLE "contact_messages" ALTER COLUMN "reason" SET DATA TYPE text;
  DROP TYPE "public"."enum_contact_messages_reason";
  CREATE TYPE "public"."enum_contact_messages_reason" AS ENUM('press', 'partnership', 'training', 'support', 'other');
  ALTER TABLE "contact_messages" ALTER COLUMN "reason" SET DATA TYPE "public"."enum_contact_messages_reason" USING "reason"::"public"."enum_contact_messages_reason";
  ALTER TABLE "demo_requests" ALTER COLUMN "consent" SET DEFAULT false;
  ALTER TABLE "demo_requests" ADD COLUMN "bot_field" varchar;
  ALTER TABLE "contact_messages" ADD COLUMN "bot_field" varchar;
  ALTER TABLE "newsletter_subscribers" ADD COLUMN "bot_field" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "demo_requests_interests" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_demo_requests_interests";
  CREATE TYPE "public"."enum_demo_requests_interests" AS ENUM('ai-training', 'budget-software', 'consulting');
  ALTER TABLE "demo_requests_interests" ALTER COLUMN "value" SET DATA TYPE "public"."enum_demo_requests_interests" USING "value"::"public"."enum_demo_requests_interests";
  ALTER TABLE "contact_messages" ALTER COLUMN "reason" SET DATA TYPE text;
  DROP TYPE "public"."enum_contact_messages_reason";
  CREATE TYPE "public"."enum_contact_messages_reason" AS ENUM('general', 'press', 'partnerships', 'training', 'support');
  ALTER TABLE "contact_messages" ALTER COLUMN "reason" SET DATA TYPE "public"."enum_contact_messages_reason" USING "reason"::"public"."enum_contact_messages_reason";
  ALTER TABLE "demo_requests" ALTER COLUMN "consent" DROP DEFAULT;
  ALTER TABLE "demo_requests" DROP COLUMN "bot_field";
  ALTER TABLE "contact_messages" DROP COLUMN "bot_field";
  ALTER TABLE "newsletter_subscribers" DROP COLUMN "bot_field";`)
}
