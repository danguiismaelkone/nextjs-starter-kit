-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "role_organizationId_idx" ON "role"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "role_organizationId_key_key" ON "role"("organizationId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "permission_resource_action_key" ON "permission"("resource", "action");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_roleId_permissionId_key" ON "role_permission"("roleId", "permissionId");

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: seed the 3 rôles système (owner/admin/member) et la
-- permission "admin:access" (accordée à owner/admin) pour chaque organisation
-- déjà existante (ITEM-018). Les organisations créées après cette migration
-- sont seedées à la création par `seedSystemRoles()` (lib/permissions.ts,
-- appelé depuis `createOrganizationWithOwner`, lib/organization.ts).
DO $$
DECLARE
  org RECORD;
  owner_role_id TEXT;
  admin_role_id TEXT;
  member_role_id TEXT;
  admin_access_permission_id TEXT;
BEGIN
  admin_access_permission_id := gen_random_uuid()::text;
  INSERT INTO "permission" ("id", "resource", "action")
  VALUES (admin_access_permission_id, 'admin', 'access');

  FOR org IN SELECT "id" FROM "organization" LOOP
    owner_role_id := gen_random_uuid()::text;
    admin_role_id := gen_random_uuid()::text;
    member_role_id := gen_random_uuid()::text;

    INSERT INTO "role" ("id", "organizationId", "key", "name", "isSystem", "createdAt", "updatedAt")
    VALUES
      (owner_role_id, org."id", 'owner', 'Owner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (admin_role_id, org."id", 'admin', 'Admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      (member_role_id, org."id", 'member', 'Member', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

    INSERT INTO "role_permission" ("id", "roleId", "permissionId")
    VALUES
      (gen_random_uuid()::text, owner_role_id, admin_access_permission_id),
      (gen_random_uuid()::text, admin_role_id, admin_access_permission_id);
  END LOOP;
END $$;
