-- AlterTable
ALTER TABLE "organization" ADD COLUMN     "fontFamily" TEXT,
ADD COLUMN     "favicon" TEXT,
ADD COLUMN     "emailFromName" TEXT,
ADD COLUMN     "hideOriginBranding" BOOLEAN NOT NULL DEFAULT false;
