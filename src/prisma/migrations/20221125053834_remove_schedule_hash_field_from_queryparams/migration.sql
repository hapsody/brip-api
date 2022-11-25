/*
  Warnings:

  - You are about to drop the column `scheduleHash` on the `QueryParams` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `QueryParams_scheduleHash_key` ON `QueryParams`;

-- AlterTable
ALTER TABLE `QueryParams` DROP COLUMN `scheduleHash`;
