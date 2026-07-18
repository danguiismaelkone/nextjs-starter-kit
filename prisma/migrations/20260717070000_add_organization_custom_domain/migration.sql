-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "customDomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "organization_customDomain_key" ON "organization"("customDomain");
