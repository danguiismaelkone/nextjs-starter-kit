-- CreateTable
CREATE TABLE "ai_usage_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_log_organizationId_idx" ON "ai_usage_log"("organizationId");

-- AddForeignKey
ALTER TABLE "ai_usage_log" ADD CONSTRAINT "ai_usage_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
