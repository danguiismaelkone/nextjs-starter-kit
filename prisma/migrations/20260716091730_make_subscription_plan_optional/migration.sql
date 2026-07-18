-- DropForeignKey
ALTER TABLE "subscription" DROP CONSTRAINT "subscription_planId_fkey";

-- AlterTable
ALTER TABLE "subscription" ALTER COLUMN "planId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

