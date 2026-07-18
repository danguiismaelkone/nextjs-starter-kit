-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "membership_organizationId_idx" ON "membership"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_userId_organizationId_key" ON "membership"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: add organizationId nullable first — it is backfilled below before
-- being made required, so this migration is safe to run against a database
-- that already has users/invitations (not just a fresh one).
ALTER TABLE "invitation" ADD COLUMN "organizationId" TEXT;

-- Data migration: every pre-existing user (and pending invitation) is attached
-- to a single default organization, so the switch to multi-tenant (ITEM-013)
-- never leaves an orphaned account. The earliest user becomes "owner", other
-- admins become "admin", everyone else "member".
DO $$
DECLARE
  default_org_id TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM "user") THEN
    default_org_id := gen_random_uuid()::text;

    INSERT INTO "organization" ("id", "name", "slug", "createdAt", "updatedAt")
    VALUES (default_org_id, 'Organisation par défaut', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    INSERT INTO "membership" ("id", "userId", "organizationId", "role", "status", "createdAt", "updatedAt")
    SELECT
      gen_random_uuid()::text,
      u."id",
      default_org_id,
      CASE
        WHEN u."id" = (SELECT "id" FROM "user" ORDER BY "createdAt" ASC LIMIT 1) THEN 'owner'
        WHEN u."role" = 'admin' THEN 'admin'
        ELSE 'member'
      END,
      'active',
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "user" u;

    UPDATE "invitation" SET "organizationId" = default_org_id WHERE "organizationId" IS NULL;
  END IF;
END $$;

-- AlterTable: every row now has a value, so the column can be enforced NOT NULL.
ALTER TABLE "invitation" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
