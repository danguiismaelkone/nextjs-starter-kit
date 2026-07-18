-- CreateTable
CREATE TABLE "document_version" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "document_version_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_version_storageKey_key" ON "document_version"("storageKey");

-- CreateIndex
CREATE INDEX "document_version_documentId_idx" ON "document_version"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_version_documentId_versionNumber_key" ON "document_version"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
