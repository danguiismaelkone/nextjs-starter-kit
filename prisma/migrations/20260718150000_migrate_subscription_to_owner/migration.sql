-- ITEM-094 : la facturation devient rattachée à l'utilisateur owner plutôt
-- qu'à l'organisation. Migration de données (pas juste de schéma) : les
-- colonnes sont d'abord ajoutées nullable, backfillées depuis les données
-- existantes via `membership` (role = 'owner', status = 'active'), puis les
-- anciennes colonnes sont supprimées. Sûr sur les données actuelles (vérifié
-- avant migration : aucun utilisateur n'est owner de plusieurs organisations,
-- donc la correspondance organisation -> owner est 1:1).

-- ── user.stripeCustomerId (remplace organization.stripeCustomerId) ─────────

ALTER TABLE "user" ADD COLUMN "stripeCustomerId" TEXT;

UPDATE "user" u
SET "stripeCustomerId" = o."stripeCustomerId"
FROM "organization" o
JOIN "membership" m ON m."organizationId" = o.id AND m."role" = 'owner' AND m."status" = 'active'
WHERE m."userId" = u.id AND o."stripeCustomerId" IS NOT NULL;

DROP INDEX "organization_stripeCustomerId_key";
ALTER TABLE "organization" DROP COLUMN "stripeCustomerId";

CREATE UNIQUE INDEX "user_stripeCustomerId_key" ON "user"("stripeCustomerId");

-- ── subscription.ownerId (remplace subscription.organizationId) ────────────

ALTER TABLE "subscription" ADD COLUMN "ownerId" TEXT;

UPDATE "subscription" s
SET "ownerId" = m."userId"
FROM "membership" m
WHERE m."organizationId" = s."organizationId" AND m."role" = 'owner' AND m."status" = 'active';

ALTER TABLE "subscription" DROP CONSTRAINT "subscription_organizationId_fkey";
DROP INDEX "subscription_organizationId_key";
ALTER TABLE "subscription" DROP COLUMN "organizationId";

ALTER TABLE "subscription" ALTER COLUMN "ownerId" SET NOT NULL;
CREATE UNIQUE INDEX "subscription_ownerId_key" ON "subscription"("ownerId");
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
