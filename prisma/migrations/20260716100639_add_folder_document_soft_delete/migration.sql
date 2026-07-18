-- AlterTable
ALTER TABLE "document" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "folder" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "document_deletedAt_idx" ON "document"("deletedAt");

-- CreateIndex
CREATE INDEX "folder_deletedAt_idx" ON "folder"("deletedAt");
