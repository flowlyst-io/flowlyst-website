import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_demo_requests_crm_status" AS ENUM('not-sent', 'sent', 'failed', 'unverified', 'off');
  CREATE TYPE "public"."enum_speaking_requests_crm_status" AS ENUM('not-sent', 'sent', 'failed', 'unverified', 'off');
  CREATE TYPE "public"."enum_contact_messages_crm_status" AS ENUM('not-sent', 'sent', 'failed', 'unverified', 'off');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'biginRetry' BEFORE 'createCollectionExport';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'biginRetry' BEFORE 'createCollectionExport';
  ALTER TABLE "demo_requests" ADD COLUMN "crm_status" "enum_demo_requests_crm_status" DEFAULT 'not-sent';
  ALTER TABLE "demo_requests" ADD COLUMN "crm_deal_id" varchar;
  ALTER TABLE "demo_requests" ADD COLUMN "crm_last_error" varchar;
  ALTER TABLE "demo_requests" ADD COLUMN "crm_attempts" numeric DEFAULT 0;
  ALTER TABLE "demo_requests" ADD COLUMN "crm_last_attempt_at" timestamp(3) with time zone;
  ALTER TABLE "speaking_requests" ADD COLUMN "crm_status" "enum_speaking_requests_crm_status" DEFAULT 'not-sent';
  ALTER TABLE "speaking_requests" ADD COLUMN "crm_deal_id" varchar;
  ALTER TABLE "speaking_requests" ADD COLUMN "crm_last_error" varchar;
  ALTER TABLE "speaking_requests" ADD COLUMN "crm_attempts" numeric DEFAULT 0;
  ALTER TABLE "speaking_requests" ADD COLUMN "crm_last_attempt_at" timestamp(3) with time zone;
  ALTER TABLE "contact_messages" ADD COLUMN "crm_status" "enum_contact_messages_crm_status" DEFAULT 'not-sent';
  ALTER TABLE "contact_messages" ADD COLUMN "crm_deal_id" varchar;
  ALTER TABLE "contact_messages" ADD COLUMN "crm_last_error" varchar;
  ALTER TABLE "contact_messages" ADD COLUMN "crm_attempts" numeric DEFAULT 0;
  ALTER TABLE "contact_messages" ADD COLUMN "crm_last_attempt_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'createCollectionExport', 'createCollectionImport', 'schedulePublish');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'createCollectionExport', 'createCollectionImport', 'schedulePublish');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  ALTER TABLE "demo_requests" DROP COLUMN "crm_status";
  ALTER TABLE "demo_requests" DROP COLUMN "crm_deal_id";
  ALTER TABLE "demo_requests" DROP COLUMN "crm_last_error";
  ALTER TABLE "demo_requests" DROP COLUMN "crm_attempts";
  ALTER TABLE "demo_requests" DROP COLUMN "crm_last_attempt_at";
  ALTER TABLE "speaking_requests" DROP COLUMN "crm_status";
  ALTER TABLE "speaking_requests" DROP COLUMN "crm_deal_id";
  ALTER TABLE "speaking_requests" DROP COLUMN "crm_last_error";
  ALTER TABLE "speaking_requests" DROP COLUMN "crm_attempts";
  ALTER TABLE "speaking_requests" DROP COLUMN "crm_last_attempt_at";
  ALTER TABLE "contact_messages" DROP COLUMN "crm_status";
  ALTER TABLE "contact_messages" DROP COLUMN "crm_deal_id";
  ALTER TABLE "contact_messages" DROP COLUMN "crm_last_error";
  ALTER TABLE "contact_messages" DROP COLUMN "crm_attempts";
  ALTER TABLE "contact_messages" DROP COLUMN "crm_last_attempt_at";
  DROP TYPE "public"."enum_demo_requests_crm_status";
  DROP TYPE "public"."enum_speaking_requests_crm_status";
  DROP TYPE "public"."enum_contact_messages_crm_status";`)
}
