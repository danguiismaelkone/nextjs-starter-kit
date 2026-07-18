-- CreateTable
CREATE TABLE "document_share" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'view',
    "visibility" TEXT NOT NULL DEFAULT 'restricted',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "document_share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_share_token_key" ON "document_share"("token");

-- CreateIndex
CREATE INDEX "document_share_documentId_idx" ON "document_share"("documentId");

-- AddForeignKey
ALTER TABLE "document_share" ADD CONSTRAINT "document_share_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_share" ADD CONSTRAINT "document_share_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
