-- CreateTable
CREATE TABLE "feature_flag" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "organization_feature_flag" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_feature_flag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_feature_flag_organizationId_idx" ON "organization_feature_flag"("organizationId");

-- CreateIndex
CREATE INDEX "organization_feature_flag_key_idx" ON "organization_feature_flag"("key");

-- CreateIndex
CREATE UNIQUE INDEX "organization_feature_flag_organizationId_key_key" ON "organization_feature_flag"("organizationId", "key");

-- AddForeignKey
ALTER TABLE "organization_feature_flag" ADD CONSTRAINT "organization_feature_flag_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_feature_flag" ADD CONSTRAINT "organization_feature_flag_key_fkey" FOREIGN KEY ("key") REFERENCES "feature_flag"("key") ON DELETE CASCADE ON UPDATE CASCADE;
