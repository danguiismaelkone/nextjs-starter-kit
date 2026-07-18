-- AlterTable
ALTER TABLE "document" ADD COLUMN     "ocrText" TEXT,
ADD COLUMN     "ocrProcessedAt" TIMESTAMP(3);
