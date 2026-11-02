import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cards" ADD COLUMN "headshot_crop_zoom" numeric;
  ALTER TABLE "cards" ADD COLUMN "headshot_crop_x" numeric;
  ALTER TABLE "cards" ADD COLUMN "headshot_crop_y" numeric;
  ALTER TABLE "cards" ADD COLUMN "headshot_crop_aspect" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cards" DROP COLUMN "headshot_crop_zoom";
  ALTER TABLE "cards" DROP COLUMN "headshot_crop_x";
  ALTER TABLE "cards" DROP COLUMN "headshot_crop_y";
  ALTER TABLE "cards" DROP COLUMN "headshot_crop_aspect";`)
}
