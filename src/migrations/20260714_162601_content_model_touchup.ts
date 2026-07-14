import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_blog_posts_service_category" ADD VALUE 'consulting' BEFORE 'general';
  ALTER TYPE "public"."enum__blog_posts_v_version_service_category" ADD VALUE 'consulting' BEFORE 'general';
  ALTER TABLE "case_studies" ADD COLUMN "excerpt" varchar;
  ALTER TABLE "case_studies" ADD COLUMN "implementation_duration" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_excerpt" varchar;
  ALTER TABLE "_case_studies_v" ADD COLUMN "version_implementation_duration" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blog_posts" ALTER COLUMN "service_category" SET DATA TYPE text;
  ALTER TABLE "blog_posts" ALTER COLUMN "service_category" SET DEFAULT 'general'::text;
  DROP TYPE "public"."enum_blog_posts_service_category";
  CREATE TYPE "public"."enum_blog_posts_service_category" AS ENUM('ai-training', 'budget-software', 'general');
  ALTER TABLE "blog_posts" ALTER COLUMN "service_category" SET DEFAULT 'general'::"public"."enum_blog_posts_service_category";
  ALTER TABLE "blog_posts" ALTER COLUMN "service_category" SET DATA TYPE "public"."enum_blog_posts_service_category" USING "service_category"::"public"."enum_blog_posts_service_category";
  ALTER TABLE "_blog_posts_v" ALTER COLUMN "version_service_category" SET DATA TYPE text;
  ALTER TABLE "_blog_posts_v" ALTER COLUMN "version_service_category" SET DEFAULT 'general'::text;
  DROP TYPE "public"."enum__blog_posts_v_version_service_category";
  CREATE TYPE "public"."enum__blog_posts_v_version_service_category" AS ENUM('ai-training', 'budget-software', 'general');
  ALTER TABLE "_blog_posts_v" ALTER COLUMN "version_service_category" SET DEFAULT 'general'::"public"."enum__blog_posts_v_version_service_category";
  ALTER TABLE "_blog_posts_v" ALTER COLUMN "version_service_category" SET DATA TYPE "public"."enum__blog_posts_v_version_service_category" USING "version_service_category"::"public"."enum__blog_posts_v_version_service_category";
  ALTER TABLE "case_studies" DROP COLUMN "excerpt";
  ALTER TABLE "case_studies" DROP COLUMN "implementation_duration";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_excerpt";
  ALTER TABLE "_case_studies_v" DROP COLUMN "version_implementation_duration";`)
}
