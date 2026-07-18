-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "ssoDefaultRole" TEXT NOT NULL DEFAULT 'member',
ADD COLUMN     "ssoEnforced" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "sso_provider" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "oidcConfig" TEXT,
    "samlConfig" TEXT,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "organizationId" TEXT,
    "domain" TEXT NOT NULL,

    CONSTRAINT "sso_provider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sso_provider_providerId_key" ON "sso_provider"("providerId");

-- CreateIndex
CREATE INDEX "sso_provider_userId_idx" ON "sso_provider"("userId");

-- CreateIndex
CREATE INDEX "sso_provider_organizationId_idx" ON "sso_provider"("organizationId");

-- CreateIndex
CREATE INDEX "sso_provider_domain_idx" ON "sso_provider"("domain");

-- AddForeignKey
ALTER TABLE "sso_provider" ADD CONSTRAINT "sso_provider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sso_provider" ADD CONSTRAINT "sso_provider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
