import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

type Db = MigrateUpArgs['db']

// Payload 3.90's schedulePublish job rejects the pre-3.90 shape where input.user
// was a bare id, so pending jobs queued under 3.86 must become relationships.
export async function wrapPendingJobUsers(db: Db): Promise<void> {
  await db.execute(sql`
   UPDATE "payload_jobs"
      SET "input" = jsonb_set("input", '{user}', jsonb_build_object('relationTo', 'users', 'value', "input"->'user'))
    WHERE "task_slug" = 'schedulePublish' AND "completed_at" IS NULL
      AND jsonb_typeof("input"->'user') = 'number';`)
}

export async function unwrapPendingJobUsers(db: Db): Promise<void> {
  await db.execute(sql`
   UPDATE "payload_jobs"
      SET "input" = jsonb_set("input", '{user}', "input"->'user'->'value')
    WHERE "task_slug" = 'schedulePublish' AND "completed_at" IS NULL
      AND jsonb_typeof("input"->'user') = 'object'
      AND "input"->'user'->>'relationTo' = 'users';`)
}

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "_objectkey" varchar;
  ALTER TABLE "users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;`)
  await wrapPendingJobUsers(db)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await unwrapPendingJobUsers(db)
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN "_objectkey";
  ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";`)
}
