-- AlterTable
ALTER TABLE "plan" ADD COLUMN     "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 60;
